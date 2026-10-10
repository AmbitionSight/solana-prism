/**
 * code.ts — the contract listing shown in step 2, split into stage regions.
 *
 * This module holds no code text. The listing is not hand-maintained: step 2
 * shows the deployed file itself, and that file lives in contractSource.ts,
 * where every line is pinned to the artifact `anchor build` produced. A second
 * copy here — the old excerpt — is exactly how the text on screen and the text
 * that was deployed drift apart, so the copy is gone.
 *
 * What is left is the structure: which of the file's lines page 2 actually
 * shows (CONTRACT_EXCERPT), which of those become a boxed stage, and when each
 * box appears. Everything outside the excerpt becomes an `elision` block, so the
 * page can print how many lines it left out rather than silently jumping. The
 * boxed regions come from CONTRACT_REGIONS in source order, so the boxes sweep
 * down the listing the way you read it; the stage numbers on the labels are what
 * make the reordering visible, because read top to bottom they come out
 * 0, 1, 4, 5, 2, 3.
 */

import { CONTRACT_EXCERPT, CONTRACT_LINES, CONTRACT_REGIONS } from './contractSource';

/** A run of the file's own lines, boxed as a stage or shown plain. */
export interface CodeBlock {
  kind: 'code';
  /** null for the lines that belong to no stage — shown, never boxed. */
  stageId: string | null;
  /** Index of this block's first line into CONTRACT_LINES, used as a stable key. */
  from: number;
  lines: string[];
  /** When this block's box and label appear, as a fraction of the step. */
  revealAt?: number;
}

/** A run of the file the page does not show, printed as a marker. */
export interface ElisionBlock {
  kind: 'elision';
  /** Index into CONTRACT_LINES of the first omitted line. */
  from: number;
  /** How many lines are omitted here. */
  count: number;
}

export type ListingBlock = CodeBlock | ElisionBlock;

/** Fraction of step 2 at which the first box appears, and the gap between them. */
const REVEAL_START = 0.3;
const REVEAL_STEP = 0.08;

/**
 * The listing as the page renders it: the excerpt's code runs and stage blocks,
 * with an elision marker filling every gap — before the excerpt, between its
 * runs, and after it. Concatenating the `code` blocks' lines, and dropping the
 * elisions, must reproduce exactly the excerpt's lines; contractSource's guard
 * keeps the excerpt itself a faithful slice of the file.
 */
export function codeBlocks(): ListingBlock[] {
  const blocks: ListingBlock[] = [];
  let cursor = 0;
  let regionIndex = 0;

  for (const range of CONTRACT_EXCERPT) {
    if (range.from > cursor) {
      blocks.push({ kind: 'elision', from: cursor, count: range.from - cursor });
    }

    let pos = range.from;
    while (pos <= range.to) {
      const region = CONTRACT_REGIONS[regionIndex];
      if (region && region.from === pos) {
        blocks.push({
          kind: 'code',
          stageId: region.stageId,
          from: pos,
          lines: CONTRACT_LINES.slice(region.from, region.to + 1),
          revealAt: REVEAL_START + regionIndex * REVEAL_STEP,
        });
        pos = region.to + 1;
        regionIndex += 1;
      } else {
        const nextRegion = CONTRACT_REGIONS[regionIndex];
        const stop = Math.min(range.to, nextRegion ? nextRegion.from - 1 : range.to);
        blocks.push({
          kind: 'code',
          stageId: null,
          from: pos,
          lines: CONTRACT_LINES.slice(pos, stop + 1),
        });
        pos = stop + 1;
      }
    }

    cursor = range.to + 1;
  }

  if (cursor < CONTRACT_LINES.length) {
    blocks.push({ kind: 'elision', from: cursor, count: CONTRACT_LINES.length - cursor });
  }

  return blocks;
}
