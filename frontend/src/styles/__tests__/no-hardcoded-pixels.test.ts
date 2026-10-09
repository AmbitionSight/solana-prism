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

/** Arguments of every transform function that moves, scales or rotates a box. */
function transformArguments(css: string): string[] {
  return [...css.matchAll(/transform\s*:\s*([^;}]+)/g)].flatMap((declaration) =>
    [...declaration[1].matchAll(/(?:translate[XYZ]?|scale[XYZ]?|rotate|skew[XY]?)\(([^)]*)\)/g)].map(
      (call) => call[1],
    ),
  );
}

describe('iron rule 2 — 手写坐标守卫(源码级)', () => {
  it('确实读到了样式表与生成器源码, 守卫不是空转', () => {
    expect(Object.keys(cssSources).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(generatorSources)).toHaveLength(1);
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
