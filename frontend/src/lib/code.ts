/**
 * code.ts — the contract listing shown in step 2.
 *
 * The Rust itself never changes between languages; only the two comments do.
 * Keeping that split explicit (`code` lines vs `comment` lines) is what lets the
 * test assert the nine code lines are byte-identical to the master spec while
 * the comments legitimately differ.
 */

import { MESSAGES, type Language, type MessageKey } from '../i18n/messages';

export type CodeLine = { code: string } | { comment: MessageKey; indent: number };

/** Indentation is part of the listing, so it lives here rather than in CSS. */
export const CODE_LINES: CodeLine[] = [
  { code: '#[program]' },
  { code: 'pub mod xray_vault {' },
  { code: '    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {' },
  { code: '        let vault = &mut ctx.accounts.vault;' },
  { comment: 'codeCommentAuthority', indent: 8 },
  { code: '        require!(vault.authority == ctx.accounts.authority.key());' },
  { comment: 'codeCommentNoSigner', indent: 8 },
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
      : `${' '.repeat(line.indent)}// ${MESSAGES[language][line.comment]}`,
  );
}
