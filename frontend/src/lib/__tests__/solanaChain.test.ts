import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { attackPorts, createVaultReader, demoAttackPorts } from '../solanaChain';
import {
  INITIAL_BALANCE,
  VAULT_DISCRIMINATOR,
  VAULT_SPACE,
  nextFreshVault,
  vaultAddress,
  withdrawInstructionData,
} from '../devnet';
import { demoSigner } from '../../config/demoSigner';

/**
 * The adapter is the one place web3.js and Phantom actually meet, so it is
 * tested the hard way: the fake provider really signs with a real keypair, the
 * transaction really serializes, and the test deserializes the bytes that were
 * handed to the RPC and checks the instruction against the program's source.
 *
 * That closes a gap the pure `devnet.ts` tests cannot: they pin our encoding,
 * this pins what web3.js does with it.
 */

function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

const PROGRAM_ID = new PublicKey('7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2');
const VAULT = new PublicKey('9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq');
const ADMIN = new PublicKey('ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU');

/** A connection stand-in that records what it was asked to send. */
function fakeConnection(statuses: unknown[]) {
  const sent: { raw: Uint8Array; options: Record<string, unknown> | undefined }[] = [];
  let statusCall = 0;

  const connection = {
    getLatestBlockhash: async () => ({ blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N', lastValidBlockHeight: 99 }),
    sendRawTransaction: async (raw: Uint8Array, options?: Record<string, unknown>) => {
      sent.push({ raw, options });
      return 'SIG_A';
    },
    getSignatureStatuses: async () => ({
      context: { slot: 1 },
      value: [statuses[Math.min(statusCall++, statuses.length - 1)]],
    }),
    getMultipleAccountsInfo: async (addresses: PublicKey[]) => addresses.map(() => null),
  };

  return { connection: connection as never, sent };
}

/** A provider that signs for real, so `serialize()` has a signature to write. */
function signingProvider() {
  const payer = Keypair.generate();
  return {
    payer,
    provider: {
      publicKey: { toBase58: () => payer.publicKey.toBase58() },
      connect: async () => ({ publicKey: { toBase58: () => payer.publicKey.toBase58() } }),
      signTransaction: async <T,>(transaction: T): Promise<T> => {
        (transaction as Transaction).sign(payer);
        return transaction;
      },
    },
  };
}

describe('solanaChain — 构造并发出真实交易', () => {
  it('指令内容与 Withdraw 的源码一致', async () => {
    const { connection, sent } = fakeConnection([{ err: null }]);
    const { provider, payer } = signingProvider();

    const ports = attackPorts(
      connection,
      provider as never,
      PROGRAM_ID,
    );
    await ports.sendWithdraw({
      vault: VAULT.toBase58(),
      authority: ADMIN.toBase58(),
      amount: 500,
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
    });

    const rebuilt = Transaction.from(sent[0].raw);
    const instruction = rebuilt.instructions[0];

    expect(instruction.programId.equals(PROGRAM_ID)).toBe(true);
    expect(hex(instruction.data)).toBe('b712469c946da122f401000000000000');
    expect(rebuilt.feePayer?.equals(payer.publicKey)).toBe(true);
    expect(rebuilt.recentBlockhash).toBe('EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N');
  });

  it('账户顺序是 vault 然后 authority，两个都不是 signer', async () => {
    const { connection, sent } = fakeConnection([{ err: null }]);
    const { provider } = signingProvider();

    const ports = attackPorts(
      connection,
      provider as never,
      PROGRAM_ID,
    );
    await ports.sendWithdraw({
      vault: VAULT.toBase58(),
      authority: ADMIN.toBase58(),
      amount: 500,
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
    });

    const keys = Transaction.from(sent[0].raw).instructions[0].keys;
    expect(keys.length).toBe(2);
    expect(keys[0].pubkey.equals(VAULT)).toBe(true);
    expect(keys[0].isWritable).toBe(true);
    expect(keys[0].isSigner).toBe(false);
    expect(keys[1].pubkey.equals(ADMIN)).toBe(true);
    expect(keys[1].isWritable).toBe(false);
    expect(keys[1].isSigner).toBe(false);
  });

  it('必须 skipPreflight —— 否则修复版的拒绝会在预检被拦掉，签名也就没了', async () => {
    const { connection, sent } = fakeConnection([{ err: null }]);
    const { provider } = signingProvider();

    const ports = attackPorts(
      connection,
      provider as never,
      PROGRAM_ID,
    );
    await ports.sendWithdraw({
      vault: VAULT.toBase58(),
      authority: ADMIN.toBase58(),
      amount: 500,
      blockhash: 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N',
    });

    expect(sent[0].options).toMatchObject({ skipPreflight: true });
  });
});

describe('solanaChain — 状态映射', () => {
  const portsWith = (statuses: unknown[]) => {
    const { connection } = fakeConnection(statuses);
    const { provider } = signingProvider();
    return attackPorts(
      connection,
      provider as never,
      PROGRAM_ID,
    );
  };

  it('pending 映射为 null', async () => {
    expect(await portsWith([null]).signatureStatus('SIG_A')).toBeNull();
  });

  it('成功映射为 { err: null }', async () => {
    expect(await portsWith([{ err: null, confirmationStatus: 'confirmed' }]).signatureStatus('SIG_A')).toEqual({
      err: null,
    });
  });

  it('失败带回错误本体，不被吞掉', async () => {
    const status = await portsWith([
      { err: { InstructionError: [0, 'AccountNotSigner'] }, confirmationStatus: 'confirmed' },
    ]).signatureStatus('SIG_A');

    expect(status?.err).toEqual({ InstructionError: [0, 'AccountNotSigner'] });
  });

  it('status 数组为空时不崩，按 pending 处理', async () => {
    const { connection } = fakeConnection([]);
    const { provider } = signingProvider();
    const ports = attackPorts(
      connection,
      provider as never,
      PROGRAM_ID,
    );
    // An empty value array means the node has no record of it yet.
    await expect(ports.signatureStatus('SIG_A')).resolves.toBeNull();
  });
});

describe('solanaChain — demo 键端口: 无钱包也发得出同样的交易', () => {
  const BLOCKHASH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N';

  /** Build the port, send one withdraw, and hand back the bytes the RPC saw. */
  async function build() {
    const { connection, sent } = fakeConnection([{ err: null }]);
    const ports = demoAttackPorts(connection, PROGRAM_ID);
    await ports.sendWithdraw({
      vault: VAULT.toBase58(),
      authority: ADMIN.toBase58(),
      amount: 500,
      blockhash: BLOCKHASH,
    });
    return Transaction.from(sent[0].raw);
  }

  it('demo 签名者既是 fee payer, 也是唯一的签名者', async () => {
    const rebuilt = await build();
    const demo = demoSigner();

    expect(rebuilt.feePayer?.equals(demo.publicKey)).toBe(true);
    // `withdraw` declares no signer, so the fee payer is the only signature —
    // and it is the demo key, never a wallet.
    expect(rebuilt.signatures).toHaveLength(1);
    expect(rebuilt.signatures[0].publicKey.equals(demo.publicKey)).toBe(true);
  });

  it('账户与 withdrawAccounts 的顺序和 signer 标记一致', async () => {
    const keys = (await build()).instructions[0].keys;

    expect(keys.length).toBe(2);
    expect(keys[0].pubkey.equals(VAULT)).toBe(true);
    expect(keys[0].isWritable).toBe(true);
    expect(keys[0].isSigner).toBe(false);
    // The authority is still the ADMIN public key: the point is that no admin
    // signature is anywhere near this transaction.
    expect(keys[1].pubkey.equals(ADMIN)).toBe(true);
    expect(keys[1].isWritable).toBe(false);
    expect(keys[1].isSigner).toBe(false);
  });

  it('指令数据就是 withdrawInstructionData(500)', async () => {
    const instruction = (await build()).instructions[0];

    expect(instruction.programId.equals(PROGRAM_ID)).toBe(true);
    expect(hex(instruction.data)).toBe(hex(withdrawInstructionData(500)));
    // ...and pinned to the bytes Anchor would hash-select, not just to itself.
    expect(hex(instruction.data)).toBe('b712469c946da122f401000000000000');
  });

  it('同样带 skipPreflight —— 修复版的拒绝必须有签名可指', async () => {
    const { connection, sent } = fakeConnection([{ err: null }]);
    const ports = demoAttackPorts(connection, PROGRAM_ID);
    await ports.sendWithdraw({
      vault: VAULT.toBase58(),
      authority: ADMIN.toBase58(),
      amount: 500,
      blockhash: BLOCKHASH,
    });

    expect(sent[0].options).toMatchObject({ skipPreflight: true });
  });
});

describe('solanaChain — 读 vault 账户', () => {
  it('账户不存在时返回 null，位置与地址一一对应', async () => {
    const { connection } = fakeConnection([{ err: null }]);
    const read = createVaultReader(connection, PROGRAM_ID);
    expect(await read([VAULT])).toEqual([null]);
  });

  it('存在时把 data 解成字节', async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    const connection = {
      getMultipleAccountsInfo: async (addresses: PublicKey[]) =>
        addresses.map(() => ({
          owner: PROGRAM_ID,
          data: [btoa(String.fromCharCode(...bytes)), 'base64'],
          executable: false,
        })),
    };

    const read = createVaultReader(connection as never, PROGRAM_ID);
    const data = await read([VAULT]);
    expect(data[0] && hex(data[0])).toBe('010203');
  });
});

describe('solanaChain — 扫描只接受被攻击程序拥有的账户', () => {
  const FIXED_PROGRAM_ID = new PublicKey('9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq');

  /** A Vault account exactly as the program lays it out: 8 + 32 + 8 bytes. */
  function vaultData(authority: PublicKey, balance: number): Uint8Array {
    const data = new Uint8Array(VAULT_SPACE);
    data.set(VAULT_DISCRIMINATOR, 0);
    data.set(authority.toBytes(), 8);
    new DataView(data.buffer).setBigUint64(40, BigInt(balance), true);
    return data;
  }

  it('跳过别的程序拥有的账户，哪怕它的数据完全像一个 Vault', async () => {
    // The bug, frozen. Index 30 is the fixed program's vault; its data decodes
    // byte-for-byte as a fresh pool vault — same discriminator, same authority,
    // same balance — so only `owner` tells it apart. A reader that trusts data
    // alone hands it to the vulnerable program and the attack is refused for the
    // account-owner reason instead of the missing signer.
    const foreignIndex = 0;
    const freshIndex = 1;

    const connection = {
      getMultipleAccountsInfo: async (addresses: PublicKey[]) =>
        addresses.map((address) => {
          if (vaultAddress(foreignIndex).equals(address)) {
            return { owner: FIXED_PROGRAM_ID, data: vaultData(ADMIN, INITIAL_BALANCE) };
          }
          if (vaultAddress(freshIndex).equals(address)) {
            return { owner: PROGRAM_ID, data: vaultData(ADMIN, INITIAL_BALANCE) };
          }
          return null;
        }),
    };

    const read = createVaultReader(connection as never, PROGRAM_ID);
    const index = await nextFreshVault(read, ADMIN);

    expect(index).toBe(freshIndex);
    expect(index).not.toBe(foreignIndex);
  });
});
