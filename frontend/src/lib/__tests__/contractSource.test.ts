import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MESSAGES } from '../../i18n/messages';
import { shippedLesson } from '../../__tests__/shipped';

/**
 * The listing is the deployed contract, not a paraphrase of it.
 *
 * It used to be `CONTRACT_LINES`, a module constant pinned line-for-line to
 * `public/source/prism_vulnerable.rs.txt`. The contract is now a file the lesson
 * folder ships and the app fetches, so the same guarantee is stated against the
 * bytes the app actually renders: the lesson's `contract.rs` must equal the
 * provenance copy line for line, and the regions and margin notes must land on
 * that text. `source-assets.test.ts` pins the provenance copy byte-for-byte to
 * `contract/`, so the chain of custody runs unbroken from the deployed artifact
 * to the screen.
 */
const LESSON = shippedLesson();
const { lines: CONTRACT_LINES, regions: CONTRACT_REGIONS, excerpt: CONTRACT_EXCERPT } =
  LESSON.contract;

/** The provenance copy, read as the app would read the fetched file. */
const SOURCE_FILE = readFileSync(
  fileURLToPath(new URL('../../../public/lessons/missing-signer/contract.rs', import.meta.url)),
  'utf8',
);

describe('contractSource — 显示的就是链上那份', () => {
  it('真的读到了合同文件', () => {
    expect(SOURCE_FILE.length).toBeGreaterThan(500);
  });

  it('课程里的合同逐行等于版本副本', () => {
    const original = SOURCE_FILE.replace(/\r\n/g, '\n').split('\n');
    if (original[original.length - 1] === '') original.pop();
    expect(CONTRACT_LINES).toEqual(original);
  });

  /**
   * The status bar prints `verification.vulnerableProgramId` and the listing
   * prints the `declare_id!` from the contract file. Both are guarded on their
   * own; this ties them to each other, so a future `anchor keys sync` cannot
   * make the demo contradict itself in the one place whose whole job is saying
   * "this is the real program".
   */
  it('状态栏里的 program id 就是代码里 declare_id! 的那一个', () => {
    const line = CONTRACT_LINES.find((l) => l.includes('declare_id!'));
    expect(line, '没有找到 declare_id!').toBeDefined();
    const match = /declare_id!\("([^"]+)"\)/.exec(line!);
    expect(match, 'declare_id! 的形状变了').not.toBeNull();
    expect(match![1]).toBe(LESSON.verification.vulnerableProgramId);
  });
});

describe('contractSource — 阶段区域落在正确的行上', () => {
  const textOf = (from: number, to: number) => CONTRACT_LINES.slice(from, to + 1).join('\n');

  it('六个区域，按源码顺序排列', () => {
    expect(CONTRACT_REGIONS.map((r) => r.stageId)).toEqual(['S0', 'S1', 'S4', 'S5', 'S2', 'S3']);
  });

  it('每个区域框住的确实是那一阶段的代码', () => {
    const byId = Object.fromEntries(CONTRACT_REGIONS.map((r) => [r.stageId, r]));
    expect(textOf(byId.S0.from, byId.S0.to)).toContain('pub fn initialize(ctx: Context<Initialize>');
    expect(textOf(byId.S0.from, byId.S0.to)).toContain(
      'vault.authority = ctx.accounts.authority.key();',
    );
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

  /**
   * The stage ids in the regions are a closed set that has to match the layers
   * the rest of the demo is built from — now both fetched from the lesson, so
   * this reads the ids from the data rather than from two module constants.
   */
  it('阶段 id 与课程里的 layers 完全对齐', () => {
    expect([...CONTRACT_REGIONS.map((r) => r.stageId)].sort()).toEqual(
      [...LESSON.layers.map((l) => l.id)].sort(),
    );
  });
});

describe('contractSource — 展示的是节选, 但每一行仍是原文', () => {
  it('确实只展示一部分 —— 有整行被省略', () => {
    // If this ever became the whole file the excerpt would be harmless, but the
    // page copy says "key sections"; a change back to the full listing has to
    // update both this and that copy deliberately.
    const shown = CONTRACT_EXCERPT.reduce((sum, r) => sum + (r.to - r.from + 1), 0);
    expect(shown).toBeLessThan(CONTRACT_LINES.length);
    expect(shown).toBeGreaterThan(0);
  });

  it('每个省段都在文件范围内, 且按顺序、不重叠', () => {
    for (const range of CONTRACT_EXCERPT) {
      expect(range.from).toBeGreaterThanOrEqual(0);
      expect(range.to).toBeLessThan(CONTRACT_LINES.length);
      expect(range.to).toBeGreaterThanOrEqual(range.from);
    }
    for (let i = 1; i < CONTRACT_EXCERPT.length; i += 1) {
      expect(CONTRACT_EXCERPT[i].from).toBeGreaterThan(CONTRACT_EXCERPT[i - 1].to);
    }
  });

  it('展示的部分把全部六个阶段都含进来 —— 一个都没被省掉', () => {
    // The excerpt is allowed to drop context, but never a stage: the mapping in
    // step 2 would break and the lesson would lose its point.
    for (const region of CONTRACT_REGIONS) {
      const covered = CONTRACT_EXCERPT.some(
        (range) => range.from <= region.from && range.to >= region.to,
      );
      expect(covered, `${region.stageId} 被省掉了`).toBe(true);
    }
  });
});

describe('contractSource — 中文旁注', () => {
  const NOTES = LESSON.contract.marginNotes;

  it('每条旁注都指向文件里真实存在的一行', () => {
    for (const note of NOTES) {
      expect(note.line, `line ${note.line} 越界`).toBeLessThan(CONTRACT_LINES.length);
      expect(CONTRACT_LINES[note.line].trim().length, `line ${note.line} 是空行`).toBeGreaterThan(0);
      // The note's `match` pins it to its line's content: without this, a line
      // shift would let a note annotate the wrong code in silence.
      expect(CONTRACT_LINES[note.line], `line ${note.line} 与 match 不符`).toContain(note.match);
    }
  });

  it('行号不重复', () => {
    const lines = NOTES.map((n) => n.line);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('每条旁注两种语言都有内容', () => {
    for (const note of NOTES) {
      expect(MESSAGES.en[note.key].trim().length).toBeGreaterThan(0);
      expect(MESSAGES.zh[note.key].trim().length).toBeGreaterThan(0);
    }
  });
});
