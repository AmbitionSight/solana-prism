/**
 * steps.ts — the demo's state-machine vocabulary.
 *
 * Steps 1-4 are a narrated, auto-advancing sequence. Steps 5-9 are the
 * interactive tail: they wait for the user, from the attack through to the
 * same attack being refused by the fixed contract.
 */

export type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** The terminal step. The demo stops here and waits for the user. */
export const FINAL_STEP: Step = 9;

/** Attack sub-state within step 5. */
export type AttackState = 'idle' | 'showing-tx' | 'running' | 'done';

export type AttackOutcome = 'success' | 'rejected';

/** How long the transaction payload card stays on screen before the dot drops. */
export const TX_CARD_MS = 1200;

/** Auto-advance delays for the narrated steps. Steps 5-9 are absent: they are manual. */
export const AUTO_ADVANCE_MS: Partial<Record<Step, number>> = {
  1: 3000,
  // Long on purpose: the listing arrives first, then each region is boxed and
  // labelled with the stage it becomes, before the cards decompose.
  2: 9000,
  3: 5000,
  4: 5000,
};

/** The next step, or null when the narration has run out (step 9 is terminal). */
export function nextStep(step: Step): Step | null {
  return step < FINAL_STEP ? ((step + 1) as Step) : null;
}

/** Whether an attack against this build of the contract gets through. */
export function attackOutcome(isFixed: boolean): AttackOutcome {
  return isFixed ? 'rejected' : 'success';
}
