//! prism_owner_fixed — the same program, repaired.
//!
//! The whole fix is one declaration in `Withdraw`: `UncheckedAccount<'info>`
//! becomes `Account<'info, Credit>`. Anchor's `Account` has the runtime check
//! that the account is **owned by this program** before the handler runs, so a
//! credit manufactured by anyone else's program is refused at the door — the
//! handler never sees it.
//!
//! Compare with programs/prism_owner_vulnerable/src/lib.rs: identical except for
//! that line.

use anchor_lang::prelude::*;

declare_id!("BC5AtnTTYDfhrhxfng7JPUfoVwvcnvPrzuQsE7HpQW93");

#[program]
pub mod prism_owner_fixed {
    use super::*;

    pub fn open_vault(ctx: Context<OpenVault>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        Ok(())
    }

    pub fn open_credit(ctx: Context<OpenCredit>, amount: u64) -> Result<()> {
        let credit = &mut ctx.accounts.credit;
        credit.amount = amount;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let amount = ctx.accounts.credit.amount;

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

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: Account<'info, Vault>,
    /// The fix. Same data, same handler — now the owner is demanded by the
    /// declaration rather than left to luck.
    pub credit: Account<'info, Credit>,
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
