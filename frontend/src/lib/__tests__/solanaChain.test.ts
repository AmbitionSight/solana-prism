import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { attackPorts, createVaultReader } from '../solanaChain';

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
    getAccountInfo: async () => null,
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

describe('solanaChain — 读 vault 账户', () => {
  it('账户不存在时返回 null', async () => {
    const { connection } = fakeConnection([{ err: null }]);
    const read = createVaultReader(connection);
    expect(await read(VAULT)).toBeNull();
  });

  it('存在时把 data 解成字节', async () => {
    const bytes = Uint8Array.from([1, 2, 3]);
    const connection = {
      getAccountInfo: async () => ({
        data: [btoa(String.fromCharCode(...bytes)), 'base64'],
        executable: false,
      }),
    };

    const read = createVaultReader(connection as never);
    const data = await read(VAULT);
    expect(data && hex(data)).toBe('010203');
  });
});
