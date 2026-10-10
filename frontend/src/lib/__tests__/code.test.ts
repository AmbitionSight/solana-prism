import { describe, it, expect } from 'vitest';
import { codeBlocks } from '../code';
import { CONTRACT_LINES } from '../contractSource';
import { AUTO_ADVANCE_MS } from '../steps';

describe('code blocks — 代码到阶段的映射', () => {
  it('区块拼起来就是整份文件，一行不漏', () => {
    expect(codeBlocks().flatMap((b) => b.lines)).toEqual(CONTRACT_LINES);
  });

  it('五个阶段各有一个区块，按阅读顺序', () => {
    const mapped = codeBlocks().filter((b) => b.stageId);
    expect(mapped.map((b) => b.stageId)).toEqual(['S1', 'S4', 'S5', 'S2', 'S3']);
  });

  it('区块不重叠、不丢行、不重复行', () => {
    const blocks = codeBlocks();
    for (let i = 1; i < blocks.length; i += 1) {
      expect(blocks[i].from).toBe(blocks[i - 1].from + blocks[i - 1].lines.length);
    }
  });

  it('只有五个阶段区块带揭示时间，且从上往下依次出现', () => {
    const reveals = codeBlocks()
      .filter((b) => b.revealAt !== undefined)
      .map((b) => b.revealAt as number);
    expect(reveals).toHaveLength(5);
    for (let i = 1; i < reveals.length; i += 1) {
      expect(reveals[i]).toBeGreaterThan(reveals[i - 1]);
    }
  });

  it('最后一个标注在卡片开始淡出之前就出现完了', () => {
    const duration = AUTO_ADVANCE_MS[2] ?? 0;
    const revealed = codeBlocks().filter((b) => b.revealAt !== undefined);
    const last = revealed[revealed.length - 1];
    // Reveal delay + the label's own animation, against the point the card
    // starts dissolving (code-card-out holds until 96%).
    const doneAtMs = (last?.revealAt ?? 0) * duration + 400;
    expect(doneAtMs).toBeLessThan(0.96 * duration);
  });
});
