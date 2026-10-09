/**
 * verification.ts — the on-chain evidence shown in step 6.
 *
 * Every field here is currently PENDING, which is not a placeholder someone
 * forgot to fill in: **nothing has been deployed**. The programs exist as source
 * under `contract/` but have never been compiled (the SBF toolchain is not
 * published for Windows), so there is no program id, no transaction, and no
 * balance anyone could look up.
 *
 * That distinction is load-bearing. `isDeployed()` below is what the panel asks
 * before it speaks, and the UI is built so that an undeployed state says so
 * rather than presenting demo numbers as if they were chain data.
 */

export const PENDING = 'TBD';

export const VERIFICATION = {
  cluster: 'devnet',
  /** Set once the vulnerable build has actually been deployed. */
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

/**
 * The evidence that only exists after a deployment. Kept as its own type so
 * `isDeployed` can be tested against both states rather than only the one this
 * repository happens to be in.
 */
export interface DeployEvidence {
  vulnerableProgramId: string;
  attackTxSignature: string;
}

/**
 * Whether the demo's claim is backed by a chain.
 *
 * Deliberately derived from the data rather than stored as a flag: the moment a
 * real program id and signature are filled in, the panel switches to the
 * deployed wording on its own. A flag would have to be flipped by hand, and the
 * one thing a claim like this cannot survive is being wrong because somebody
 * forgot to update a boolean next to it.
 */
export function isDeployed(evidence: DeployEvidence = VERIFICATION): boolean {
  return isFilled(evidence.vulnerableProgramId) && isFilled(evidence.attackTxSignature);
}

export function solscanTxUrl(signature: string, cluster: string = VERIFICATION.cluster): string {
  return `https://solscan.io/tx/${signature}?cluster=${cluster}`;
}

export function solscanAccountUrl(address: string, cluster: string = VERIFICATION.cluster): string {
  return `https://solscan.io/account/${address}?cluster=${cluster}`;
}
