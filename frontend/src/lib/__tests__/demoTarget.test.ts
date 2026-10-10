import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { resolveDemoTarget, FALLBACK_VAULT_INDEX } from '../demoTarget';
import { POOL_SIZE, VAULT_DISCRIMINATOR, VAULT_SPACE, vaultAddress } from '../devnet';
import { VERIFICATION } from '../../config/verification';

describe('demoTarget — 没有钱包时的真实目标', () => {
  it('读不到链时回退到池里一个真实地址，而不是占位符', async () => {
    const target = await resolveDemoTarget(null);
    expect(target.vault).toBe(vaultAddress(FALLBACK_VAULT_INDEX).toBase58());
    // The fallback is a real address in the pool, derived exactly as the pool
    // script derived it — it can go stale, but it is never fake.
    expect(target.vault).not.toContain('…');
  });

  it('永远使用配置里的真实 program id 与管理员地址', async () => {
    const target = await resolveDemoTarget(null);
    expect(target.programId).toBe(VERIFICATION.vulnerableProgramId);
    expect(target.authority).toBe(VERIFICATION.adminPubkey);
  });

  it('读链成功时命名的是下一个新鲜 vault', async () => {
    const admin = VERIFICATION.adminPubkey;
    const account = (balance: number) => {
      const data = new Uint8Array(VAULT_SPACE);
      data.set(VAULT_DISCRIMINATOR, 0);
      data.set(new PublicKey(admin).toBytes(), 8);
      new DataView(data.buffer).setBigUint64(40, BigInt(balance), true);
      return data;
    };
    const read = async (address: PublicKey) => {
      const index = [...Array(POOL_SIZE).keys()].find((i) => vaultAddress(i).equals(address));
      if (index === undefined) return null;
      return account(index === 0 ? 500 : 1000); // index 0 已被之前的访客打掉
    };
    const target = await resolveDemoTarget(read);
    expect(target.vault).toBe(vaultAddress(1).toBase58());
  });

  it('回退用的是池子推导出来的地址，不是随手一把公钥', async () => {
    const target = await resolveDemoTarget(null);
    // Same derivation the pool script used: if this ever stops matching, the
    // fallback has become an invented address wearing a real one's clothes.
    expect(vaultAddress(FALLBACK_VAULT_INDEX).toBase58()).toBe(target.vault);
    expect(FALLBACK_VAULT_INDEX).toBeLessThan(VERIFICATION.poolSize);
  });
});
