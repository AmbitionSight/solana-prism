import { describe, it, expect } from 'vitest';
import { codeBlocks, type CodeBlock, type ElisionBlock } from '../code';
import { AUTO_ADVANCE_MS } from '../steps';
import { shippedLesson } from '../../__tests__/shipped';

/** The lesson's contract as fetched: its lines and how page 2 slices them. */
const contract = shippedLesson().contract;

const codeOnly = () => codeBlocks(contract).filter((b): b is CodeBlock => b.kind === 'code');
const elisions = () =>
  codeBlocks(contract).filter((b): b is ElisionBlock => b.kind === 'elision');

/** The excerpt's file lines, in order — what page 2 should actually show. */
function excerptLines(): string[] {
  return contract.excerpt.flatMap((range) =>
    contract.lines.slice(range.from, range.to + 1),
  );
}

describe('code blocks — 代码到阶段的映射', () => {
  it('代码区块拼起来, 就是被选中的那一段 (逐行等于原文)', () => {
    // Not the whole file any more: page 2 shows an excerpt. But the excerpt is
    // still the file's own text, line for line — the block text at file index i
    // must equal contract.lines[i].
    expect(codeOnly().flatMap((b) => b.lines)).toEqual(excerptLines());
    for (const block of codeOnly()) {
      expect(block.lines).toEqual(contract.lines.slice(block.from, block.from + block.lines.length));
    }
  });

  it('省略标记刚好盖住被选段之外的所有行, 一行不差', () => {
    const total = elisions().reduce((sum, e) => sum + e.count, 0);
    const shown = codeOnly().reduce((sum, b) => sum + b.lines.length, 0);
    expect(shown + total).toBe(contract.lines.length);

    // …and every elision accounts for lines that are actually outside the excerpt.
    const shownIndices = new Set(
      codeOnly().flatMap((b) => b.lines.map((_, offset) => b.from + offset)),
    );
    for (const elision of elisions()) {
      for (let i = 0; i < elision.count; i++) {
        expect(shownIndices.has(elision.from + i)).toBe(false);
      }
    }
  });

  it('六个阶段各有一个区块, 按阅读顺序', () => {
    const mapped = codeOnly().filter((b) => b.stageId);
    expect(mapped.map((b) => b.stageId)).toEqual(['S0', 'S1', 'S4', 'S5', 'S2', 'S3']);
  });

  it('代码区块不重叠、不丢行、不重复行', () => {
    const blocks = codeOnly();
    expect(blocks[0].from).toBe(contract.excerpt[0].from);
    for (let i = 1; i < blocks.length; i += 1) {
      const previous = blocks[i - 1];
      const next = blocks[i];
      // Either the next block starts where the last ended, or an elision sits
      // between them — but a code block never overlaps or rewinds.
      expect(next.from).toBeGreaterThanOrEqual(previous.from + previous.lines.length);
    }
  });

  it('只有六个阶段区块带揭示时间, 且从上往下依次出现', () => {
    const reveals = codeOnly()
      .filter((b) => b.revealAt !== undefined)
      .map((b) => b.revealAt as number);
    expect(reveals).toHaveLength(6);
    for (let i = 1; i < reveals.length; i += 1) {
      expect(reveals[i]).toBeGreaterThan(reveals[i - 1]);
    }
  });

  it('最后一个标注在卡片开始淡出之前就出现完了', () => {
    const duration = AUTO_ADVANCE_MS[2] ?? 0;
    const revealed = codeOnly().filter((b) => b.revealAt !== undefined);
    const last = revealed[revealed.length - 1];
    // Reveal delay + the label's own animation, against the point the card
    // starts dissolving (code-card-out holds until 96%).
    const doneAtMs = (last?.revealAt ?? 0) * duration + 400;
    expect(doneAtMs).toBeLessThan(0.96 * duration);
  });
});
