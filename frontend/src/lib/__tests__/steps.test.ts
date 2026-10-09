import { describe, it, expect } from 'vitest';
import { AUTO_ADVANCE_MS, nextStep, attackOutcome, TX_CARD_MS } from '../steps';

describe('steps', () => {
  it('nextStep 推进, 5 后 null', () => {
    expect(nextStep(1)).toBe(2);
    expect(nextStep(4)).toBe(5);
    expect(nextStep(5)).toBeNull();
  });

  it('Step1-4 自动推进, Step5 手动', () => {
    expect(AUTO_ADVANCE_MS[1]).toBe(3000);
    expect(AUTO_ADVANCE_MS[4]).toBe(5000);
    expect(AUTO_ADVANCE_MS[5]).toBeUndefined();
  });

  it('attackOutcome', () => {
    expect(attackOutcome(false)).toBe('success');
    expect(attackOutcome(true)).toBe('rejected');
  });

  it('交易卡片停留时长', () => {
    expect(TX_CARD_MS).toBe(1200);
  });
});
