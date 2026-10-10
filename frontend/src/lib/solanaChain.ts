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
import { Connection, PublicKey, Transaction, TransactionInstruction } from '@solana/web3.js';
import type { AttackPorts } from './chainRun';
import { withdrawAccounts, withdrawInstructionData, type VaultReader } from './devnet';
import type { SolanaProvider } from './wallet';

/** Only the three RPC calls the attack needs; a real `Connection` satisfies it. */
export type AttackConnection = Pick<
  Connection,
  'getLatestBlockhash' | 'sendRawTransaction' | 'getSignatureStatuses'
>;

/** Only the one call reading a vault needs. */
export type AccountConnection = Pick<Connection, 'getAccountInfo'>;

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
    latestBlockhash: async () => {
      const { blockhash } = await connection.getLatestBlockhash();
      return blockhash;
    },

    sendWithdraw: async (input) => {
      const transaction = new Transaction({
        feePayer: feePayer(),
        recentBlockhash: input.blockhash,
      });

      transaction.add(
        new TransactionInstruction({
          programId,
          keys: withdrawAccounts(new PublicKey(input.vault), new PublicKey(input.authority)),
          // web3.js types this field as `buffer`'s `Buffer` — a nominal class
          // with 66 methods a plain `Uint8Array` does not have. The conversion
          // belongs here rather than in `devnet.ts`, which stays free of the
          // `buffer` dependency and therefore of any need for a polyfill.
          data: Buffer.from(withdrawInstructionData(input.amount)),
        }),
      );

      const signed = await provider.signTransaction(transaction);

      // skipPreflight is load-bearing, not a shortcut. With preflight on, the
      // repaired build's transaction is rejected by simulation and never lands,
      // so there is no signature to point at — and "the runtime refused it,
      // here is the failed transaction" is the entire evidence for that half of
      // the lesson.
      return connection.sendRawTransaction(signed.serialize(), { skipPreflight: true });
    },

    signatureStatus: async (signature) => {
      const { value } = await connection.getSignatureStatuses([signature]);
      const status = value?.[0];
      if (!status) return null;

      // A status the cluster has seen but not yet confirmed is still pending;
      // reporting it as a verdict would turn a race into a result.
      const settled =
        status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized';
      return settled ? { err: status.err ?? null } : null;
    },
  };
}

/** Read a pool vault's raw account data, or null when it is not there. */
export function createVaultReader(connection: AccountConnection): VaultReader {
  return async (address: PublicKey) => {
    const info = await connection.getAccountInfo(address);
    if (!info) return null;
    return toBytes(info.data);
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
