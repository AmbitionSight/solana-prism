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
 * Both constants are read off docs/mockup/prism-flow.html — the design of record.
 *
 * LAYER_HEIGHT = 96. The mockup's node is 28px of padding + a 2px border + three
 * stacked text blocks (an ~19px tag, an ~24px body and an ~26px note, with their
 * 6px margins): ~105px. Our node folds the body and its explanation onto the one
 * 64px row the card already had and adds only the tag above it — 64 + ~25 ≈ 89 —
 * so 96 leaves the bilingual name and badge room without clipping.
 *
 * LAYER_GAP = 26, the mockup's connector `.link` height (.link { height: 26px }).
 * The gap is what the connector line is drawn in, so it has to be tall enough to
 * read as a line rather than the nodes merely touching; 26px of clear space
 * between two 96px nodes does that. (The mockup's nodes are ~800px wide against
 * our 480px cards, but a connector's legibility is its pixel height, not a
 * fraction of the node width, so the 26px carries over unchanged.)
 */
export const LAYER_HEIGHT = 96;
export const LAYER_GAP = 26;

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
