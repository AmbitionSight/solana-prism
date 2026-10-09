/**
 * xray.ts — the two outcomes the demo claims, asserted against real Devnet.
 *
 * The demo animates a vault going from 1000 to 500 because an attacker passed
 * the admin's address without the admin's signature. These tests are the same
 * claim in executable form, and they are the reason the claim is not decoration:
 *
 *   1. vulnerable build — the attacker signs, the admin does not, and the
 *      withdrawal succeeds. The bug is recorded, not described.
 *   2. fixed build — the identical call is refused.
 *   3. fixed build — the admin signing for themselves still succeeds.
 *
 * (3) is what keeps (2) honest. A build that rejected every withdrawal would
 * also pass (2); (3) shows the repaired contract still works and rejects
 * specifically the impersonation.
 *
 * RUNNING THIS REQUIRES A BUILD AND A DEPLOYMENT:
 *
 *   anchor build
 *   anchor test --skip-local-validator --provider.cluster devnet
 *
 * Neither has been run on this repository yet — see contract/README.md. Until
 * they are, this file is a claim, not evidence.
 */

import * as anchor from '@coral-xyz/anchor';
import { BN, type Program } from '@coral-xyz/anchor';
import { Keypair, LAMPORTS_PER_SOL, SystemProgram } from '@solana/web3.js';
import { assert } from 'chai';
import type { XrayVault as VulnerableVault } from '../target/types/xray_vulnerable';
import type { XrayVault as FixedVault } from '../target/types/xray_fixed';

const STARTING_BALANCE = 1000;
const WITHDRAW_AMOUNT = 500;
const EXPECTED_AFTER = STARTING_BALANCE - WITHDRAW_AMOUNT;

describe('xray — missing signer check', () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const vulnerable = anchor.workspace.XrayVulnerable as Program<VulnerableVault>;
  const fixed = anchor.workspace.XrayFixed as Program<FixedVault>;

  const admin = Keypair.generate();
  const attacker = Keypair.generate();
  const vulnerableVault = Keypair.generate();
  const fixedVault = Keypair.generate();

  async function fund(keypair: Keypair) {
    const signature = await provider.connection.requestAirdrop(
      keypair.publicKey,
      LAMPORTS_PER_SOL,
    );
    await provider.connection.confirmTransaction(signature, 'confirmed');
  }

  before(async () => {
    await fund(admin);
    await fund(attacker);

    const accounts = (vault: Keypair) => ({
      vault: vault.publicKey,
      authority: admin.publicKey,
      systemProgram: SystemProgram.programId,
    });

    await vulnerable.methods
      .initialize()
      .accounts(accounts(vulnerableVault))
      .signers([vulnerableVault, admin])
      .rpc();

    await fixed.methods
      .initialize()
      .accounts(accounts(fixedVault))
      .signers([fixedVault, admin])
      .rpc();
  });

  it('both builds start from the balance the demo shows', async () => {
    const a = await vulnerable.account.vault.fetch(vulnerableVault.publicKey);
    const b = await fixed.account.vault.fetch(fixedVault.publicKey);
    assert.equal(a.balance.toNumber(), STARTING_BALANCE);
    assert.equal(b.balance.toNumber(), STARTING_BALANCE);
  });

  it('vulnerable: the attacker signs, the admin does not, and it succeeds', async () => {
    await vulnerable.methods
      .withdraw(new BN(WITHDRAW_AMOUNT))
      .accounts({
        vault: vulnerableVault.publicKey,
        // The admin's address is present...
        authority: admin.publicKey,
      })
      // ...but the only signature on this transaction is the attacker's.
      .signers([attacker])
      .rpc();

    const vault = await vulnerable.account.vault.fetch(vulnerableVault.publicKey);
    assert.equal(
      vault.balance.toNumber(),
      EXPECTED_AFTER,
      'the vault should have been drained without the admin ever signing',
    );
  });

  it('fixed: the same call is refused', async () => {
    let failure: unknown;
    try {
      await fixed.methods
        .withdraw(new BN(WITHDRAW_AMOUNT))
        .accounts({
          vault: fixedVault.publicKey,
          authority: admin.publicKey,
        })
        .signers([attacker])
        .rpc();
    } catch (error) {
      failure = error;
    }

    assert.isDefined(failure, 'the repaired build accepted a call the admin never signed');
    assert.match(String(failure), /signer|signature/i);
  });

  it('fixed: the admin withdrawing for themselves still works', async () => {
    await fixed.methods
      .withdraw(new BN(WITHDRAW_AMOUNT))
      .accounts({
        vault: fixedVault.publicKey,
        authority: admin.publicKey,
      })
      .signers([admin])
      .rpc();

    const vault = await fixed.account.vault.fetch(fixedVault.publicKey);
    assert.equal(
      vault.balance.toNumber(),
      EXPECTED_AFTER,
      'the repaired build must reject the impersonation, not every withdrawal',
    );
  });
});
