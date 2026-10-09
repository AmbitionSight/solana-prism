/**
 * keyframes.ts — generates the attack animations as CSS text.
 *
 * The spec's iron rule is that no animation coordinate may be written by hand
 * in CSS. Building the keyframes here, from geometry.ts and the layer config,
 * is what makes that rule enforceable: the accompanying test asserts that every
 * `translateY` value produced here is one geometry can also produce.
 *
 * Both paths share the descent waypoints so the fixed run reads as the same
 * fall, stopped early.
 */

import { LAYER_GAP, blockedY, dropStartY, layerMidY, stackHeight } from './geometry';
import { VAULT_LAYERS } from '../config/layers';

export const VULNERABLE_ANIMATION = 'attack-vulnerable';
export const FIXED_ANIMATION = 'attack-blocked';
export const DANGER_PULSE_ANIMATION = 'layer-hit-danger';
export const SUCCESS_PULSE_ANIMATION = 'layer-hit-success';

/** Duration of the drop. Also drives the layer pulse, so the two stay in step. */
export const ATTACK_MS = 2400;

const COUNT = VAULT_LAYERS.length;

/** Index of the access-control layer, derived from the data rather than assumed. */
export const SECURITY_INDEX = VAULT_LAYERS.findIndex(
  (layer) => layer.isSecurityLayer && layer.broken,
);

/**
 * Where the dot's centre comes to rest when the security layer refuses it.
 *
 * Note this is the contact point itself — deliberately NOT `blockedY + LAYER_HEIGHT`,
 * which would put the dot's centre 56px *inside* the security layer and read as
 * though the attack had got through. The topmost layer has no room above it, so
 * this path requires the security layer to be at index >= 1.
 */
export const IMPACT_Y = blockedY(SECURITY_INDEX);

/** Upward travel of the first bounce and of the damped second bounce. */
export const BOUNCE_PX = 16;
export const SECOND_BOUNCE_PX = 8;

/** y just past the bottom of the stack — where the dot leaves having got through. */
export const EXIT_Y = stackHeight(COUNT) + LAYER_GAP;

/** Percentage of the drop at which the dot reaches each layer's centre. */
const DESCENT_FIRST_PCT = 15;
const DESCENT_LAST_PCT = 75;
const DESCENT_STEP_PCT = (DESCENT_LAST_PCT - DESCENT_FIRST_PCT) / (COUNT - 1);

/** When the dot reaches layer `index` on its way down. */
function descentPct(index: number): number {
  return DESCENT_FIRST_PCT + DESCENT_STEP_PCT * index;
}

/** When the dot reaches the security layer on the path that gets through. */
export const VULNERABLE_HIT_PCT = descentPct(SECURITY_INDEX);

/** When it strikes — and is refused by — the security layer on the fixed path. */
export const FIXED_HIT_PCT = 52;
export const FIXED_HIT2_PCT = 78;

function at(percentage: number, body: string): string {
  return `${percentage}%{${body}}`;
}

/** Ring colours and spread live in global.css, so this file holds no px at all. */
const RING_DANGER = 'box-shadow:0 0 0 var(--ring-spread) var(--ring-danger)';
const RING_SUCCESS = 'box-shadow:0 0 0 var(--ring-spread) var(--ring-success)';

function moveTo(y: number, extra = ''): string {
  return `transform:translateY(${y}px)${extra}`;
}

export function vulnerableKeyframes(): string {
  const descent = VAULT_LAYERS.map((_, index) =>
    at(descentPct(index), moveTo(layerMidY(index))),
  ).join('');

  return [
    `@keyframes ${VULNERABLE_ANIMATION}{`,
    at(0, `${moveTo(dropStartY())};opacity:0`),
    at(5, 'opacity:1'),
    descent,
    at(85, moveTo(EXIT_Y, ' scale(1.5)')),
    at(100, moveTo(EXIT_Y, ' scale(3)')),
    '}',
  ].join('');
}

export function fixedKeyframes(): string {
  const approach = VAULT_LAYERS.slice(0, SECURITY_INDEX)
    .map((_, index) => at(descentPct(index), moveTo(layerMidY(index))))
    .join('');

  const bounce1 = IMPACT_Y - BOUNCE_PX;
  const bounce2 = IMPACT_Y - SECOND_BOUNCE_PX;

  return [
    `@keyframes ${FIXED_ANIMATION}{`,
    at(0, `${moveTo(dropStartY())};opacity:0`),
    at(6, 'opacity:1'),
    approach,
    at(FIXED_HIT_PCT, moveTo(IMPACT_Y)),
    at(64, moveTo(bounce1)),
    at(FIXED_HIT2_PCT, moveTo(IMPACT_Y)),
    // opacity:1 is restated here on purpose. CSS interpolates opacity between
    // the frames that declare it, so without this the fade would start at 6%
    // and the dot would reach both impacts as a ghost — exactly the two bounces
    // the fixed path exists to show.
    at(88, `${moveTo(bounce2)};opacity:1`),
    at(100, `${moveTo(bounce2)};opacity:0`),
    '}',
  ].join('');
}

/** The security-layer flash when the dot passes straight through it. */
export function dangerPulseKeyframes(): string {
  return [
    `@keyframes ${DANGER_PULSE_ANIMATION}{`,
    at(0, 'box-shadow:var(--shadow-card)'),
    at(VULNERABLE_HIT_PCT - 10, 'box-shadow:var(--shadow-card)'),
    at(VULNERABLE_HIT_PCT, RING_DANGER),
    at(100, 'box-shadow:var(--shadow-card)'),
    '}',
  ].join('');
}

/** The security-layer flash on each of the two impacts that refuse the dot. */
export function successPulseKeyframes(): string {
  const rest = 'box-shadow:var(--shadow-card)';

  return [
    `@keyframes ${SUCCESS_PULSE_ANIMATION}{`,
    at(0, rest),
    at(FIXED_HIT_PCT - 10, rest),
    at(FIXED_HIT_PCT, RING_SUCCESS),
    at(FIXED_HIT_PCT + 6, rest),
    at(FIXED_HIT2_PCT - 10, rest),
    at(FIXED_HIT2_PCT, RING_SUCCESS),
    at(100, rest),
    '}',
  ].join('');
}
