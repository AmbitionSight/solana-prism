import { describe, it, expect } from 'vitest';
import {
  LAYER_HEIGHT,
  LAYER_GAP,
  layerMidY,
  layerTopY,
  stackHeight,
  blockedY,
} from '../geometry';

describe('geometry', () => {
  it('常量', () => {
    expect(LAYER_HEIGHT).toBe(64);
    expect(LAYER_GAP).toBe(8);
  });

  it('layerTopY', () => {
    expect(layerTopY(0)).toBe(0);
    expect(layerTopY(2)).toBe(144);
  });

  it('layerMidY', () => {
    expect(layerMidY(0)).toBe(32);
    expect(layerMidY(1)).toBe(104);
    expect(layerMidY(2)).toBe(176);
    expect(layerMidY(4)).toBe(320);
  });

  it('stackHeight(5)', () => {
    expect(stackHeight(5)).toBe(352);
  });

  it('blockedY: 被第 i 层挡住时圆点停留 y(层顶上方 8px)', () => {
    expect(blockedY(2)).toBe(136);
  });
});
