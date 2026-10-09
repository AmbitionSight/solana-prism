import { describe, it, expect } from 'vitest';
import {
  PENDING,
  VERIFICATION,
  isFilled,
  solscanAccountUrl,
  solscanTxUrl,
} from '../verification';

describe('verification config', () => {
  it('已填值判定', () => {
    expect(isFilled('abc')).toBe(true);
    expect(isFilled(PENDING)).toBe(false);
    expect(isFilled('')).toBe(false);
  });

  it('Solscan 交易链接指向 devnet', () => {
    expect(solscanTxUrl('SIG123')).toBe('https://solscan.io/tx/SIG123?cluster=devnet');
  });

  it('Solscan 账户链接指向 devnet', () => {
    expect(solscanAccountUrl('ADDR123')).toBe(
      'https://solscan.io/account/ADDR123?cluster=devnet',
    );
  });

  it('可覆盖 cluster', () => {
    expect(solscanTxUrl('SIG', 'mainnet-beta')).toBe(
      'https://solscan.io/tx/SIG?cluster=mainnet-beta',
    );
  });

  it('Phase 2 阶段占位值尚未填真实数据', () => {
    expect(isFilled(VERIFICATION.vulnerableProgramId)).toBe(false);
    expect(VERIFICATION.vaultBefore).toBe(1000);
    expect(VERIFICATION.vaultAfter).toBe(500);
  });
});
