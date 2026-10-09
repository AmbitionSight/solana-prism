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
  { code: 'pub mod xray_vault {' },
  { code: '    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {' },
  { code: '        let vault = &mut ctx.accounts.vault;' },
  { comment: 'codeCommentAddressOnly', indent: 8 },
  { code: '        require!(vault.authority == ctx.accounts.authority.key());' },
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
