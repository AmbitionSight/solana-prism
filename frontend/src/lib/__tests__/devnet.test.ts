import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  ATTACK_AMOUNT,
  FIXED_VAULT_INDEX,
  INITIAL_BALANCE,
  POOL_SIZE,
  VAULT_SPACE,
  VAULT_DISCRIMINATOR,
  WITHDRAW_DISCRIMINATOR,
  decodeVault,
  nextFreshVault,
  vaultAddress,
  vaultSeed,
  withdrawAccounts,
  withdrawInstructionData,
} from '../devnet';

/**
 * No `Buffer` here on purpose. `tsconfig.app.json` pins `types: []` so the app
 * cannot reach Node globals — and that pin covers these tests too. Everything
 * below is plain typed arrays.
 */
function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

const ADMIN = new PublicKey('ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU');
const VAULT = new PublicKey('7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2');

/** A Vault account exactly as the program lays it out: 8 + 32 + 8 bytes. */
function makeVaultData(authority: PublicKey, balance: number): Uint8Array {
  const data = new Uint8Array(VAULT_SPACE);
  data.set(VAULT_DISCRIMINATOR, 0);
  data.set(authority.toBytes(), 8);
  new DataView(data.buffer).setBigUint64(40, BigInt(balance), true);
  return data;
}

describe('devnet — 判别符', () => {
  it('withdraw 是 sha256("global:withdraw") 的前 8 字节', () => {
    expect(hex(WITHDRAW_DISCRIMINATOR)).toBe('b712469c946da122');
  });

  it('Vault 账户是 sha256("account:Vault") 的前 8 字节', () => {
    expect(hex(VAULT_DISCRIMINATOR)).toBe('d308e82b02987577');
  });
});

describe('devnet — withdraw 指令数据', () => {
  it('恰好 16 字节：8 判别符 + 8 字节 u64', () => {
    expect(withdrawInstructionData(ATTACK_AMOUNT).length).toBe(16);
  });

  it('500 编码为 判别符 + f401000000000000', () => {
    expect(hex(withdrawInstructionData(500))).toBe('b712469c946da122f401000000000000');
  });

  it('金额是小端序，不是大端序', () => {
    expect(hex(withdrawInstructionData(1))).toBe('b712469c946da1220100000000000000');
    expect(hex(withdrawInstructionData(256))).toBe('b712469c946da1220001000000000000');
  });
});

describe('devnet — withdraw 的账户表', () => {
  it('两个账户，顺序是 vault 然后 authority', () => {
    const metas = withdrawAccounts(VAULT, ADMIN);
    expect(metas.length).toBe(2);
    expect(metas[0].pubkey.equals(VAULT)).toBe(true);
    expect(metas[1].pubkey.equals(ADMIN)).toBe(true);
  });

  it('vault 可写，authority 只读', () => {
    const [vault, authority] = withdrawAccounts(VAULT, ADMIN);
    expect(vault.isWritable).toBe(true);
    expect(authority.isWritable).toBe(false);
  });

  it('一个 signer 都没有 —— 这正是访客只需签自己名字的原因', () => {
    // If this ever fails, the real run would need a co-signature from the
    // admin's keypair, which the front end deliberately does not have.
    const metas = withdrawAccounts(VAULT, ADMIN);
    expect(metas.filter((meta) => meta.isSigner)).toEqual([]);
  });
});

describe('devnet — vault 地址推导', () => {
  it('种子是 32 字节', () => {
    expect(vaultSeed(0).length).toBe(32);
  });

  it('同一个下标永远得到同一把 vault', () => {
    expect(hex(vaultSeed(7))).toBe(hex(vaultSeed(7)));
    expect(vaultAddress(7).toBase58()).toBe(vaultAddress(7).toBase58());
  });

  it('不同下标得到不同地址', () => {
    const addresses = new Set<string>();
    for (let i = 0; i < POOL_SIZE; i += 1) addresses.add(vaultAddress(i).toBase58());
    expect(addresses.size).toBe(POOL_SIZE);
  });
});

