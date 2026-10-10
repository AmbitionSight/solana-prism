/**
 * contractSource.ts — the deployed contract, verbatim.
 *
 * This is the file `anchor build` compiled and `solana program deploy` put on
 * testnet. `contractSource.test.ts` pins CONTRACT_LINES line for line to
 * `public/source/prism_vulnerable.rs.txt`, which is itself guarded byte-for-byte
 * against `contract/` — so every line the demo can show, and the text the
 * closing note links to, cannot drift apart from what was deployed.
 *
 * Because it is verbatim, its comments are English: they are the file's own.
 * Chinese explanation lives in MARGIN_NOTES, beside the code rather than inside
 * it, so that "these are the real lines" and "a Chinese reader can follow it"
 * are both true.
 *
 * Page 2 shows an EXCERPT of this file, not all 64 lines: at a readable size 64
 * lines do not fit a 1280x820 viewport, and the demo is paged, not scrolled.
 * CONTRACT_EXCERPT names the ranges shown; every shown line is still this
 * file's own text, character for character, and the page labels the omission on
 * screen (see messages.ts `excerptScope` / `excerptElided`) so it never quietly
 * claims to be the whole file. The whole file is still linked, verbatim, from
 * the closing note.
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
 * what shows the reordering: read top to bottom, the stages come out 0, 1, 4, 5,
 * 2, 3. The accounts struct sits at the bottom of the file, yet its stages are
 * the second and third to execute — so the declaration is the last thing you
 * read and the third thing that happens. That gap is the reveal.
 *
 * S0 is the whole `initialize` function (indices 22-27): it creates the vault and
 * writes the admin's address into it, which is what every later stage refers back
 * to. It sits above `withdraw` in the file, so it opens the reading order.
 *
 * Indices are into CONTRACT_LINES and were taken from the real file, not
 * adjusted to fit: the previous listing was an excerpt, so every one of these
 * numbers moved when the excerpt became the whole file.
 */
export const CONTRACT_REGIONS: { stageId: string; from: number; to: number }[] = [
  { stageId: 'S0', from: 22, to: 27 },
  { stageId: 'S1', from: 29, to: 29 },
  { stageId: 'S4', from: 31, to: 35 },
  { stageId: 'S5', from: 36, to: 36 },
  { stageId: 'S2', from: 51, to: 54 },
  { stageId: 'S3', from: 55, to: 56 },
];

/**
 * The ranges page 2 shows, as indices into CONTRACT_LINES. Everything outside
 * them is elided on screen and marked as such.
 *
 * Two runs, chosen so that no stage region is split and the file's reading order
 * survives: the `#[program]` module with `initialize` and `withdraw` (which
 * carries stages S0, S1, S4 and S5), then the `Withdraw` accounts struct (S2 and
 * S3, the declaration the whole lesson turns on). Between and around them the
 * page prints "N lines elided", so a reader can tell they are reading sections
 * of a longer file rather than the entire thing.
 *
 * The leading run starts at 18 rather than at the top of the file: the crate
 * header comment and `declare_id!` above it are context, not the fault, and
 * including them is what pushed the listing past the fold. Lines 0-17 are marked
 * elided, not hidden.
 */
export const CONTRACT_EXCERPT: { from: number; to: number }[] = [
  { from: 18, to: 38 },
  { from: 50, to: 57 },
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
