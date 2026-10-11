//! prism_owner_vulnerable — the build lesson two attacks.
//!
//! The `Withdraw` accounts struct declares `credit` as `UncheckedAccount<'info>`,
//! which asks the runtime for nothing — **not even that the account belongs to
//! this program**. The handler then deserializes the credit and pays out of the
//! vault on its word.
//!
//! That is the whole bug, and it is one line: the declaration at stage 3. An
//! account's *data* is not its identity; its **owner** is. `Account<'info,
//! Credit>` would have had the runtime check that before the handler ran.
//! Compare with programs/prism_owner_fixed/src/lib.rs, which differs only in
//! that declaration.
//!
//! Unlike lesson one, the vault here holds **real lamports**: `withdraw` moves
//! them, so the theft is a transfer rather than a number changing in a field.

use anchor_lang::prelude::*;

// The real address, written by `anchor keys sync` from
// target/deploy/prism_owner_vulnerable-keypair.json. Anchor derives `#[account]`'s
// Owner from this, so it has to match the keypair the program is built with.
declare_id!("38hLgAJyNUnRiZvWVWAwTwt9cZMA6wzyPQm3QQDAdWJL");

#[program]
pub mod prism_owner_vulnerable {
    use super::*;

    /// The protocol opens its vault. `authority` becomes the only key allowed to
    /// mint credit, and the vault's lamports are what withdrawals pay from.
    pub fn open_vault(ctx: Context<OpenVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        Ok(())
    }

    /// The protocol writes a credit against a claimant. This side is correct:
    /// only the vault's authority may mint, and the account is created by this
    /// program, so the program owns it.
    pub fn open_credit(ctx: Context<OpenCredit>, amount: u64) -> Result<()> {
        let credit = &mut ctx.accounts.credit;
        credit.amount = amount;
        Ok(())
    }

    /// Pay a credit out of the vault, in lamports.
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        // The address matches, so this passes — nobody ever asked who owns the
        // account this number came out of.
        let credit = Credit::try_deserialize(&mut &ctx.accounts.credit.data.borrow()[..])?;
        let amount = credit.amount;

        let vault = ctx.accounts.vault.to_account_info();
        require!(vault.lamports() >= amount, VaultError::InsufficientFunds);

        **vault.try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.recipient.to_account_info().try_borrow_mut_lamports()? += amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct OpenVault<'info> {
    #[account(init, payer = authority, space = 8 + 32, seeds = [b"vault"], bump)]
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct OpenCredit<'info> {
    #[account(init, payer = authority, space = 8 + 8)]
    pub credit: Account<'info, Credit>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(seeds = [b"vault"], bump, has_one = authority)]
    pub vault: Account<'info, Vault>,
    pub system_program: Program<'info, System>,
}

/// The listing shown in lesson two is this struct verbatim.
#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: Account<'info, Vault>,
    /// CHECK: data only — the owner is never checked. This is the bug.
    pub credit: UncheckedAccount<'info>,
    #[account(mut)]
    pub recipient: Signer<'info>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
}

#[account]
pub struct Credit {
    pub amount: u64,
}

#[error_code]
pub enum VaultError {
    #[msg("The vault does not hold that much.")]
    InsufficientFunds,
}
