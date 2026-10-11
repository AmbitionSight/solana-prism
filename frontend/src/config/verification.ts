/**
 * verification.ts — the platform's chain config, and the helpers the evidence is
 * read through.
 *
 * The split here is the experiment's boundary made explicit. Two kinds of value
 * used to share one `VERIFICATION` object; they are now separated:
 *
 * - **The platform.** Which cluster the app talks to, the RPC endpoint, the
 *   faucet, and how big the vault pool is. These describe the deployment the app
 *   runs on — the same for every lesson — so they stay in TypeScript, where the
 *   chain name can default through `clusterLabel` and reach the copy.
 * - **The lesson.** The two program ids, the pool's admin address, the attack
 *   transaction and its refusal, and the two balances the vulnerable build moves
 *   between — all facts about *one* lesson's on-chain instance. They moved into
 *   the lesson folder (`public/lessons/<id>/lesson.json`) and are fetched at
 *   runtime, so a second lesson can name its own programs and evidence.
 *
 * `isDeployed` is still derived from the data rather than stored as a flag — it
 * just takes the lesson's evidence as an argument now instead of reading a
 * module constant.
 */

export const PENDING = 'TBD';

/**
 * Values that describe the platform rather than any one lesson. Kept together so
 * the deployment can be repointed without touching lesson data.
 */
export const PLATFORM = {
  cluster: 'testnet',
  /**
   * The RPC the real run talks to.
   *
   * `api.testnet.solana.com` is DNS-poisoned on the network this was built on
   * (spec §3), so the endpoint that works is a configuration value rather than
   * something hardcoded in the client where the next person would not find it.
   */
  rpcEndpoint: 'https://testnet.rpcpool.com',
  /**
   * How many vaults the pool script prepares, and therefore how far the client
   * scans for a fresh one. Kept equal to `lib/devnet.ts`'s `POOL_SIZE` by a
   * test: two independent copies of this number would eventually disagree.
   */
  poolSize: 200,
  /**
   * Where a visitor with an empty wallet is sent for testnet SOL.
   *
   * A configuration value for the same reason as the RPC: the faucet is
   * unreachable from the network this was built on (spec §6.3), so the address
   * has to be swappable without touching code.
   */
  faucetUrl: 'https://faucet.solana.com',
} as const;

/** True once a placeholder has been replaced with real evidence. */
export function isFilled(value: string): boolean {
  return value.length > 0 && value !== PENDING;
}

/**
 * Everything the verify panel speaks from — facts about one lesson's on-chain
 * instance. Fetched with the lesson, never a module constant.
 */
export interface VerifyEvidence {
  /** Produced by `anchor build`; both are written into `declare_id!`. */
  vulnerableProgramId: string;
  fixedProgramId: string;
  /** Signature of the successful attack transaction against the vulnerable build. */
  attackTxSignature: string;
  /** Error the repaired build returns for the same call — the cluster's own words. */
  attackTxError: string;
  /**
   * The address `initialize` recorded as the pool vaults' authority — the
   * dedicated ADMIN keypair's *public* half.
   */
  adminPubkey: string;
  /**
   * The attacker's own program, when a lesson's attack needs one.
   *
   * Lesson two's forged credit has to be written by a program, so the lesson
   * names the one the attacker deployed. Absent for a lesson whose attack needs
   * no second program — the field is optional, so lesson one is untouched.
   */
  counterfeitProgramId?: string;
  /**
   * The two numbers the *vulnerable* build's attack moves a vault between.
   * Not an observation: the source sets `vault.balance = 1000` and the call
   * withdraws 500, so a successful run produces this pair and the panel shows it
   * only under a `success` verdict.
   */
  vaultBefore: number;
  vaultAfter: number;
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
 * Derived from the data rather than stored as a flag: the moment a real program
 * id and signature are present, the panel switches to the deployed wording on
 * its own. A flag would have to be flipped by hand, and the one thing a claim
 * like this cannot survive is being wrong because somebody forgot.
 */
export function isDeployed(evidence: DeployEvidence): boolean {
  return isFilled(evidence.vulnerableProgramId) && isFilled(evidence.attackTxSignature);
}

/**
 * The cluster as copy should name it — `'testnet'` reads as `'Testnet'`.
 *
 * Sentences that name the chain are templated with `{cluster}` and filled from
 * here rather than spelled out, so a move to another cluster does not leave a
 * stale name written into copy.
 */
export function clusterLabel(cluster: string = PLATFORM.cluster): string {
  return cluster.charAt(0).toUpperCase() + cluster.slice(1);
}

export function solscanTxUrl(signature: string, cluster: string = PLATFORM.cluster): string {
  return `https://solscan.io/tx/${signature}?cluster=${cluster}`;
}

export function solscanAccountUrl(address: string, cluster: string = PLATFORM.cluster): string {
  return `https://solscan.io/account/${address}?cluster=${cluster}`;
}
