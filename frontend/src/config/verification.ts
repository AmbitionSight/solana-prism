/**
 * verification.ts — the on-chain evidence shown in step 5.
 *
 * Two different kinds of value live here, and the difference is the whole point.
 *
 * **What the build produced** is filled in: the two program ids. They exist the
 * moment `anchor build` finished (spec §4.1), and they are written into
 * `declare_id!`, so they are facts about the artifact rather than claims about a
 * chain.
 *
 * **What only a run can produce** was filled in by the testnet run: the attack
 * signature, the error the repaired build returns, and the ADMIN public key the
 * pool script created. None of them is guessed — a plausible address written
 * down early would be indistinguishable from a real one and would make the
 * demo's one unaffordable mistake, claiming something is real when it is not.
 *
 * `isDeployed()` below is what the panel asks before it speaks, and it keeps
 * saying "not deployed" for exactly as long as the run evidence is missing,
 * however many program ids are filled in. That is derived from the data, not
 * from a flag, so nobody has to remember to flip it once the pool exists.
 */

export const PENDING = 'TBD';

export const VERIFICATION = {
  cluster: 'testnet',
  /** Produced by `anchor build`; both are written into `declare_id!`. */
  vulnerableProgramId: '7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2',
  fixedProgramId: '9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq',
  /** Signature of the successful attack transaction against the vulnerable build. */
  attackTxSignature:
    '2d4hd6SnxtriuegGRGRgM542Cr4qsGbkYQUgx3shR3fxdFSmUFRrGvM7L9zwK2CFBe1KTRafeyqD66nj2Mm4tEEW',
  /** Error the repaired build returns for the same call — the cluster's own words. */
  attackTxError: 'InstructionError: [0, Custom(3010)]',
  /**
   * The address `initialize` recorded as the pool vaults' authority — the
   * dedicated ADMIN keypair's *public* half. The secret never left the build
   * machine that created the pool (spec §4.2); only this half is published.
   */
  adminPubkey: 'DMkwnXZ6Gy7X8fkzSyBCdCuk3E2CFrwCmhV9A44qGU7T',
  /**
   * The RPC the real run talks to.
   *
   * `api.testnet.solana.com` is DNS-poisoned on the network this was built on
   * (spec §3), so the endpoint that works is a configuration value rather than
   * something hardcoded in the client where the next person would not find it.
   * `https://api.testnet.solana.com` is the canonical alternative where it is
   * reachable.
   */
  rpcEndpoint: 'https://testnet.rpcpool.com',
  /**
   * How many vaults the pool script prepares, and therefore how far the client
   * scans for a fresh one. Kept equal to `lib/devnet.ts`'s `POOL_SIZE` by a
   * test: two independent copies of this number would eventually disagree, and
   * the scan would stop short of the pool.
   */
  poolSize: 200,
  /**
   * Where a visitor with an empty wallet is sent for Devnet SOL.
   *
   * A configuration value for the same reason as the RPC: `faucet.solana.com` is
   * unreachable from the network this was built on (spec §6.3), so the address
   * has to be swappable without touching code.
   */
  faucetUrl: 'https://faucet.solana.com',
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
 * Everything the verify panel speaks from, widened to `string`.
 *
 * `VERIFICATION` satisfies it with its literal types, and so does a config with
 * the run evidence blanked back to `PENDING` — which is the point: the panel
 * takes this as a prop rather than reading the module, so both of its voices
 * stay reachable now that the repository itself is deployed.
 */
export interface VerifyEvidence {
  cluster: string;
  vulnerableProgramId: string;
  fixedProgramId: string;
  attackTxSignature: string;
  attackTxError: string;
  adminPubkey: string;
  rpcEndpoint: string;
  poolSize: number;
  faucetUrl: string;
  vaultBefore: number;
  vaultAfter: number;
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

/**
 * The cluster as copy should name it — `'testnet'` reads as `'Testnet'`.
 *
 * Sentences that name the chain are templated with `{cluster}` and filled from
 * here rather than spelled out. This repository moved devnet → testnet and the
 * three sentences that had the old chain written into them by hand were the
 * ones that went stale, which is the whole argument for making it data.
 */
export function clusterLabel(cluster: string = VERIFICATION.cluster): string {
  return cluster.charAt(0).toUpperCase() + cluster.slice(1);
}

export function solscanTxUrl(signature: string, cluster: string = VERIFICATION.cluster): string {
  return `https://solscan.io/tx/${signature}?cluster=${cluster}`;
}

export function solscanAccountUrl(address: string, cluster: string = VERIFICATION.cluster): string {
  return `https://solscan.io/account/${address}?cluster=${cluster}`;
}
