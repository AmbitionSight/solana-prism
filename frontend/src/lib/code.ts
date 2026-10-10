/**
 * code.ts — the contract listing shown in step 2, split into stage regions.
 *
 * This module holds no code text. The listing is not hand-maintained: step 2
 * shows the deployed file itself, and that file lives in contractSource.ts,
 * where it is pinned line for line to the artifact `anchor build` produced. A
 * second copy here — the old excerpt — is exactly how the text on screen and
 * the text that was deployed drift apart, so the copy is gone.
 *
 * What is left is the structure: which lines become a boxed stage, which are the
 * plain runs between them, and when each box appears. The boxed regions come
 * from CONTRACT_REGIONS in source order, so the boxes sweep down the listing the
 * way you read it; the stage numbers on the labels are what make the reordering
 * visible, because read top to bottom they come out 1, 4, 5, 2, 3.
 */

import { CONTRACT_LINES, CONTRACT_REGIONS } from './contractSource';

export interface CodeBlock {
  /** null for the lines that belong to no stage — shown, never boxed. */
  stageId: string | null;
  /** Index of this block's first line, used as a stable React key. */
  from: number;
  lines: string[];
  /** When this block's box and label appear, as a fraction of the step. */
  revealAt?: number;
}

/** Fraction of step 2 at which the first box appears, and the gap between them. */
const REVEAL_START = 0.3;
const REVEAL_STEP = 0.08;

/** The listing split into boxed stage regions and the plain runs between them. */
export function codeBlocks(): CodeBlock[] {
  const lines = CONTRACT_LINES;
  const blocks: CodeBlock[] = [];
  let cursor = 0;

  CONTRACT_REGIONS.forEach((region, index) => {
    if (region.from > cursor) {
      blocks.push({ stageId: null, from: cursor, lines: lines.slice(cursor, region.from) });
    }
    blocks.push({
      stageId: region.stageId,
      from: region.from,
      lines: lines.slice(region.from, region.to + 1),
      revealAt: REVEAL_START + index * REVEAL_STEP,
    });
    cursor = region.to + 1;
  });

  if (cursor < lines.length) {
    blocks.push({ stageId: null, from: cursor, lines: lines.slice(cursor) });
  }

  return blocks;
}
