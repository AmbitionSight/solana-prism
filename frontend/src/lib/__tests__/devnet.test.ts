import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  ATTACK_AMOUNT,
  FIXED_VAULT_INDEX,
  INITIAL_BALANCE,
  POOL_SCAN_BATCH,
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
    const read = async (addresses: PublicKey[]): Promise<(Uint8Array | null)[]> =>
      addresses.map((address) =>
        vaultAddress(FIXED_VAULT_INDEX).equals(address)
          ? null // foreign owner
          : makeVaultData(ADMIN, INITIAL_BALANCE),
      );
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
  /**
   * A batched reader over a fixed pool: index `i` holds `balances[i]`, a `null`
   * entry is genuinely absent, and any address past the array was never made by
   * the pool script. The address → index map is built once, so a batch costs
   * O(batch) rather than re-deriving a keypair per address per call.
   */
  const pool = (balances: (number | null)[], authority: PublicKey = ADMIN) => {
    const indexOf = new Map(
      [...Array(balances.length).keys()].map((i) => [vaultAddress(i).toBase58(), i]),
    );
    return async (addresses: PublicKey[]): Promise<(Uint8Array | null)[]> =>
      addresses.map((address) => {
        const index = indexOf.get(address.toBase58());
        if (index === undefined) return null;
        const balance = balances[index];
        return balance === null ? null : makeVaultData(authority, balance);
      });
  };

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

  it('一批读得比第一个命中更远，但最小的下标仍然获胜', async () => {
    // Two fresh vaults in one batch, behind a drained one. The scan must name
    // the lowest fresh index, not whichever the batch happened to yield first.
    expect(await nextFreshVault(pool([500, 1000, 1000]), ADMIN, 3, 100)).toBe(1);
  });

  it('跨批次时依然是最小的下标获胜', async () => {
    // Fresh at 3 and 4, batch size 2: index 3 is the first hit of the second
    // batch and still beats index 4 in the same batch.
    expect(await nextFreshVault(pool([500, 500, 500, 1000, 1000]), ADMIN, 5, 2)).toBe(3);
  });

  it('一次问一整批地址，而不是一个一次', async () => {
    const batches: string[][] = [];
    const read = async (addresses: PublicKey[]) => {
      batches.push(addresses.map((address) => address.toBase58()));
      return addresses.map(() => makeVaultData(ADMIN, 500)); // every vault used
    };

    expect(await nextFreshVault(read, ADMIN, 5, 2)).toBeNull();

    // Three calls for five vaults: [0,1], [2,3], [4] — in index order, and the
    // last one shortened at the pool's edge rather than reading past it.
    expect(batches).toEqual([
      [vaultAddress(0).toBase58(), vaultAddress(1).toBase58()],
      [vaultAddress(2).toBase58(), vaultAddress(3).toBase58()],
      [vaultAddress(4).toBase58()],
    ]);
  });

  it('只查 POOL_SIZE 个，不越界', async () => {
    // The address → index map is built once so each read is O(1). Deriving a
    // keypair per index on every call made the test's cost grow with the pool,
    // which is how it outlived its timeout when POOL_SIZE went from 30 to 200.
    const indexOf = new Map(
      [...Array(POOL_SIZE + 5).keys()].map((i) => [vaultAddress(i).toBase58(), i]),
    );
    const asked: number[] = [];
    const read = async (addresses: PublicKey[]) => {
      for (const address of addresses) {
        const index = indexOf.get(address.toBase58());
        if (index !== undefined) asked.push(index);
      }
      return addresses.map(() => makeVaultData(ADMIN, 500));
    };

    expect(await nextFreshVault(read, ADMIN)).toBeNull();
    // It asked for every pool vault, once, in order, and stopped at the last one —
    // never reaching for an index past the pool the script made.
    expect(asked).toEqual([...Array(POOL_SIZE).keys()]);
  });

  it('某一批读失败时抛出，不把失败读成池子空了', async () => {
    let calls = 0;
    const read = async (addresses: PublicKey[]) => {
      calls += 1;
      if (calls === 2) throw new Error('rpc rate limited');
      return addresses.map(() => makeVaultData(ADMIN, 500)); // the batch before it is drained
    };

    await expect(nextFreshVault(read, ADMIN, 5, 2)).rejects.toThrow('rpc rate limited');
  });

  it('一批的结果数量对不上时抛出，而不是把缺的当成不存在', async () => {
    // A reader that answers a whole batch with one result: the addresses it did
    // not answer must not be read as absent vaults, so this is an error, not a
    // shorter pool.
    const read = async () => [makeVaultData(ADMIN, 500)];
    await expect(nextFreshVault(read, ADMIN, 5, 2)).rejects.toThrow(/results/);
  });

  it('默认批量不超过 RPC 的 100 账户上限', () => {
    expect(POOL_SCAN_BATCH).toBeLessThanOrEqual(100);
  });
});
