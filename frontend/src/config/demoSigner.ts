/**
 * demoSigner.ts — the testnet-only keypair that makes Execute real.
 *
 * **This file ships a secret key in the frontend on purpose.** That is a
 * deliberate, accepted trade-off, and it is stated here rather than buried so
 * nobody has to discover it by reading the bytes:
 *
 * - **What it is.** A dedicated keypair, generated for this demo and funded with
 *   a little testnet SOL (about 0.05) to pay transaction fees. Testnet SOL has
 *   no value.
 * - **Why it is in the repository.** So that a visitor with no wallet — almost
 *   everyone — can press Execute and have a real transaction land on testnet.
 *   Without it the attack is theatre: an animation and no transaction, which is
 *   exactly the thing this demo exists to argue against.
 * - **What the exposure costs.** Anyone who reads the bundle can spend its fee
 *   balance. That is the whole of it: the key holds nothing else, it is only
 *   ever the fee payer, and the program it calls is a deliberately vulnerable
 *   demo. It is *not* the pool's authority — the `authority` account passed to
 *   `withdraw` is the ADMIN public key, and nobody signs as the admin. The vault
 *   pool is refillable by re-running the pool script.
 * - **What it must never be.** Reused on mainnet. It is testnet-only by intent;
 *   nothing here checks the cluster, so the only thing keeping it honest is that
 *   it is never pointed at a network where these bytes would be worth taking.
 *
 * It is the same class of artifact as the demo's publicly-known pool: something
 * whose safety comes from being open, not from being hidden. Shipping it is the
 * price of a demo that needs no setup.
 */

import { Keypair } from '@solana/web3.js';

/**
 * The secret key in the 64-byte form `Keypair.fromSecretKey` expects: 32 bytes
 * of seed, then the same 32-byte public key. Published so the transaction the
 * demo sends is one anyone can reproduce.
 */
export const DEMO_SIGNER_SECRET: number[] = [
  234, 37, 186, 51, 119, 192, 234, 32, 200, 111, 165, 78, 178, 142, 63, 35, 60, 128, 12, 41, 197,
  180, 140, 3, 218, 54, 202, 32, 179, 254, 201, 250, 95, 213, 255, 242, 90, 112, 185, 64, 226, 14,
  71, 174, 170, 68, 195, 77, 36, 38, 186, 74, 243, 185, 3, 123, 6, 23, 105, 168, 208, 139, 9, 50,
];

/**
 * The public half, written down rather than derived at the call site so the
 * transaction card can name the signer without building a keypair to do it — and
 * so a mistake in the array above is a failing test, not a silently wrong sender.
 */
export const DEMO_SIGNER_PUBKEY = '7T6ze6xyT1NaD5ai57pVWj6odfjVvFtSJkoT7sfBTWmw';

/**
 * The keypair, built once and cached.
 *
 * `Keypair.fromSecretKey` copies the bytes into its own typed array, so the
 * mutable module-level `DEMO_SIGNER_SECRET` is never handed out as live key
 * material — the returned keypair only reads from its own copy. Cached rather
 * than rebuilt per call so two runs can never be given two different objects for
 * the same key.
 */
let signer: Keypair | null = null;

export function demoSigner(): Keypair {
  if (!signer) signer = Keypair.fromSecretKey(Uint8Array.from(DEMO_SIGNER_SECRET));
  return signer;
}
