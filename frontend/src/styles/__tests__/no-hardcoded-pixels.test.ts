import { describe, it, expect } from 'vitest';

/**
 * Iron rule 2 is "no animation coordinate may be written by hand in CSS".
 *
 * keyframes.test.ts guards the *values* the generator produces. This file
 * guards the *sources*: it fails if a stylesheet carries a pixel literal where a
 * coordinate belongs, or if the keyframe generator's own source hard-codes one.
 *
 * A value-only guard cannot do this — a hard-coded but numerically correct
 * coordinate satisfies it. Here the literal itself is the failure.
 *
 * The stylesheets are pulled in through Vite so this stays type-safe without
 * adding @types/node to a browser project.
 */

const cssSources = import.meta.glob('../*.css', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

const generatorSources = import.meta.glob('../../lib/keyframes.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * Transform functions that move, scale or rotate a box.
 *
 * The 3D and matrix forms are listed explicitly: an earlier version of this
 * guard used `translate[XYZ]?` and silently missed `translate3d`, `matrix`,
 * `perspective` and friends.
 */
const TRANSFORM_CALL =
  /(?:translate3d|translate[XYZ]?|scale3d|scale[XYZ]?|rotate3d|rotate[XYZ]?|skew[XY]?|matrix3d|matrix|perspective)\(([^)]*)\)/g;

/**
 * The arguments of every transform call anywhere in a stylesheet.
 *
 * Every declaration is scanned, not just `transform:` ones, because a coordinate
 * can be smuggled in behind a custom property:
 *   `:root { --shift: translateY(40px) }  .a { transform: var(--shift) }`
 * which an earlier version of this guard also missed.
 *
 * NOT covered, deliberately: pixel values in non-transform properties (`top`,
 * `left`, `margin`) on static chrome, and inline `style={{}}` in TSX. The layer
 * and attack coordinate system is entirely transform-based, which is what makes
 * this scope sufficient — see the note in README.
 */
function transformArguments(css: string): string[] {
  return [...css.matchAll(/[-\w]+\s*:\s*([^;}]+)/g)].flatMap((declaration) =>
    [...declaration[1].matchAll(TRANSFORM_CALL)].map((call) => call[1]),
  );
}

describe('iron rule 2 — 检测器自身的覆盖范围', () => {
  // A guard is only as good as its matcher. Each case below is a shape that a
  // previous version of this guard let through while the suite stayed green.
  it('能识别 3D 与 matrix 形式', () => {
    expect(transformArguments('.a { transform: translate3d(0, 40px, 0); }')).toEqual(['0, 40px, 0']);
    expect(transformArguments('.a { transform: matrix(1,0,0,1,0,40px); }')).toEqual([
      '1,0,0,1,0,40px',
    ]);
    expect(transformArguments('.a { transform: perspective(10px) rotateY(2deg); }')).toEqual([
      '10px',
      '2deg',
    ]);
  });

  it('能识别藏在自定义属性里的坐标', () => {
    const css = ':root { --shift: translateY(40px); } .a { transform: var(--shift); }';
    expect(transformArguments(css)).toEqual(['40px']);
  });

  it('能识别关键帧主体里的坐标', () => {
    expect(transformArguments('@keyframes k { 50% { transform: translateY(40px); } }')).toEqual([
      '40px',
    ]);
  });

  it('不把纯令牌值误判为坐标', () => {
    expect(transformArguments(':root { --nudge-enter: 10px; --layer-height: 64px; }')).toEqual([]);
  });
});

describe('iron rule 2 — 手写坐标守卫(源码级)', () => {
  it('读到的是真实 CSS 内容, 不是空模块', () => {
    const files = Object.entries(cssSources);
    expect(files.length).toBeGreaterThanOrEqual(3);

    // Counting keys is NOT enough. With Vitest's default `css: false`, a `?raw`
    // CSS import yields the right number of keys holding EMPTY strings — which
    // is precisely how this guard once passed while reading nothing at all.
    // Hence: assert on content, not just on the key set.
    const empty = files.filter(([, css]) => css.length === 0).map(([path]) => path);
    expect(empty).toEqual([]);

    const combined = files.map(([, css]) => css).join('');
    expect(combined.length).toBeGreaterThan(1000);
    expect(combined).toContain('.layer-card'); // a selector we know exists

    const generator = Object.values(generatorSources)[0];
    expect(generator.length).toBeGreaterThan(500);
    expect(generator).toContain('@keyframes');
  });

  it('transform 的参数里不出现 px 字面量', () => {
    const offenders: string[] = [];
    for (const [path, css] of Object.entries(cssSources)) {
      for (const args of transformArguments(css)) {
        if (/\d+(?:\.\d+)?px/.test(args)) {
          offenders.push(`${path} -> transform(… ${args} …)`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keyframes.ts 里的 px 全部来自插值, 没有硬写的数值', () => {
    const source = Object.values(generatorSources)[0];
    const withoutComments = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    const literals = [...withoutComments.matchAll(/\d+(?:\.\d+)?px/g)].map((match) => match[0]);
    expect(literals).toEqual([]);
  });
});
