/**
 * demoTarget.ts — what the animated path shows without a wallet.
 *
 * The card used to name `7xKm…9mPQ` and `ADMiN…x7wQ`: a transaction that does
 * not exist, illustrating the demo's one genuinely load-bearing sentence. Now
 * the animated path names the same things a real run would — the deployed
 * program, the real ADMIN address, and an address that really is in the pool.
 *
 * The vault address is derived locally (`vaultAddress`), so it needs no network
 * to be real. Only *which* index is still fresh needs the chain, and that is the
 * one thing that degrades gracefully: with no reader we name index 0, which is
 * a real pool vault even if a previous visitor has already drained it.
 */

import { PublicKey } from '@solana/web3.js';
import { vaultAddress, nextFreshVault, type VaultReader } from './devnet';
import { VERIFICATION, isFilled } from '../config/verification';

/** Which pool vault the animated path names when the chain cannot be read. */
export const FALLBACK_VAULT_INDEX = 0;

export interface DemoTarget {
  programId: string;
  vault: string;
  authority: string;
}

export async function resolveDemoTarget(read: VaultReader | null): Promise<DemoTarget> {
  const authority = VERIFICATION.adminPubkey;
  const base = {
    programId: VERIFICATION.vulnerableProgramId,
    authority,
  };

  if (!read || !isFilled(authority)) {
    return { ...base, vault: vaultAddress(FALLBACK_VAULT_INDEX).toBase58() };
  }

  try {
    const index = await nextFreshVault(read, new PublicKey(authority), VERIFICATION.poolSize);
    return { ...base, vault: vaultAddress(index ?? FALLBACK_VAULT_INDEX).toBase58() };
  } catch {
    // An unreachable RPC is the ordinary case, not an error worth surfacing:
    // the fallback address is real, and the card's job is to name real things.
    return { ...base, vault: vaultAddress(FALLBACK_VAULT_INDEX).toBase58() };
  }
}
