import { describe, it, expect } from 'vitest';
import {
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

interface Frame {
  pct: number;
  body: string;
}

/** Parse `@keyframes x{ 0%{...} 50%{...} }` into ordered frames. */
function frames(css: string): Frame[] {
  return [...css.matchAll(/([\d.]+)%\{([^}]*)\}/g)].map((match) => ({
    pct: Number(match[1]),
    body: match[2],
  }));
}

/**
 * The opacity in force at `pct`, interpolating between the frames that declare
 * it — NOT simply the last declared value. A frame list that declares opacity
 * only at 6% and 100% fades continuously in between, which is exactly the bug
 * this guards.
 *
 * LIMITS (measured, so nobody over-trusts it): this understands only the frame
 * shape `at()` emits — `N%{prop:value}`. It cannot see keyword frames (`to{}`),
 * ignores `opacity: 0` with a space or `.5`, and assumes a base opacity of 1
 * before the first declaring frame. It is a guard on this generator, not a CSS
 * engine. The browser-measured checks in tools/shoot.mjs are what cover the
 * rendered result.
 */
function opacityAt(css: string, pct: number): number {
  const declared = frames(css)
    .map((frame) => ({ pct: frame.pct, raw: /opacity:([\d.]+)/.exec(frame.body)?.[1] }))
    .filter((entry): entry is { pct: number; raw: string } => entry.raw !== undefined)
    .map((entry) => ({ pct: entry.pct, value: Number(entry.raw) }));

  if (declared.length === 0) return 1;
  if (pct <= declared[0].pct) return declared[0].value;

  for (let i = 1; i < declared.length; i++) {
    const previous = declared[i - 1];
    const next = declared[i];
    if (pct <= next.pct) {
      const t = (pct - previous.pct) / (next.pct - previous.pct);
      return previous.value + (next.value - previous.value) * t;
    }
  }

  return declared[declared.length - 1].value;
}

describe('keyframes — 数据来源', () => {
  it('安全阶段是账户声明(S3), 且不在最顶层', () => {
    const stage = VAULT_LAYERS[SECURITY_INDEX];
    expect(stage.id).toBe('S3');
    // The flaw lives on the declaration, not on the hand-written check below it.
    expect(stage.nameKey).toBe('stageDeclaration');
    // blockedY(0) would be off-canvas, so the fixed path needs a stage above.
    expect(SECURITY_INDEX).toBeGreaterThanOrEqual(1);
  });
});

describe('keyframes — 所有坐标都由 geometry 派生', () => {
  /**
   * The descent is now sampled between the anchors and placed on a √distance
   * curve, so the values are interpolations rather than a fixed set. Three
   * properties still make hand-written coordinates impossible:
   *
   *   1. every value stays on the track geometry defines;
   *   2. every anchor geometry defines appears exactly;
   *   3. the dot only ever moves downward during the descent.
   *
   * Provenance itself is enforced separately and more strictly by
   * no-hardcoded-pixels.test.ts, which rejects any `px` literal in this
   * module's source.
   */
  const anchors = (): number[] => [
    dropStartY(),
    ...VAULT_LAYERS.map((_, index) => layerMidY(index)),
    EXIT_Y,
    IMPACT_Y,
    IMPACT_Y - BOUNCE_PX,
    IMPACT_Y - SECOND_BOUNCE_PX,
  ];

  it('圆点从不离开 geometry 定义的轨道', () => {
    for (const y of translateYs(vulnerableKeyframes() + fixedKeyframes())) {
      expect(y).toBeGreaterThanOrEqual(dropStartY());
      expect(y).toBeLessThanOrEqual(EXIT_Y);
    }
  });

  it('geometry 定义的每个锚点都精确出现在关键帧里', () => {
    const produced = new Set(translateYs(vulnerableKeyframes() + fixedKeyframes()));
    const missing = anchors().filter((y) => !produced.has(y));
    expect(missing).toEqual([]);
  });

  it('下落过程单调向下, 不回头', () => {
    const ys = translateYs(vulnerableKeyframes()).filter((y) => y >= 0);
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1]);
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

  it('结束时淡出(检查的是最后一帧, 不是任何一帧)', () => {
    const parsed = frames(fixedKeyframes());
    const last = parsed[parsed.length - 1];
    expect(last.pct).toBe(100);
    expect(last.body).toContain('opacity:0');
  });

  it('两次撞击时仍然完全不透明, 不能在落地前就淡掉', () => {
    const css = fixedKeyframes();
    expect(opacityAt(css, FIXED_HIT_PCT)).toBe(1);
    expect(opacityAt(css, 64)).toBe(1);
    expect(opacityAt(css, FIXED_HIT2_PCT)).toBe(1);
    expect(opacityAt(css, 88)).toBe(1);
    // ...and it does fade, but only after the last bounce.
    expect(opacityAt(css, 100)).toBe(0);
  });
});

describe('keyframes — 漏洞版全程不透明', () => {
  it('穿过安全层的那一刻仍然是完全不透明', () => {
    const css = vulnerableKeyframes();
    expect(opacityAt(css, 0)).toBe(0);
    expect(opacityAt(css, VULNERABLE_HIT_PCT)).toBe(1);
    expect(opacityAt(css, 100)).toBe(1);
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
