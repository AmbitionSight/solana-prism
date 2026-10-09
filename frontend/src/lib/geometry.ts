/**
 * geometry.ts — single source of truth for every pixel coordinate in the demo.
 *
 * Coordinate system: y = 0 is the top edge of the first (topmost) layer card.
 * The stack grows downward. Nothing in CSS may hardcode a pixel value that
 * belongs here — keyframes are generated from these functions at runtime.
 */

export const LAYER_HEIGHT = 64;
export const LAYER_GAP = 8;

/** y of the top edge of layer `index`. */
export function layerTopY(index: number): number {
  return index * (LAYER_HEIGHT + LAYER_GAP);
}

/** y of the vertical centre of layer `index` — where the attack dot lands. */
export function layerMidY(index: number): number {
  return layerTopY(index) + LAYER_HEIGHT / 2;
}

/** Total rendered height of a stack of `count` layers. Zero layers occupy none. */
export function stackHeight(count: number): number {
  if (count <= 0) return 0;
  return count * LAYER_HEIGHT + (count - 1) * LAYER_GAP;
}

/**
 * Offset from the centre of the stack container to the centre of layer `index`,
 * for a stack of `count` layers.
 *
 * The stacked layout is expressed as a transform for the same reason the
 * scattered layout is: switching `position` between the two modes would change
 * the containing block mid-transition and make the cards pop instead of
 * converging. Both layouts are therefore pure transforms off the same origin,
 * and CSS interpolates between them.
 */
export function stackedOffsetY(index: number, count: number): number {
  return layerMidY(index) - stackHeight(count) / 2;
}

/**
 * Clearance the dot keeps above a layer that refused it.
 *
 * Deliberately its own constant rather than a reuse of LAYER_GAP: both are 8
 * today, but they mean different things, and tying them together would silently
 * change how far the dot bounces if the visual gap were ever retuned.
 */
export const BLOCK_CLEARANCE = 8;

/**
 * y where the attack dot comes to rest after being refused by layer `index`.
 * The dot's centre sits BLOCK_CLEARANCE above that layer's top edge, so it
 * reads as resting on the layer rather than having entered it.
 *
 * Requires `index >= 1`: the topmost layer has no room above it inside the stack.
 */
export function blockedY(index: number): number {
  return layerTopY(index) - BLOCK_CLEARANCE;
}

/**
 * y the attack dot drops in from — one layer height above the top of the stack,
 * so it always enters from outside the visible stack.
 */
export function dropStartY(): number {
  return layerTopY(0) - LAYER_HEIGHT;
}
