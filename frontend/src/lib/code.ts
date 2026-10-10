/**
 * code.ts — the contract listing shown in step 2.
 *
 * The Rust itself never changes between languages; only the comments do.
 * Keeping that split explicit (`code` lines vs `comment` lines) is what lets the
 * test assert the code lines are identical across languages while the comments
 * legitimately differ.
 *
 * The listing leads with `#[derive(Accounts)]` on purpose. An earlier version
 * showed only the handler body, which hid the very declaration the whole demo is
 * about — the flaw is `AccountInfo<'info>` where `Signer<'info>` was needed, not
 * the `require!` line further down.
 */

import { MESSAGES, type Language, type MessageKey } from '../i18n/messages';

export type CodeLine =
  | { code: string }
  | { comment: MessageKey; indent: number; prefix?: string };

/** Indentation is part of the listing, so it lives here rather than in CSS. */
export const CODE_LINES: CodeLine[] = [
  { code: '#[derive(Accounts)]' },
  { code: "pub struct Withdraw<'info> {" },
  { code: '    #[account(mut)]' },
  { code: "    pub vault: Account<'info, Vault>," },
  { comment: 'codeCommentBug', indent: 4, prefix: '///' },
  { code: "    pub authority: AccountInfo<'info>," },
  { code: '}' },
  { code: '' },
  { code: '#[program]' },
  { code: 'pub mod prism_vulnerable {' },
  { code: '    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {' },
  { code: '        let vault = &mut ctx.accounts.vault;' },
  { comment: 'codeCommentAddressOnly', indent: 8 },
  { code: '        require!(' },
  { code: '            vault.authority == ctx.accounts.authority.key(),' },
  { code: '            ErrorCode::RequireViolated' },
  { code: '        );' },
  { code: '        vault.balance -= amount;' },
  { code: '        Ok(())' },
  { code: '    }' },
  { code: '}' },
];

/** The listing as plain text for a given language. */
export function codeLines(language: Language): string[] {
  return CODE_LINES.map((line) =>
    'code' in line
      ? line.code
      : `${' '.repeat(line.indent)}${line.prefix ?? '//'} ${MESSAGES[language][line.comment]}`,
  );
}

/**
 * Which lines of the listing become which stage, so the mapping can be shown on
 * the code before it decomposes — otherwise the five cards appear out of
 * nowhere.
 *
 * Listed in SOURCE order, not execution order, so the highlight sweeps down the
 * listing the way you actually read it. The stage numbers on the labels are what
 * make the reordering visible: the sweep reads 2, 3, 1, 4, 5.
 */
export const CODE_REGIONS: { stageId: string; from: number; to: number }[] = [
  { stageId: 'S2', from: 0, to: 3 },
  { stageId: 'S3', from: 4, to: 5 },
  { stageId: 'S1', from: 10, to: 10 },
  { stageId: 'S4', from: 12, to: 13 },
  { stageId: 'S5', from: 14, to: 14 },
];

/** Fraction of step 2 at which the first box appears, and the gap between them. */
const REVEAL_START = 0.3;
const REVEAL_STEP = 0.08;

export interface CodeBlock {
  /** null for the lines that belong to no stage — shown, never boxed. */
  stageId: string | null;
  /** Index of this block's first line, used as a stable React key. */
  from: number;
  lines: string[];
  /** When this block's box and label appear, as a fraction of the step. */
  revealAt?: number;
}

/** The listing split into boxed stage regions and the plain runs between them. */
export function codeBlocks(language: Language): CodeBlock[] {
  const lines = codeLines(language);
  const blocks: CodeBlock[] = [];
  let cursor = 0;

  CODE_REGIONS.forEach((region, index) => {
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
