//! prism_fixed — the same contract, repaired.
//!
//! Identical to prism_vulnerable except for ONE line: `Withdraw.authority` is
//! declared `Signer<'info>` instead of `AccountInfo<'info>`.
//!
//! That is the lesson of the demo. The runtime enforces a declared constraint
//! before the handler ever runs, so the signature is now required for free; the
//! hand-written `require!` below is still there, and still only works because
//! somebody remembered to write it. Declared constraints are enforced by the
//! platform, hand-written ones by discipline.
//!
//! Note what this does NOT do: it does not remove the `require!`. `Signer`
//! proves *somebody* signed this account, not that they are the admin. Both
//! checks are needed — the declaration stops the attacker from passing an
//! address they cannot sign for, the `require!` stops a legitimate signer from
//! draining someone else's vault.

use anchor_lang::prelude::*;

// The real address, written by `anchor keys sync` from
// target/deploy/prism_fixed-keypair.json. Anchor derives `#[account]`'s Owner
// from this, so it has to match the keypair the program is built with.
declare_id!("9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq");

#[program]
pub mod prism_fixed {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.balance = 1000;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            vault.authority == ctx.accounts.authority.key(),
            ErrorCode::RequireViolated
        );
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

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
    /// The fix. Same address, same handler — now the signature is demanded by
    /// the declaration rather than hoped for in the body.
    pub authority: Signer<'info>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub balance: u64,
}
