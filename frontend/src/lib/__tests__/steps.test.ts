import { describe, it, expect } from 'vitest';
import { AUTO_ADVANCE_MS, nextStep, attackOutcome, TX_CARD_MS } from '../steps';

describe('steps', () => {
  it('nextStep 推进, 9 后 null', () => {
    expect(nextStep(1)).toBe(2);
    expect(nextStep(2)).toBe(3);
    expect(nextStep(3)).toBe(4);
    expect(nextStep(4)).toBe(5);
    expect(nextStep(5)).toBe(6);
    expect(nextStep(6)).toBe(7);
    expect(nextStep(7)).toBe(8);
    expect(nextStep(8)).toBe(9);
    expect(nextStep(9)).toBeNull();
  });

  it('Step1-4 自动推进, Step5-9 手动', () => {
    expect(AUTO_ADVANCE_MS[1]).toBe(3000);
    expect(AUTO_ADVANCE_MS[2]).toBe(9000);
    expect(AUTO_ADVANCE_MS[3]).toBe(5000);
    expect(AUTO_ADVANCE_MS[4]).toBe(5000);

    // A loop over the manual pages on purpose: adding a tenth page means
    // deciding here, explicitly, whether it auto-advances or waits.
    for (const step of [5, 6, 7, 8, 9] as const) {
      expect(AUTO_ADVANCE_MS[step]).toBeUndefined();
    }
  });

  it('attackOutcome', () => {
    expect(attackOutcome(false)).toBe('success');
    expect(attackOutcome(true)).toBe('rejected');
  });

  it('交易卡片停留时长', () => {
    expect(TX_CARD_MS).toBe(1200);
  });
});