describe('devnet — 修复版的那个 vault', () => {
  it('固定在链上创建它的 30 号，不随 POOL_SIZE 移动', () => {
    // A literal on purpose. When this was `= POOL_SIZE`, growing the pool silently
    // repointed the fixed run at another index the fixed program never created an
    // account at, and the repaired-build run broke.
    expect(FIXED_VAULT_INDEX).toBe(30);
  });

  it('身份由 owner 决定：被归属过滤挡掉的固定 vault 永远不会成为候选', async () => {
    // POOL_SIZE has grown past 30, so the fixed vault now falls inside the scan's
    // index range and the range alone no longer excludes it. Model the owner
    // filter the real reader applies (pinned in solanaChain.test.ts): a foreign
    // owner reads back as null, and the scan must skip the index rather than take
    // it — even though position would have offered it.
    const read = async (address: PublicKey): Promise<Uint8Array | null> => {
      if (vaultAddress(FIXED_VAULT_INDEX).equals(address)) return null; // foreign
      return makeVaultData(ADMIN, INITIAL_BALANCE);
    };
    expect(await nextFreshVault(read, ADMIN)).not.toBe(FIXED_VAULT_INDEX);
  });
});

describe('devnet — Vault 账户解码', () => {
  it('解出 authority 与 balance', () => {
    const decoded = decodeVault(makeVaultData(ADMIN, INITIAL_BALANCE));
    expect(decoded.authority.equals(ADMIN)).toBe(true);
    expect(decoded.balance).toBe(1000);
  });

  it('balance 是小端序', () => {
    expect(decodeVault(makeVaultData(ADMIN, 256)).balance).toBe(256);
    expect(decodeVault(makeVaultData(ADMIN, 1)).balance).toBe(1);
  });

  it('长度不对时报错，而不是读出垃圾', () => {
    expect(() => decodeVault(new Uint8Array(VAULT_SPACE - 1))).toThrow();
    expect(() => decodeVault(new Uint8Array(VAULT_SPACE + 1))).toThrow();
  });

  it('判别符不对时报错 —— 这不是一个 Vault 账户', () => {
    const data = makeVaultData(ADMIN, INITIAL_BALANCE);
    data[0] ^= 0xff;
    expect(() => decodeVault(data)).toThrow();
  });
});

describe('devnet — 找下一个可用的 vault', () => {
  const pool = (balances: (number | null)[], authority: PublicKey = ADMIN) => async (
    address: PublicKey,
  ): Promise<Uint8Array | null> => {
    for (let i = 0; i < poolSizeOf(balances); i += 1) {
      if (vaultAddress(i).equals(address)) {
        const balance = balances[i];
        return balance === null ? null : makeVaultData(authority, balance);
      }
    }
    return null;
  };

  function poolSizeOf(balances: (number | null)[]): number {
    return balances.length;
  }

  it('第一个 fresh vault 胜出', async () => {
    expect(await nextFreshVault(pool([1000, 1000]), ADMIN)).toBe(0);
  });

  it('跳过已经用过的 vault', async () => {
    expect(await nextFreshVault(pool([500, 1000]), ADMIN)).toBe(1);
  });

  it('跳过根本不存在的 vault', async () => {
    expect(await nextFreshVault(pool([null, 1000]), ADMIN)).toBe(1);
  });

  it('跳过 authority 不是 ADMIN 的 vault', async () => {
    const stranger = new PublicKey('9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq');
    expect(await nextFreshVault(pool([1000], stranger), ADMIN)).toBeNull();
  });

  it('池子用尽时返回 null，而不是假装成功', async () => {
    expect(await nextFreshVault(pool([500, 500]), ADMIN)).toBeNull();
    expect(await nextFreshVault(pool([]), ADMIN)).toBeNull();
  });

  it('只查 POOL_SIZE 个，不越界', async () => {
    // The address → index map is built once so each read is O(1). Deriving a
    // keypair per index on every call made the test's cost grow with the pool,
    // which is how it outlived its timeout when POOL_SIZE went from 30 to 200.
    const indexOf = new Map(
      [...Array(POOL_SIZE + 5).keys()].map((i) => [vaultAddress(i).toBase58(), i]),
    );
    const asked: number[] = [];
    const read = async (address: PublicKey) => {
      const index = indexOf.get(address.toBase58());
      if (index !== undefined) asked.push(index);
      return makeVaultData(ADMIN, 500);
    };

    expect(await nextFreshVault(read, ADMIN)).toBeNull();
    // It asked for every pool vault, once, in order, and stopped at the last one —
    // never reaching for an index past the pool the script made.
    expect(asked).toEqual([...Array(POOL_SIZE).keys()]);
  });
});
