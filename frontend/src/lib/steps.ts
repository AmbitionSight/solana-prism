/**
 * steps.ts — the demo's state-machine vocabulary.
 *
 * Steps 1-4 are a narrated, auto-advancing sequence. Step 5 is the attack:
 * it waits for the user to press Execute, shows the transaction payload,
 * then runs the drop animation.
 */

export type Step = 1 | 2 | 3 | 4 | 5;

/** Attack sub-state within step 5. */
export type AttackState = 'idle' | 'showing-tx' | 'running' | 'done';

export type AttackOutcome = 'success' | 'rejected';

/** How long the transaction payload card stays on screen before the dot drops. */
export const TX_CARD_MS = 1200;

/** Auto-advance delays for the narrated steps. Step 5 is absent: it is manual. */
export const AUTO_ADVANCE_MS: Partial<Record<Step, number>> = {
  1: 3000,
  2: 4000,
  3: 5000,
  4: 5000,
};

/** The next step, or null when the narration has run out (step 5 is terminal). */
export function nextStep(step: Step): Step | null {
  return step < 5 ? ((step + 1) as Step) : null;
}

/** Whether an attack against this build of the contract gets through. */
export function attackOutcome(isFixed: boolean): AttackOutcome {
  return isFixed ? 'rejected' : 'success';
}
