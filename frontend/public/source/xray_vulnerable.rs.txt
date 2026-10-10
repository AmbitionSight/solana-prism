//! xray_vulnerable — the build the demo attacks.
//!
//! The `Withdraw` accounts struct declares `authority` as `AccountInfo<'info>`,
//! which asks the runtime for nothing at all. The handler then checks the
//! *address* by hand with `require!`, so anyone who knows the admin's address can
//! hand it over and sign the transaction themselves.
//!
//! This is the whole bug, and it is one line: the declaration at stage 3, not
//! the `require!` further down. Compare with programs/xray_fixed/src/lib.rs,
//! which differs only in that declaration.

use anchor_lang::prelude::*;

// Placeholder. `anchor keys sync` rewrites this from
// target/deploy/xray_vulnerable-keypair.json on the first build.
declare_id!("11111111111111111111111111111111");

#[program]
pub mod xray_vault {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.balance = 1000;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        // The address matches, so this passes — nobody ever checked who signed.
        require!(vault.authority == ctx.accounts.authority.key());
        vault.balance -= amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = authority, space = 8 + 32 + 8)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// The listing shown in step 2 of the demo is this struct verbatim.
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    /// CHECK: address only — no signature required. This is the bug.
    pub authority: AccountInfo<'info>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub balance: u64,
}
