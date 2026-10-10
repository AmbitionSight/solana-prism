/**
 * devnet.ts — everything the browser needs to talk to the deployed program.
 *
 * Pure and side-effect free on purpose: the RPC read is injected, so the pool
 * logic can be tested without a network, and nothing here touches React.
 *
 * Only `@solana/web3.js` — and only the pieces that build a transaction and
 * derive an address. In particular `@coral-xyz/anchor` is absent: the withdraw
 * instruction is 16 bytes, and paying a whole client framework for 16 bytes
 * would be the wrong trade in a project whose highlighter is hand-written.
 *
 * The discriminators below are not magic numbers. They are the first 8 bytes of
 * sha256 over Anchor's naming scheme, and the tests pin them to those hashes:
 *   sha256("global:withdraw") -> b712469c946da122
 *   sha256("account:Vault")   -> d308e82b02987577
 */

import { Keypair, PublicKey, type AccountMeta } from '@solana/web3.js';

/** sha256("global:withdraw")[0..8] — the instruction selector. */
export const WITHDRAW_DISCRIMINATOR = Uint8Array.from([183, 18, 70, 156, 148, 109, 161, 34]);

/** sha256("account:Vault")[0..8] — proves a fetched account really is a Vault. */
export const VAULT_DISCRIMINATOR = Uint8Array.from([211, 8, 232, 43, 2, 152, 117, 119]);

/** #[account] discriminator (8) + authority (32) + balance (8). */
export const VAULT_SPACE = 48;

/** How many vaults the pool script prepares for the demo. */
export const POOL_SIZE = 30;

/**
 * The one vault owned by the *repaired* program.
 *
 * It sits just outside the pool so the scan never consumes it, and it is
 * deliberately singular: every withdrawal against the fixed build is refused,
 * so its balance never changes and one vault serves every visitor forever.
 *
 * It must be a fixed-owned account rather than a pool vault. Anchor checks
 * fields in declaration order — `vault`'s owner before `authority`'s signature —
 * so aiming the fixed program at a vulnerable-owned vault would fail on
 * `AccountOwnedByWrongProgram` and prove nothing about the missing signer, which
 * is the only thing this half of the demo is about.
 */
export const FIXED_VAULT_INDEX = POOL_SIZE;

/** What `initialize` writes. A fresh vault holds exactly this. */
export const INITIAL_BALANCE = 1000;

/** What the demo withdraws, matching the animation's 1000 -> 500. */
export const ATTACK_AMOUNT = 500;

/**
 * The vault pool's derivation tag.
 *
 * The pool script and this module must agree byte for byte, so the layout is
 * deliberately trivial rather than a hash: the tag, then the index as a u32,
 * then zero padding. No `sha256` is available from web3.js anyway, and pulling
 * a hash library in to make an address reproducible would buy nothing.
 */
export const VAULT_SEED_TAG = 'prism-vault-v1';

/** 16 bytes: 8 of discriminator, then the amount as a little-endian u64. */
export function withdrawInstructionData(amount: number): Uint8Array {
  const data = new Uint8Array(16);
  data.set(WITHDRAW_DISCRIMINATOR, 0);
  new DataView(data.buffer).setBigUint64(8, BigInt(amount), true);
  return data;
}

/**
 * The accounts `withdraw` takes, in the order `Withdraw` declares them.
 *
 * Neither is a signer. That is not an oversight — it is the bug the whole demo
 * is about, and it is also why a visitor can run the real attack with their own
 * wallet alone and no co-signature from the admin's keypair.
 */
export function withdrawAccounts(vault: PublicKey, authority: PublicKey): AccountMeta[] {
  return [
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
  ];
}

/** The 32-byte ed25519 seed for pool vault `index`. */
export function vaultSeed(index: number): Uint8Array {
  const seed = new Uint8Array(32);
  for (let i = 0; i < VAULT_SEED_TAG.length; i += 1) {
    seed[i] = VAULT_SEED_TAG.charCodeAt(i);
  }
  new DataView(seed.buffer).setUint32(VAULT_SEED_TAG.length, index, true);
  return seed;
}

/**
 * The address of pool vault `index`.
 *
 * Only the address is ever needed: `Withdraw.vault` is `#[account(mut)]`, not a
 * signer, so the secret stays on the build machine that created the pool.
 */
export function vaultAddress(index: number): PublicKey {
  return Keypair.fromSeed(vaultSeed(index)).publicKey;
}

export interface DecodedVault {
  authority: PublicKey;
  balance: number;
}

/**
 * Decode a Vault account, or throw — a length or discriminator mismatch means
 * the reader is looking at something else, and reading on would produce a
 * confident wrong answer.
 */
export function decodeVault(data: Uint8Array): DecodedVault {
  if (data.length !== VAULT_SPACE) {
    throw new Error(`expected a ${VAULT_SPACE}-byte Vault account, got ${data.length}`);
  }
  for (let i = 0; i < VAULT_DISCRIMINATOR.length; i += 1) {
    if (data[i] !== VAULT_DISCRIMINATOR[i]) {
      throw new Error('account discriminator does not match Vault');
    }
  }

  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return {
    authority: new PublicKey(data.slice(8, 40)),
    // Safe as a number: the program only ever stores 0..1000 here.
    balance: Number(view.getBigUint64(40, true)),
  };
}

/** Reads an account's data, or null when it does not exist. Injected, so testable. */
export type VaultReader = (address: PublicKey) => Promise<Uint8Array | null>;

/**
 * The first pool vault that is still fresh, or null when the pool is used up.
 *
 * "Fresh" is exact rather than approximate: the demo's claim is 1000 -> 500, so
 * a vault already at 500 is not a candidate and is skipped. An exhausted pool
 * returns null so the UI can say so — never a fabricated success.
 */
export async function nextFreshVault(
  read: VaultReader,
  admin: PublicKey,
  poolSize: number = POOL_SIZE,
): Promise<number | null> {
  for (let index = 0; index < poolSize; index += 1) {
    const data = await read(vaultAddress(index));
    if (!data) continue;

    let decoded: DecodedVault;
    try {
      decoded = decodeVault(data);
    } catch {
      continue;
    }

    if (decoded.authority.equals(admin) && decoded.balance === INITIAL_BALANCE) return index;
  }
  return null;
}
