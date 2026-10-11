/**
 * ownerRun.ts — one ownership attack, minus anything that needs a browser.
 *
 * Lesson one's run is a scan (which pool vault?) followed by one `withdraw`.
 * Lesson two's is different in two ways, and both are here rather than in an
 * `onClick`:
 *
 * 1. **There is one vault, and it is a PDA.** Lesson one's pool holds hundreds
 *    of vaults so a run never has to be the first; lesson two has a single
 *    account at `[b"vault"]`, and a successful attack empties it. So a run first
 *    makes sure that account exists and holds enough — opening it and topping it
 *    up when it was drained by an earlier run — and only then attacks. This is
 *    the honest shape of a single-vault demo, not a workaround: the chain says
 *    what the vault holds, and the run acts on that.
 * 2. **The attack is two instructions, not one.** A credit cannot simply be
 *    asserted into existence: it has to be *written* by the program that owns
 *    it, which is the attacker's counterfeit program. So the transaction forges
 *    the account and withdraws it in the same message.
 *
 * Everything is injected — the vault read and the ports — so every branch below
 * runs in a unit test, and this module touches neither React nor a connection.
 */

import type { Keypair, PublicKey } from '@solana/web3.js';
import type { AttackOutcome, PollOptions, StatusPort } from './chainRun';
import { awaitOutcome } from './chainRun';
import { planOwnerRun, type OwnerRunConfig, type OwnerTarget } from './ownerChain';

/** What the chain says about the one vault, before a run decides anything. */
export interface OwnerVaultState {
  exists: boolean;
  lamports: number;
}

/** Reads the vault account. Injected so the run can be tested without a chain. */
export type OwnerVaultReader = (vault: PublicKey) => Promise<OwnerVaultState>;

/**
 * Everything a run does that needs a connection.
 *
 * `ensureVault` is allowed to send transactions of its own (opening the account,
 * funding it) and may do nothing at all when the vault is already ready; it
 * resolves once whatever it did has settled. `forgeAndWithdraw` returns the
 * signature even when the transaction is doomed — that is the contract
 * `chainRun.ts` depends on, and here it is what makes the refusal evidence.
 */
export interface OwnerPorts extends StatusPort {
  latestBlockhash(): Promise<string>;
  ensureVault(input: { programId: PublicKey; vault: PublicKey; amount: number }): Promise<void>;
  forgeAndWithdraw(target: OwnerTarget, blockhash: string): Promise<string>;
}

export interface OwnerRunDeps {
  config: OwnerRunConfig;
  /** The vault to attack: the PDA under the selected build's program. */
  vault: PublicKey;
  /** A fresh keypair for the forged credit. `init` needs a signer that is new. */
  creditKeypair: Keypair;
  /** The fee payer, the recipient, and the only signer on the attack. */
  recipient: PublicKey;
  readVault: OwnerVaultReader;
  ports: OwnerPorts;
  poll?: PollOptions;
  cancelled?: () => boolean;
}

export interface OwnerRunHooks {
  /** Called only when there is a real target, and only once. */
  onTarget: (target: OwnerTarget) => void;
  /** Called exactly once, with the outcome. */
  onResult: (result: AttackOutcome | { kind: 'notConfigured' }) => void;
}

/** An exception's own words. Nothing here decides whether it was a refusal. */
function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Plan, prepare, attack — and report what the chain did.
 *
 * The order matters. `onTarget` fires before the setup so the page has its
 * payload as soon as there is something to do; but the *attack* does not go out
 * until the vault is known to hold enough, because a withdrawal from an account
 * that is not there proves nothing about the owner check.
 */
export async function executeOwnerRun(
  deps: OwnerRunDeps,
  hooks: OwnerRunHooks,
): Promise<void> {
  const plan = planOwnerRun(deps.config, deps.vault, deps.creditKeypair, deps.recipient);
  if (plan.kind !== 'run') {
    hooks.onResult({ kind: 'notConfigured' });
    return;
  }

  if (deps.cancelled?.()) return;
  hooks.onTarget(plan.target);

  // Only the vulnerable build is ever drained, so only it needs preparing. The
  // repaired build refuses every attempt, so its vault never moves and is always
  // there — a failure to *read* it would be the RPC's, not the demo's.
  if (!deps.config.isFixed) {
    try {
      await deps.ports.ensureVault({
        programId: plan.target.programId,
        vault: plan.target.vault,
        amount: plan.target.amount,
      });
    } catch (error) {
      if (deps.cancelled?.()) return;
      hooks.onResult({ kind: 'failed', reason: describe(error) });
      return;
    }
  }

  if (deps.cancelled?.()) return;

  let signature: string;
  try {
    const blockhash = await deps.ports.latestBlockhash();
    signature = await deps.ports.forgeAndWithdraw(plan.target, blockhash);
  } catch (error) {
    if (deps.cancelled?.()) return;
    hooks.onResult({ kind: 'failed', reason: describe(error) });
    return;
  }

  hooks.onResult(await awaitOutcome(deps.ports, signature, deps.poll));
}
