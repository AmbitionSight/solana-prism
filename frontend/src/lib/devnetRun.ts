/**
 * devnetRun.ts — one real run: which vault, which program, and what to say when
 * there is nothing to attack.
 *
 * The whole file exists because those are decisions, and a decision buried in an
 * `onClick` cannot be tested without a browser. Everything here is pure: the
 * account read is injected, the ports are injected, and nothing touches React.
 *
 * Two shapes of problem, deliberately not treated alike (spec §4.2, §6):
 *
 * - **Vulnerable.** Each successful attack moves a vault from 1000 to 500, so the
 *   run needs the pool scan. When the scan finds nothing, the run *ends* — the
 *   pool being finite is a real state and is reported, never papered over with a
 *   fabricated success.
 * - **Fixed.** Every attempt is refused, so its vault is never consumed and there
 *   is nothing to scan for: one vault, outside the pool, reused forever. Aiming a
 *   fixed-build call at a pool vault would be refused for the account-owner
 *   reason before any signer is checked, which would look like the lesson while
 *   proving nothing.
 *
 * `failed` therefore never means "the program refused". A submission that never
 * happened is reported as `failed` with its own reason, and only a transaction
 * the cluster actually rejected becomes `rejected`.
 */

import { PublicKey } from '@solana/web3.js';
import {
  ATTACK_AMOUNT,
  FIXED_VAULT_INDEX,
  nextFreshVault,
  vaultAddress,
  type VaultReader,
} from './devnet';
import type { AttackOutcome, AttackPorts, PollOptions } from './chainRun';
import { runAttack } from './chainRun';
import { isFilled } from '../config/verification';

export interface ChainPlanConfig {
  /** Which build the user selected — the only input that changes the target. */
  isFixed: boolean;
  vulnerableProgramId: string;
  fixedProgramId: string;
  /** The pool's authority: the ADMIN public key. `PENDING` until the pool exists. */
  adminPubkey: string;
  /** How far to scan. Kept equal to `lib/devnet.ts`'s `POOL_SIZE` by a test. */
  poolSize: number;
}

export interface ChainTarget {
  programId: PublicKey;
  vault: PublicKey;
  authority: PublicKey;
  amount: number;
}

export type ChainPlan =
  | { kind: 'run'; target: ChainTarget }
  /** The pool is used up. A real state, reported as itself. */
  | { kind: 'exhausted' }
  /** The selected build has no program id yet, so there is nothing to call. */
  | { kind: 'notDeployed' }
  /** The pool's authority is not known yet, so no address could be honest. */
  | { kind: 'notConfigured' };

/**
 * What one attempt produced.
 *
 * `success` / `rejected` / `failed` are `chainRun.ts`'s verdicts, passed through
 * untouched; `exhausted` and `notConfigured` mean no transaction was built at
 * all, which is why they are separate kinds rather than a `failed` with a
 * suggestive reason.
 */
export type ChainResult = AttackOutcome | { kind: 'exhausted' } | { kind: 'notConfigured' };

/** The three ways a run can be reported on screen. */
export type RunVerdict = 'success' | 'rejected' | 'failed';

export interface RunVerdictView {
  /** What the result panel should say, or null when there is nothing to say. */
  verdict: RunVerdict | null;
  /** This run's signature, when the transaction exists on the chain. */
  signature?: string;
  /** The cluster's own words, shown as evidence rather than translated. */
  detail?: string;
}

/**
 * Turn a result into what the page shows.
 *
 * The one thing this must never do is promote `failed` into `rejected`: a
 * submission that never happened says nothing about the program, and dressing it
 * up as a refusal would turn a wallet's hesitation into a security finding.
 * `exhausted` has no verdict at all — the report is that there was nothing to
 * attack, which the run control says in its own words.
 */
export function verdictOf(result: ChainResult): RunVerdictView {
  switch (result.kind) {
    case 'success':
      return { verdict: 'success', signature: result.signature, detail: undefined };
    case 'rejected':
      return { verdict: 'rejected', signature: result.signature, detail: result.reason };
    case 'failed':
      return { verdict: 'failed', signature: undefined, detail: result.reason };
    case 'notConfigured':
      return { verdict: 'failed', signature: undefined, detail: undefined };
    case 'exhausted':
      return { verdict: null, signature: undefined, detail: undefined };
  }
}

