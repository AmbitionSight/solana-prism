/**
 * keyframes.ts — generates the attack animations as CSS text.
 *
 * The spec's iron rule is that no animation coordinate may be written by hand
 * in CSS. Building the keyframes here, from geometry.ts and the layer config,
 * is what makes that rule enforceable: the accompanying test asserts that every
 * `translateY` value produced here is one geometry can also produce.
 *
 * GRAVITY. A falling object covers equal distance in ever-shorter time, so evenly
 * spaced waypoints read as a lift descending on rails. The obvious fix —
 * `animation-timing-function: ease-in` — does not work: that function restarts
 * between every pair of keyframes, so the dot would visibly stutter. Instead the
 * waypoints are spaced by the *square root of distance travelled* and the timing
 * function is linear, which lets the spacing alone produce the acceleration.
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

/** Index of the account-declaration stage, derived from the data rather than assumed. */
export const SECURITY_INDEX = VAULT_LAYERS.findIndex(
  (layer) => layer.isSecurityLayer && layer.broken,
);

/**
 * Where the dot's centre comes to rest when the account declaration refuses it.
 *
 * Note this is the contact point itself — deliberately NOT `blockedY + LAYER_HEIGHT`,
 * which would put the dot's centre 56px *inside* the declaration and read as
 * though the attack had got through. The topmost stage has no room above it, so
 * this path requires the security stage to be at index >= 1.
 */
export const IMPACT_Y = blockedY(SECURITY_INDEX);

/** Upward travel of the first bounce and of the damped second bounce. */
export const BOUNCE_PX = 16;
export const SECOND_BOUNCE_PX = 8;

/** y just past the bottom of the stack — where the dot leaves having got through. */
export const EXIT_Y = stackHeight(COUNT) + LAYER_GAP;

/* The descent occupies a slice of each animation, leaving room for the entry
   fade and the exit. Declared up here because VULNERABLE_HIT_PCT is computed at
   module load and would otherwise hit the temporal dead zone. */

/** The path that gets through. */
const VULNERABLE_FROM = 0.16;
const VULNERABLE_TO = 0.8;

/** The path that is refused. */
const FIXED_FROM = 0.05;
export const FIXED_HIT_PCT = 62;
export const FIXED_HIT2_PCT = 82;
const FIXED_BOUNCE1_PCT = 72;
const FIXED_BOUNCE2_PCT = 90;

/** Fraction of the drop a falling object has covered after travelling `travelled`. */
function fallFraction(travelled: number, total: number): number {
  return Math.sqrt(Math.max(0, travelled) / total);
}

/** How many slices the descent is cut into, so the curve is smooth not piecewise. */
const DESCENT_SLICES = 24;

/**
 * The descent as keyframes: sampled evenly in *distance*, then placed at
 * √distance, which is what turns a set of waypoints into a fall.
 *
 * Sampling only at the stage centres is not enough — the hop from the drop point
 * to the first stage is one long linear segment, which reads as the dot hanging
 * still before it suddenly drops. The stage centres are always kept exactly,
 * because the layer pulse syncs to those percentages.
 */
function descentFrames(fromY: number, toY: number, fromPct: number, toPct: number): string {
  const total = toY - fromY;
  const layerYs = VAULT_LAYERS.map((_, index) => layerMidY(index));
  const isLayerY = new Set(layerYs);
  const byPct = new Map<number, { y: number; isLayer: boolean }>();

  const add = (y: number) => {
    if (y < fromY || y > toY) return;
    const t = fallFraction(y - fromY, total);
    const pct = round((fromPct + (toPct - fromPct) * t) * 100);
    const isLayer = isLayerY.has(y);
    const existing = byPct.get(pct);
    // A stage centre wins any tie: the pulse has to land on the same percentage.
    if (!existing || (isLayer && !existing.isLayer)) byPct.set(pct, { y, isLayer });
  };

  add(fromY);
  add(toY);
  for (let i = 1; i < DESCENT_SLICES; i++) add(fromY + (total * i) / DESCENT_SLICES);
  for (const y of layerYs) add(y);

  return [...byPct.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([pct, entry]) => at(pct, moveTo(entry.y)))
    .join('');
}

/** When the dot reaches stage `index` on the path that gets through. */
export function vulnerableHitPct(): number {
  const start = dropStartY();
  const total = EXIT_Y - start;
  const t = fallFraction(layerMidY(SECURITY_INDEX) - start, total);
  return round((VULNERABLE_FROM + (VULNERABLE_TO - VULNERABLE_FROM) * t) * 100);
}

/**
 * When the dot reaches the declaration stage on the path that gets through.
 *
 * Rounded to match what `at()` writes into the CSS — the tests compare this
 * against the generated text, so an unrounded value here would never match.
 */
export const VULNERABLE_HIT_PCT = vulnerableHitPct();

function at(percentage: number, body: string): string {
  return `${round(percentage)}%{${body}}`;
}

