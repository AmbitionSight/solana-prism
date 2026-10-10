import { describe, it, expect } from 'vitest';
import { CONTRACT_LINES, CONTRACT_REGIONS } from '../contractSource';

/**
 * The listing is the deployed contract, not a paraphrase of it. The copy in
 * public/source is already guarded byte-for-byte against contract/ by
 * source-assets.test.ts, so pinning the listing to *it* puts the displayed text
 * on the same chain of custody as the file the closing note links to.
 */
const SOURCES = import.meta.glob('/public/source/prism_vulnerable.rs.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('contractSource — 显示的就是链上那份', () => {
  it('真的读到了对照文件', () => {
    const files = Object.values(SOURCES);
    expect(files.length).toBe(1);
    expect(files[0].length).toBeGreaterThan(500);
  });

  it('逐行等于 public/source 里那份', () => {
    const original = Object.values(SOURCES)[0].replace(/\r\n/g, '\n').split('\n');
    // The file ends with a trailing newline, which split() turns into a final
    // empty string; the listing does not carry it.
    if (original[original.length - 1] === '') original.pop();
    expect(CONTRACT_LINES).toEqual(original);
  });
});

describe('contractSource — 阶段区域落在正确的行上', () => {
  const textOf = (from: number, to: number) => CONTRACT_LINES.slice(from, to + 1).join('\n');

  it('五个区域，按源码顺序排列', () => {
    expect(CONTRACT_REGIONS.map((r) => r.stageId)).toEqual(['S2', 'S3', 'S1', 'S4', 'S5']);
  });

  it('每个区域框住的确实是那一阶段的代码', () => {
    const byId = Object.fromEntries(CONTRACT_REGIONS.map((r) => [r.stageId, r]));
    expect(textOf(byId.S1.from, byId.S1.to)).toContain('pub fn withdraw(ctx: Context<Withdraw>');
    expect(textOf(byId.S2.from, byId.S2.to)).toContain("pub struct Withdraw<'info> {");
    expect(textOf(byId.S2.from, byId.S2.to)).toContain("pub vault: Account<'info, Vault>,");
    expect(textOf(byId.S3.from, byId.S3.to)).toContain("pub authority: AccountInfo<'info>,");
    expect(textOf(byId.S4.from, byId.S4.to)).toContain('require!(');
    expect(textOf(byId.S5.from, byId.S5.to)).toContain('vault.balance -= amount;');
  });

  it('区域之间不重叠，且都在文件范围内', () => {
    const spans = [...CONTRACT_REGIONS].sort((a, b) => a.from - b.from);
    for (let i = 1; i < spans.length; i += 1) {
      expect(spans[i].from).toBeGreaterThan(spans[i - 1].to);
    }
    for (const region of CONTRACT_REGIONS) {
      expect(region.from).toBeGreaterThanOrEqual(0);
      expect(region.to).toBeLessThan(CONTRACT_LINES.length);
    }
  });
});
