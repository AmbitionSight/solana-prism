import { describe, it, expect } from 'vitest';
import {
  LAYER_HEIGHT,
  LAYER_GAP,
  layerMidY,
  layerTopY,
  stackHeight,
  stackedOffsetY,
  blockedY,
  dropStartY,
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

  it('stackHeight 单层就是层高, 零层不占空间', () => {
    expect(stackHeight(1)).toBe(LAYER_HEIGHT);
    expect(stackHeight(0)).toBe(0);
  });

  it('blockedY: 被第 i 层挡住时圆点停留 y(层顶上方 8px)', () => {
    expect(blockedY(2)).toBe(136);
  });

  it('blockedY(1) 正好贴在第 0 层底边', () => {
    expect(blockedY(1)).toBe(layerTopY(1) - 8);
    expect(blockedY(1)).toBe(64);
  });
});

describe('stackedOffsetY — 层叠位置相对容器中心的偏移', () => {
  it('5 层时首/中/末层的偏移', () => {
    expect(stackedOffsetY(0, 5)).toBe(-144);
    expect(stackedOffsetY(2, 5)).toBe(0);
    expect(stackedOffsetY(4, 5)).toBe(144);
  });

  it('任意层数下相邻层间距恒为 LAYER_HEIGHT + LAYER_GAP', () => {
    for (const count of [1, 2, 3, 4, 5, 6, 7]) {
      for (let index = 0; index < count - 1; index++) {
        expect(stackedOffsetY(index + 1, count) - stackedOffsetY(index, count)).toBe(
          LAYER_HEIGHT + LAYER_GAP,
        );
      }
    }
  });

  it('奇数层时中间层正好落在容器中心', () => {
    for (const count of [1, 3, 5, 7]) {
      expect(stackedOffsetY((count - 1) / 2, count)).toBe(0);
    }
  });
});

describe('dropStartY — 圆点下落起点', () => {
  it('在层叠顶部上方一个层高处', () => {
    expect(dropStartY()).toBe(-64);
  });

  it('确实在栈顶之上, 保证从视野外进入', () => {
    expect(dropStartY()).toBeLessThan(layerTopY(0));
  });
});