/** Two decimals is plenty, and keeps the generated CSS readable. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function moveTo(y: number, extra = ''): string {
  return `transform:translateY(${y}px)${extra}`;
}

/** Ring colours and spread live in global.css, so this file holds no px at all. */
const RING_DANGER = 'box-shadow:0 0 0 var(--ring-spread) var(--ring-danger)';
const RING_SUCCESS = 'box-shadow:0 0 0 var(--ring-spread) var(--ring-success)';

export function vulnerableKeyframes(): string {
  return [
    `@keyframes ${VULNERABLE_ANIMATION}{`,
    at(0, `${moveTo(dropStartY())};opacity:0`),
    at(5, 'opacity:1'),
    descentFrames(dropStartY(), EXIT_Y, VULNERABLE_FROM, VULNERABLE_TO),
    at(85, moveTo(EXIT_Y, ' scale(1.5)')),
    at(100, moveTo(EXIT_Y, ' scale(3)')),
    '}',
  ].join('');
}

export function fixedKeyframes(): string {
  const bounce1 = IMPACT_Y - BOUNCE_PX;
  const bounce2 = IMPACT_Y - SECOND_BOUNCE_PX;

  return [
    `@keyframes ${FIXED_ANIMATION}{`,
    at(0, `${moveTo(dropStartY())};opacity:0`),
    at(4, 'opacity:1'),
    descentFrames(dropStartY(), IMPACT_Y, FIXED_FROM, FIXED_HIT_PCT / 100),
    at(FIXED_HIT_PCT, moveTo(IMPACT_Y)),
    // Squash on contact, then recover: the dot flattens against what stopped it.
    at(FIXED_HIT_PCT + 2, `${moveTo(IMPACT_Y)} scale(1.32, 0.68)`),
    at(FIXED_HIT_PCT + 4.5, `${moveTo(IMPACT_Y)} scale(1, 1)`),
    at(FIXED_BOUNCE1_PCT, moveTo(bounce1)),
    at(FIXED_HIT2_PCT, moveTo(IMPACT_Y)),
    at(FIXED_HIT2_PCT + 2, `${moveTo(IMPACT_Y)} scale(1.32, 0.68)`),
    at(FIXED_HIT2_PCT + 4.5, `${moveTo(IMPACT_Y)} scale(1, 1)`),
    // opacity:1 is restated here on purpose. CSS interpolates opacity between
    // the frames that declare it, so without this the fade would start at 4%
    // and the dot would reach both impacts as a ghost — exactly the two bounces
    // the fixed path exists to show.
    at(FIXED_BOUNCE2_PCT, `${moveTo(bounce2)};opacity:1`),
    at(100, `${moveTo(bounce2)};opacity:0`),
    '}',
  ].join('');
}

/** A damped sideways nudge, applied with the standalone `translate` property. */
const SHAKE = (direction: number, rest = ''): string =>
  `${rest}${rest ? ';' : ''}translate:calc(var(--shake) * ${direction}) 0`;

const SHAKE_REST = 'translate:0 0';

/** The declaration stage's flash, and the flinch, as the dot passes through it. */
export function dangerPulseKeyframes(): string {
  const rest = `box-shadow:var(--shadow-card);${SHAKE_REST}`;

  return [
    `@keyframes ${DANGER_PULSE_ANIMATION}{`,
    at(0, rest),
    at(VULNERABLE_HIT_PCT - 10, rest),
    at(VULNERABLE_HIT_PCT, `${RING_DANGER};${SHAKE(1)}`),
    at(VULNERABLE_HIT_PCT + 2.5, `box-shadow:var(--shadow-card);${SHAKE(-1)}`),
    at(VULNERABLE_HIT_PCT + 5, rest),
    at(100, rest),
    '}',
  ].join('');
}

/** The declaration stage's flash and flinch on each of the two impacts. */
export function successPulseKeyframes(): string {
  const rest = `box-shadow:var(--shadow-card);${SHAKE_REST}`;
  const hit = (direction: number) => `${RING_SUCCESS};${SHAKE(direction)}`;

  return [
    `@keyframes ${SUCCESS_PULSE_ANIMATION}{`,
    at(0, rest),
    at(FIXED_HIT_PCT - 8, rest),
    at(FIXED_HIT_PCT, hit(1)),
    at(FIXED_HIT_PCT + 2.5, `box-shadow:var(--shadow-card);${SHAKE(-1)}`),
    at(FIXED_HIT_PCT + 5, rest),
    at(FIXED_HIT2_PCT - 8, rest),
    at(FIXED_HIT2_PCT, hit(1)),
    at(FIXED_HIT2_PCT + 2.5, `box-shadow:var(--shadow-card);${SHAKE(-1)}`),
    at(FIXED_HIT2_PCT + 5, rest),
    at(100, rest),
    '}',
  ].join('');
}
