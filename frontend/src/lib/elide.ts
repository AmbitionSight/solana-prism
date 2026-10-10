/**
 * elide.ts — how a 44-character base58 address is shown to a person.
 *
 * Addresses are evidence, so the two ends are kept and the middle is dropped:
 * enough of the name to match what a wallet or an explorer shows, short enough
 * to read. The full value stays in the DOM's `title` and in the links, never
 * only in the elided text.
 *
 * Deliberately a shared function rather than a local one in each component:
 * two places eliding differently would be two different claims about the same
 * address.
 */

/** Characters kept at each end. */
export const ELIDE_EDGE = 4;

/** `ECnXMpRN…RjN4VU` — first `ELIDE_EDGE` characters, an ellipsis, the last. */
export function elide(value: string, edge: number = ELIDE_EDGE): string {
  // Short enough that eliding would hide more than it reveals — and, at the
  // other end, a value so short that the two ends would overlap.
  if (value.length <= edge * 2 + 1) return value;
  return `${value.slice(0, edge)}…${value.slice(-edge)}`;
}