/** What the run control says while it waits. */
export type RunStatus =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'exhausted' }
  | { kind: 'failed'; detail?: string };

/**
 * Which of those the control shows.
 *
 * `attacked` says whether a transaction was ever built, which is what decides
 * *where* an outcome is reported: once an attack is under way the run has an
 * animation and a result panel, and repeating the verdict next to the button
 * would be a second voice for the same finding. Before that point — an empty
 * pool, an unreachable RPC, a missing key — there is no animation to hang it
 * under, so the control is the only honest place for it.
 */
export function controlStatus(
  result: ChainResult | null,
  attacked: boolean,
  busy: boolean,
): RunStatus {
  if (busy) return { kind: 'busy' };
  if (!result) return { kind: 'idle' };

  const { verdict, detail } = verdictOf(result);
  if (verdict === null) return { kind: 'exhausted' };
  if (attacked) return { kind: 'idle' };
  return verdict === 'failed' ? { kind: 'failed', detail } : { kind: 'idle' };
}

/** Decide what to attack, or why nothing can be attacked. */
export async function planChainRun(
  config: ChainPlanConfig,
  read: VaultReader,
): Promise<ChainPlan> {
  const programIdBase58 = config.isFixed ? config.fixedProgramId : config.vulnerableProgramId;
  if (!isFilled(programIdBase58)) return { kind: 'notDeployed' };

  // Checked before `new PublicKey(...)` so a placeholder can never become an
  // address, and before the scan so a bogus authority never drives a lookup.
  if (!isFilled(config.adminPubkey)) return { kind: 'notConfigured' };

  const programId = new PublicKey(programIdBase58);
  const authority = new PublicKey(config.adminPubkey);

  if (config.isFixed) {
    return {
      kind: 'run',
      target: {
        programId,
        vault: vaultAddress(FIXED_VAULT_INDEX),
        authority,
        amount: ATTACK_AMOUNT,
      },
    };
  }

  const index = await nextFreshVault(read, authority, config.poolSize);
  if (index === null) return { kind: 'exhausted' };

  return {
    kind: 'run',
    target: { programId, vault: vaultAddress(index), authority, amount: ATTACK_AMOUNT },
  };
}

export interface ChainRunDeps {
  config: ChainPlanConfig;
  read: VaultReader;
  /** Built from the plan, because the program id depends on which build was chosen. */
  portsFor: (programId: PublicKey) => AttackPorts;
  poll?: PollOptions;
  /**
   * Asked after planning and before anything is submitted.
   *
   * A page that has moved on — Replay, a build switch, or the animated Execute —
   * must not fire a transaction it will then refuse to show. Planning can take a
   * while (the pool scan is one RPC read per vault), and a run that lands after
   * the viewer has left is a real transaction with no story attached to it.
   */
  cancelled?: () => boolean;
}

export interface ChainRunHooks {
  /** Called only when there is something real to submit. */
  onTarget: (target: ChainTarget) => void;
  /** Called exactly once, with the outcome — including the two no-attempt kinds. */
  onResult: (result: ChainResult) => void;
}

/**
 * Plan a run and, when there is one, submit it.
 *
 * The two hooks are the seam the UI hangs off: `onTarget` is what may start the
 * animation, and `onResult` is what ends it. Nothing here decides how the page
 * looks, and nothing here reports a refusal that did not happen.
 */
export async function executeChainRun(
  deps: ChainRunDeps,
  hooks: ChainRunHooks,
): Promise<void> {
  const plan = await planChainRun(deps.config, deps.read);

  if (plan.kind === 'exhausted') {
    hooks.onResult({ kind: 'exhausted' });
    return;
  }
  if (plan.kind !== 'run') {
    // `notDeployed` reaching here means the entry point was rendered for a build
    // with no program id, which the UI prevents; both map to the same honest
    // answer, which is that no transaction was made.
    hooks.onResult({ kind: 'notConfigured' });
    return;
  }

  // Nothing has been sent yet, so a page that has moved on can still be
  // honoured: no transaction, and no callback claiming one happened.
  if (deps.cancelled?.()) return;

  hooks.onTarget(plan.target);

  const result = await runAttack(
    deps.portsFor(plan.target.programId),
    {
      vault: plan.target.vault.toBase58(),
      authority: plan.target.authority.toBase58(),
      amount: plan.target.amount,
    },
    deps.poll,
  );

  hooks.onResult(result);
}
