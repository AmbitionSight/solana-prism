/**
 * contractSource.ts — the deployed contract, verbatim.
 *
 * Not a paraphrase and not an excerpt: this is the file `anchor build` compiled
 * and `solana program deploy` put on testnet. `contractSource.test.ts` pins it
 * line for line to `public/source/prism_vulnerable.rs.txt`, which is itself
 * guarded byte-for-byte against `contract/` — so the text on screen and the
 * text the closing note links to cannot drift apart from what was deployed.
 *
 * Because it is verbatim, its comments are English: they are the file's own.
 * Chinese explanation lives in MARGIN_NOTES, beside the code rather than inside
 * it, so that "this is the real file" and "a Chinese reader can follow it" are
 * both true.
 */

/** The file, line for line, with no trailing newline entry. */
export const CONTRACT_LINES: string[] = [
  '//! prism_vulnerable — the build the demo attacks.',
  '//!',
  "//! The `Withdraw` accounts struct declares `authority` as `AccountInfo<'info>`,",
  '//! which asks the runtime for nothing at all. The handler then checks the',
  "//! *address* by hand with `require!`, so anyone who knows the admin's address can",
  '//! hand it over and sign the transaction themselves.',
  '//!',
  '//! This is the whole bug, and it is one line: the declaration at stage 3, not',
  '//! the `require!` further down. Compare with programs/prism_fixed/src/lib.rs,',
  '//! which differs only in that declaration.',
  '',
  'use anchor_lang::prelude::*;',
  '',
  '// The real address, written by `anchor keys sync` from',
  "// target/deploy/prism_vulnerable-keypair.json. Anchor derives `#[account]`'s",
  '// Owner from this, so it has to match the keypair the program is built with.',
  'declare_id!("7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2");',
  '',
  '#[program]',
  'pub mod prism_vulnerable {',
  '    use super::*;',
  '',
  '    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {',
  '        let vault = &mut ctx.accounts.vault;',
  '        vault.authority = ctx.accounts.authority.key();',
  '        vault.balance = 1000;',
  '        Ok(())',
  '    }',
  '',
  '    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {',
  '        let vault = &mut ctx.accounts.vault;',
  '        // The address matches, so this passes — nobody ever checked who signed.',
  '        require!(',
  '            vault.authority == ctx.accounts.authority.key(),',
  '            ErrorCode::RequireViolated',
  '        );',
  '        vault.balance -= amount;',
  '        Ok(())',
  '    }',
  '}',
  '',
  '#[derive(Accounts)]',
  "pub struct Initialize<'info> {",
  '    #[account(init, payer = authority, space = 8 + 32 + 8)]',
  "    pub vault: Account<'info, Vault>,",
  '    #[account(mut)]',
  "    pub authority: Signer<'info>,",
  "    pub system_program: Program<'info, System>,",
  '}',
  '',
  '/// The listing shown in step 2 of the demo is this struct verbatim.',
  '#[derive(Accounts)]',
  "pub struct Withdraw<'info> {",
  '    #[account(mut)]',
  "    pub vault: Account<'info, Vault>,",
  '    /// CHECK: address only — no signature required. This is the bug.',
  "    pub authority: AccountInfo<'info>,",
  '}',
  '',
  '#[account]',
  'pub struct Vault {',
  '    pub authority: Pubkey,',
  '    pub balance: u64,',
  '}',
];

/**
 * Which lines become which stage, ascending by line number — the boxes sweep
 * down the listing the way you read it, and the stage numbers on the labels are
 * what shows the reordering: read top to bottom, the stages come out 1, 4, 5,
 * 2, 3. The accounts struct sits at the bottom of the file, yet its stages are
 * the second and third to execute — so the declaration is the last thing you
 * read and the third thing that happens. That gap is the reveal.
 *
 * Indices are into CONTRACT_LINES and were taken from the real file, not
 * adjusted to fit: the previous listing was an excerpt, so every one of these
 * numbers moved when the excerpt became the whole file.
 */
export const CONTRACT_REGIONS: { stageId: string; from: number; to: number }[] = [
  { stageId: 'S1', from: 29, to: 29 },
  { stageId: 'S4', from: 31, to: 35 },
  { stageId: 'S5', from: 36, to: 36 },
  { stageId: 'S2', from: 51, to: 54 },
  { stageId: 'S3', from: 55, to: 56 },
];

/**
 * Chinese explanation, keyed to a line of the listing.
 *
 * Beside the code rather than inside it: the listing has to stay byte-identical
 * to the deployed file, and a Chinese comment inside it would end that the
 * moment the file was rebuilt.
 *
 * `match` pins each note to its line's content, so a note cannot drift onto the
 * wrong line without a test going red.
 */
export type MarginNoteKey =
  | 'noteDeclareId'
  | 'noteStructNotSigner'
  | 'noteHandlerRequires'
  | 'noteTheBug'
  | 'noteStateChange';

export const MARGIN_NOTES: { line: number; key: MarginNoteKey; match: string }[] = [
  { line: 16, key: 'noteDeclareId', match: 'declare_id!' },
  { line: 29, key: 'noteHandlerRequires', match: 'pub fn withdraw' },
  { line: 36, key: 'noteStateChange', match: 'vault.balance -= amount' },
  { line: 52, key: 'noteStructNotSigner', match: 'pub struct Withdraw' },
  { line: 56, key: 'noteTheBug', match: "AccountInfo<'info>," },
];
