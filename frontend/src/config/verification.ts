/**
 * verification.ts — the on-chain evidence shown in step 6.
 *
 * Phase 2 ships placeholders: the whole point of the front end running first is
 * that it needs no chain to be demonstrable. Phase 4 replaces every PENDING
 * value with a real Devnet program id and transaction signature. Until then the
 * panel renders those rows as pending rather than as dead links.
 */

export const PENDING = 'TBD';

export const VERIFICATION = {
  cluster: 'devnet',
  /** Set in Phase 4. */
  vulnerableProgramId: PENDING,
  fixedProgramId: PENDING,
  /** Signature of the successful attack transaction against the vulnerable build. */
  attackTxSignature: PENDING,
  /** Error the repaired build returns for the same call. */
  attackTxError: PENDING,
  vaultBefore: 1000,
  vaultAfter: 500,
} as const;

/** True once a placeholder has been replaced with real evidence. */
export function isFilled(value: string): boolean {
  return value.length > 0 && value !== PENDING;
}

export function solscanTxUrl(signature: string, cluster: string = VERIFICATION.cluster): string {
  return `https://solscan.io/tx/${signature}?cluster=${cluster}`;
}

export function solscanAccountUrl(address: string, cluster: string = VERIFICATION.cluster): string {
  return `https://solscan.io/account/${address}?cluster=${cluster}`;
}
