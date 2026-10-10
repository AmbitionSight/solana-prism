/**
 * demoTarget.ts — what the animated path shows without a wallet.
 *
 * The card used to name `7xKm…9mPQ` and `ADMiN…x7wQ`: a transaction that does
 * not exist, illustrating the demo's one genuinely load-bearing sentence. Now
 * the animated path names the same things a real run would — the deployed
 * program, the real ADMIN address, and an address that really is in the pool.
 *
 * The vault address is derived locally (`vaultAddress`), so it needs no network
 * to be real. Only *which* index is fresh needs the chain, and that is the one
 * thing that degrades. Three outcomes, each reported as itself:
 *
 * - **`target`** — there is something honest to name. With no reader (or an
 *   unreachable RPC) we name index 0: a real pool vault whose freshness is
 *   simply unknown, since a previous visitor may already have drained it. It is
 *   never fake, and with no reader we genuinely cannot know which vault is
 *   fresh; a real address is the honest degradation.
 * - **`exhausted`** — the scan ran and found nothing fresh, so the pool is used
 *   up. This is the one case where we *know* index 0 holds 500, so naming it and
 *   then animating 1000 -> 500 beneath it would be a lie. It is reported as
 *   itself instead, telling the same story the real run's `exhausted` tells.
 * - **`notConfigured`** — no admin address is set, so no authority could be
 *   honest and nothing is named at all.
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

/**
 * The values `resolveDemoTarget` reads, taken as a parameter so the states this
 * repository is not currently in — an unset admin, an empty pool — stay
 * testable. `VERIFICATION` satisfies it and is the default, so call sites that
 * only want the real config need not pass anything.
 */
export interface DemoTargetConfig {
  vulnerableProgramId: string;
  adminPubkey: string;
  poolSize: number;
}

export type DemoTargetResolution =
  | { kind: 'target'; target: DemoTarget }
  /** The pool is used up — a real state, reported as itself, never papered over. */
  | { kind: 'exhausted' }
  /** No admin address is configured, so no authority could be honest. */
  | { kind: 'notConfigured' };

export async function resolveDemoTarget(
  read: VaultReader | null,
  config: DemoTargetConfig = VERIFICATION,
): Promise<DemoTargetResolution> {
  // Checked before `new PublicKey(...)` and before the scan, exactly as
  // `planChainRun` orders its guards: a placeholder authority must never become
  // an address or drive a lookup.
  if (!isFilled(config.adminPubkey)) return { kind: 'notConfigured' };

  const base = {
    programId: config.vulnerableProgramId,
    authority: config.adminPubkey,
  };
  const fallback: DemoTarget = {
    ...base,
    vault: vaultAddress(FALLBACK_VAULT_INDEX).toBase58(),
  };

  if (!read) return { kind: 'target', target: fallback };

  try {
    const index = await nextFreshVault(read, new PublicKey(config.adminPubkey), config.poolSize);
    if (index === null) return { kind: 'exhausted' };
    return { kind: 'target', target: { ...base, vault: vaultAddress(index).toBase58() } };
  } catch {
    // `nextFreshVault` already handles per-vault decode failures internally, so
    // the only things that reach here are a rejected `read()` — an unreachable
    // RPC is the ordinary case — or a malformed-but-filled `adminPubkey` that
    // `PublicKey` rejects. Neither is worth surfacing: the fallback is real.
    return { kind: 'target', target: fallback };
  }
}
