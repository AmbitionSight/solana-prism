/**
 * geometry.ts — single source of truth for every pixel coordinate in the demo.
 *
 * Coordinate system: y = 0 is the top edge of the first (topmost) node. The
 * nodes run downward as a flow, joined by connector lines drawn in the gap
 * between them. Nothing in CSS may hardcode a pixel value that belongs here —
 * keyframes are generated from these functions at runtime.
 *
 * The identifiers still say "layer" from the earlier stacked-cards metaphor.
 * They are kept deliberately: the attack dot's keyframes are generated from
 * these names, and renaming them would churn lib/keyframes.ts for no gain.
 */

/*
 * The pitch was retuned so the whole six-node flow fits a 1280x820 viewport
 * under the footer each page carries: at the old 96 + 26 the flow alone was
 * 706px, which pushed pages 3, 4, 5 and 8 past the fold and made them scroll —
 * the demo is paged, not scrolled, so that had to go.
 *
 * LAYER_HEIGHT = 68. The card's intrinsic content is now ~39px (a 12px sentence,
 * a 4px gap, and the id-plus-code row), so 68 leaves the sentence room to wrap
 * to two lines on the longest English copy without clipping while keeping the
 * six-card flow short enough to sit above a footer.
 *
 * LAYER_GAP = 16, the connector's clear space. Still tall enough for the 2px
 * line to read as a link rather than the cards merely touching, and the pitch
 * (68 + 16 = 84) still clears the tallest card — stage 4's comparison, which
 * sizes to its content — without the two overlapping.
 *
 * These are the numbers the attack dot's keyframes are generated from; nothing
 * in CSS may hardcode them.
 */
export const LAYER_HEIGHT = 68;
export const LAYER_GAP = 16;

/** y of the top edge of node `index`. */
export function layerTopY(index: number): number {
  return index * (LAYER_HEIGHT + LAYER_GAP);
}

/** y of the vertical centre of node `index` — where the attack dot lands. */
export function layerMidY(index: number): number {
  return layerTopY(index) + LAYER_HEIGHT / 2;
}

/** Total rendered height of a flow of `count` nodes. Zero nodes occupy none. */
export function stackHeight(count: number): number {
  if (count <= 0) return 0;
  return count * LAYER_HEIGHT + (count - 1) * LAYER_GAP;
}

/**
 * Offset from the centre of the flow container to the centre of node `index`,
 * for a flow of `count` nodes.
 *
 * The settled (flow) layout is expressed as a transform for the same reason the
 * scattered layout is: switching `position` between the two modes would change
 * the containing block mid-transition and make the nodes pop instead of
 * converging. Both layouts are therefore pure transforms off the same origin,
 * and CSS interpolates between them.
 */
export function stackedOffsetY(index: number, count: number): number {
  return layerMidY(index) - stackHeight(count) / 2;
}

/**
 * Clearance the dot keeps above the node that refused it.
 *
 * Deliberately its own constant rather than a reuse of LAYER_GAP: they mean
 * different things — one is the visual space between nodes, the other is how
 * far the dot bounces back — and tying them together would silently change the
 * bounce if the flow gap were ever retuned.
 */
export const BLOCK_CLEARANCE = 8;

/**
 * y where the attack dot comes to rest after being refused by node `index`.
 * The dot's centre sits BLOCK_CLEARANCE above that node's top edge, so it
 * reads as resting on the node rather than having entered it.
 *
 * Requires `index >= 1`: the topmost node has no room above it inside the flow.
 */
export function blockedY(index: number): number {
  return layerTopY(index) - BLOCK_CLEARANCE;
}

/**
 * y the attack dot drops in from — one node height above the top of the flow,
 * so it always enters from outside the visible flow.
 */
export function dropStartY(): number {
  return layerTopY(0) - LAYER_HEIGHT;
}
