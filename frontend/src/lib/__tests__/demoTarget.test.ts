import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  resolveDemoTarget,
  FALLBACK_VAULT_INDEX,
  type DemoTarget,
  type DemoTargetResolution,
} from '../demoTarget';
import { POOL_SIZE, VAULT_DISCRIMINATOR, VAULT_SPACE, vaultAddress } from '../devnet';
import { PENDING, PLATFORM } from '../../config/verification';
import { shippedLesson } from '../../__tests__/shipped';

/** The lesson's program id and admin, plus the platform's pool size. */
const VERIFICATION = shippedLesson().verification;
const CONFIG = {
  vulnerableProgramId: VERIFICATION.vulnerableProgramId,
  adminPubkey: VERIFICATION.adminPubkey,
  poolSize: PLATFORM.poolSize,
};

/** A Vault account as `initialize` would have written it. */
function account(authority: string, balance: number): Uint8Array {
  const data = new Uint8Array(VAULT_SPACE);
  data.set(VAULT_DISCRIMINATOR, 0);
  data.set(new PublicKey(authority).toBytes(), 8);
  new DataView(data.buffer).setBigUint64(40, BigInt(balance), true);
  return data;
}

/** Unwrap a resolution that must be a target, so the assertions below keep bite. */
function expectTarget(resolved: DemoTargetResolution): DemoTarget {
  expect(resolved.kind).toBe('target');
  if (resolved.kind !== 'target') throw new Error('expected a target');
  return resolved.target;
}

describe('demoTarget — 没有钱包时的真实目标', () => {
  it('读不到链时回退到池里一个真实地址，而不是占位符', async () => {
    const target = expectTarget(await resolveDemoTarget(null, CONFIG));
    expect(target.vault).toBe(vaultAddress(FALLBACK_VAULT_INDEX).toBase58());
    // The fallback is a real address in the pool, derived exactly as the pool
    // script derived it — it can go stale, but it is never fake.
    expect(target.vault).not.toContain('…');
  });

  it('永远使用配置里的真实 program id 与管理员地址', async () => {
    const target = expectTarget(await resolveDemoTarget(null, CONFIG));
    expect(target.programId).toBe(VERIFICATION.vulnerableProgramId);
    expect(target.authority).toBe(VERIFICATION.adminPubkey);
  });

  it('读链成功时命名的是下一个新鲜 vault', async () => {
    const indexOf = new Map(
      [...Array(POOL_SIZE).keys()].map((i) => [vaultAddress(i).toBase58(), i]),
    );
    const read = async (addresses: PublicKey[]) =>
      addresses.map((address) => {
        const index = indexOf.get(address.toBase58());
        if (index === undefined) return null;
        return account(VERIFICATION.adminPubkey, index === 0 ? 500 : 1000); // index 0 已被之前的访客打掉
      });
    const target = expectTarget(await resolveDemoTarget(read, CONFIG));
    expect(target.vault).toBe(vaultAddress(1).toBase58());
  });

  it('回退用的是池子推导出来的地址，不是随手一把公钥', async () => {
    const target = expectTarget(await resolveDemoTarget(null, CONFIG));
    // Same derivation the pool script used: if this ever stops matching, the
    // fallback has become an invented address wearing a real one's clothes.
    expect(vaultAddress(FALLBACK_VAULT_INDEX).toBase58()).toBe(target.vault);
    expect(FALLBACK_VAULT_INDEX).toBeLessThan(PLATFORM.poolSize);
  });

  it('池子被打空时报告 exhausted，而不是指向已经掉到 500 的 0 号', async () => {
    // Every address the scan looks at holds an already-drained vault, so nothing
    // in the pool is fresh. Reading a drained account for every address also keeps
    // this test's cost independent of the pool size: it is the behaviour — nothing
    // fresh means exhausted — that is under test, not a count.
    const read = async (addresses: PublicKey[]) =>
      addresses.map(() => account(VERIFICATION.adminPubkey, 500));
    // Naming index 0 here would animate 1000 -> 500 under a vault that holds 500.
    expect(await resolveDemoTarget(read, CONFIG)).toEqual({ kind: 'exhausted' });
  });

  it('管理员地址没有配置时不命名任何东西', async () => {
    const resolved = await resolveDemoTarget(null, {
      vulnerableProgramId: VERIFICATION.vulnerableProgramId,
      adminPubkey: PENDING, // the 'TBD' sentinel: no real authority exists yet
      poolSize: PLATFORM.poolSize,
    });
    expect(resolved).toEqual({ kind: 'notConfigured' });
  });

  it('读链报错时回退到真实地址', async () => {
    // An unreachable RPC is the ordinary case, not an error worth surfacing.
    const read = async (): Promise<(Uint8Array | null)[]> => {
      throw new Error('fetch failed');
    };
    const target = expectTarget(await resolveDemoTarget(read, CONFIG));
    expect(target.vault).toBe(vaultAddress(FALLBACK_VAULT_INDEX).toBase58());
    expect(target.vault).not.toContain('…');
  });
});
