/**
 * polyfills.ts — the one global `@solana/web3.js` needs in a browser.
 *
 * web3.js v1's browser bundle references `Buffer` 217 times: bs58, borsh and
 * account decoding all lean on it. Node has `Buffer` built in; a browser does
 * not. Vite resolves web3.js's `browser` field, so the bundle that actually
 * ships is the one carrying those references — without this the first import of
 * a chain module throws and the demo goes blank instead of degrading.
 *
 * It has to run before anything reaches `@solana/web3.js`, which is why it is
 * the first import in `main.tsx`. Module evaluation follows import order, so
 * being first is sufficient, not merely tidy.
 *
 * `buffer` is the second dependency this feature added, and it is not a matter
 * of taste: a `Transaction` object that Phantom will accept costs a Buffer
 * implementation in the browser. Building one by hand to dodge a 50 kB polyfill
 * would trade a known-safe path for an unverifiable one — Phantom cannot be run
 * in this project's test environment.
 */

import { Buffer } from 'buffer';

const scope = globalThis as { Buffer?: unknown };

if (typeof scope.Buffer === 'undefined') {
  scope.Buffer = Buffer;
}
