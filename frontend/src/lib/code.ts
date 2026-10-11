/**
 * code.ts — the contract listing shown in step 2, split into stage regions.
 *
 * This module holds no code text and no lesson data. Step 2 shows the deployed
 * file itself, and that file is fetched with the lesson; the structure of how it
 * is sliced (which lines page 2 shows, which become a boxed stage, and when each
 * box appears) is lesson data too. Both arrive as a `LessonContract`, so this is
 * a pure function of what the lesson ships rather than a reading of a module
 * constant.
 *
 * Everything outside the excerpt becomes an `elision` block, so the page can
 * print how many lines it left out rather than silently jumping. The boxed
 * regions come in source order, so the boxes sweep down the listing the way you
 * read it; the stage numbers on the labels are what make the reordering visible,
 * because read top to bottom they come out 0, 1, 4, 5, 2, 3.
 */

import type { LessonContract } from './lesson';

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
export function codeBlocks(contract: LessonContract): ListingBlock[] {
  const { lines, regions, excerpt } = contract;
  const blocks: ListingBlock[] = [];
  let cursor = 0;
  let regionIndex = 0;

  for (const range of excerpt) {
    if (range.from > cursor) {
      blocks.push({ kind: 'elision', from: cursor, count: range.from - cursor });
    }

    let pos = range.from;
    while (pos <= range.to) {
      const region = regions[regionIndex];
      if (region && region.from === pos) {
        blocks.push({
          kind: 'code',
          stageId: region.stageId,
          from: pos,
          lines: lines.slice(region.from, region.to + 1),
          revealAt: REVEAL_START + regionIndex * REVEAL_STEP,
        });
        pos = region.to + 1;
        regionIndex += 1;
      } else {
        const nextRegion = regions[regionIndex];
        const stop = Math.min(range.to, nextRegion ? nextRegion.from - 1 : range.to);
        blocks.push({
          kind: 'code',
          stageId: null,
          from: pos,
          lines: lines.slice(pos, stop + 1),
        });
        pos = stop + 1;
      }
    }

    cursor = range.to + 1;
  }

  if (cursor < lines.length) {
    blocks.push({ kind: 'elision', from: cursor, count: lines.length - cursor });
  }

  return blocks;
}
