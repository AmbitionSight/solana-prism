import { describe, it, expect } from 'vitest';
import {
  ATTACK_MS,
  BOUNCE_PX,
  SECOND_BOUNCE_PX,
  DANGER_PULSE_ANIMATION,
  EXIT_Y,
  FIXED_ANIMATION,
  FIXED_HIT_PCT,
  FIXED_HIT2_PCT,
  IMPACT_Y,
  SECURITY_INDEX,
  SUCCESS_PULSE_ANIMATION,
  VULNERABLE_ANIMATION,
  VULNERABLE_HIT_PCT,
  dangerPulseKeyframes,
  fixedKeyframes,
  successPulseKeyframes,
  vulnerableKeyframes,
} from '../keyframes';
import { BLOCK_CLEARANCE, dropStartY, layerMidY, layerTopY, stackHeight } from '../geometry';
import { VAULT_LAYERS } from '../../config/layers';

/** Every `translateY(<n>px)` value appearing in a keyframes string. */
function translateYs(css: string): number[] {
  return [...css.matchAll(/translateY\((-?[\d.]+)px\)/g)].map((match) => Number(match[1]));
}

describe('keyframes — 数据来源', () => {
  it('安全层索引从配置推导, 不写死', () => {
    expect(SECURITY_INDEX).toBe(
      VAULT_LAYERS.findIndex((layer) => layer.isSecurityLayer && layer.broken),
    );
    expect(VAULT_LAYERS[SECURITY_INDEX].id).toBe('L3');
  });

  it('攻击时长是正数', () => {
    expect(ATTACK_MS).toBeGreaterThan(0);
  });
});

describe('keyframes — 所有坐标都来自 geometry(无手写像素)', () => {
  it('translateY 的每个数值都在 geometry 的取值集合内', () => {
    const allowed = new Set<number>([
      dropStartY(),
      ...VAULT_LAYERS.map((_, index) => layerMidY(index)),
      EXIT_Y,
      IMPACT_Y,
      IMPACT_Y - BOUNCE_PX,
      IMPACT_Y - SECOND_BOUNCE_PX,
    ]);

    for (const y of translateYs(vulnerableKeyframes() + fixedKeyframes())) {
      expect(allowed.has(y)).toBe(true);
    }
  });
});

describe('keyframes — 漏洞版(穿透)', () => {
  it('名字与 animation-name 常量一致', () => {
    expect(vulnerableKeyframes()).toContain(`@keyframes ${VULNERABLE_ANIMATION}`);
  });

  it('从栈顶之上进入', () => {
    expect(vulnerableKeyframes()).toContain(`translateY(${dropStartY()}px)`);
    expect(dropStartY()).toBeLessThan(layerTopY(0));
  });

  it('逐层经过每一层的中心', () => {
    const css = vulnerableKeyframes();
    for (let index = 0; index < VAULT_LAYERS.length; index++) {
      expect(css).toContain(`translateY(${layerMidY(index)}px)`);
    }
  });

  it('最终穿出栈底并放大', () => {
    expect(EXIT_Y).toBeGreaterThan(stackHeight(VAULT_LAYERS.length));
    const css = vulnerableKeyframes();
    expect(css).toContain(`translateY(${EXIT_Y}px) scale(1.5)`);
    expect(css).toContain(`translateY(${EXIT_Y}px) scale(3)`);
  });
});

describe('keyframes — 修复版(拦停)', () => {
  it('名字与 animation-name 常量一致', () => {
    expect(fixedKeyframes()).toContain(`@keyframes ${FIXED_ANIMATION}`);
  });

  it('拦停位置在安全层顶边之上, 而不是层内', () => {
    expect(IMPACT_Y).toBe(layerTopY(SECURITY_INDEX) - BLOCK_CLEARANCE);
    expect(IMPACT_Y).toBeLessThan(layerTopY(SECURITY_INDEX));
    expect(IMPACT_Y).toBeLessThan(layerMidY(SECURITY_INDEX));
  });

  it('全程最深只到拦停位置, 绝不进入安全层', () => {
    const deepest = Math.max(...translateYs(fixedKeyframes()).filter((y) => y > 0));
    expect(deepest).toBe(IMPACT_Y);
    expect(deepest).toBeLessThan(layerTopY(SECURITY_INDEX));
  });

  it('只经过安全层之上的层', () => {
    const css = fixedKeyframes();
    for (let index = 0; index < SECURITY_INDEX; index++) {
      expect(css).toContain(`translateY(${layerMidY(index)}px)`);
    }
    expect(css).not.toContain(`translateY(${layerMidY(SECURITY_INDEX)}px)`);
  });

  it('两撞两弹, 且第二次弹跳幅度更小', () => {
    const css = fixedKeyframes();
    expect(css).toContain(`${FIXED_HIT_PCT}%{transform:translateY(${IMPACT_Y}px)}`);
    expect(css).toContain(`${FIXED_HIT2_PCT}%{transform:translateY(${IMPACT_Y}px)}`);
    expect(BOUNCE_PX).toBeGreaterThan(SECOND_BOUNCE_PX);
  });

  it('结束时淡出', () => {
    expect(fixedKeyframes()).toContain('opacity:0');
  });
});

describe('keyframes — 层 flash 与圆点到达同步', () => {
  it('红 pulse 打在圆点穿过安全层的同一百分比', () => {
    expect(vulnerableKeyframes()).toContain(
      `${VULNERABLE_HIT_PCT}%{transform:translateY(${layerMidY(SECURITY_INDEX)}px)}`,
    );
    expect(dangerPulseKeyframes()).toContain(`@keyframes ${DANGER_PULSE_ANIMATION}`);
    expect(dangerPulseKeyframes()).toContain(`${VULNERABLE_HIT_PCT}%`);
  });

  it('绿 pulse 打在圆点两次撞上安全层的同一百分比', () => {
    const pulse = successPulseKeyframes();
    expect(pulse).toContain(`@keyframes ${SUCCESS_PULSE_ANIMATION}`);
    expect(pulse).toContain(`${FIXED_HIT_PCT}%`);
    expect(pulse).toContain(`${FIXED_HIT2_PCT}%`);
  });
});
