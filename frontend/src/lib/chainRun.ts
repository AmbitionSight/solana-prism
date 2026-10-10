/**
 * chainRun.ts — what a real run does, minus anything that needs a browser.
 *
 * The whole point of this file is one distinction that a naive implementation
 * gets wrong: **a transaction the runtime rejected still has a signature**.
 *
 * `sendAndConfirmTransaction` throws when the transaction fails, so the
 * signature is lost exactly when it is most interesting — the repaired build's
 * refusal is evidence precisely because it is a real, findable, failed
 * transaction. The real adapter therefore sends with `skipPreflight` and reads
 * the outcome back from the signature, and the decision is made here where it
 * can be tested without a chain.
 *
 * Ports are injected, so every branch below runs in a unit test.
 */

export interface AttackParams {
  vault: string;
  authority: string;
  amount: number;
}

export interface AttackPorts {
  /** A recent blockhash for the transaction message. */
  latestBlockhash(): Promise<string>;
  /**
   * Sign and submit. Must resolve with the signature even when the transaction
   * is doomed — that is the contract this module depends on.
   */
  sendWithdraw(input: AttackParams & { blockhash: string }): Promise<string>;
  /** null while unknown or still pending; otherwise the transaction's error, `err: null` meaning success. */
  signatureStatus(signature: string): Promise<{ err: unknown } | null>;
}

export type AttackOutcome =
  | { kind: 'success'; signature: string }
  | { kind: 'rejected'; signature: string; reason: string }
  | { kind: 'failed'; reason: string };

export interface PollOptions {
  /** How many times to ask whether the transaction landed. */
  attempts?: number;
  /** Gap between those asks. Zero in tests. */
  delayMs?: number;
}

const DEFAULT_ATTEMPTS = 30;
const DEFAULT_DELAY_MS = 1000;

function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Submit the attack and report what the chain did with it.
 *
 * `failed` means *this demo could not complete the attempt* — no blockhash, no
 * submission, no confirmation. It never means "the program refused", because
 * conflating those two would turn an RPC outage into a security claim.
 */
export async function runAttack(
  ports: AttackPorts,
  params: AttackParams,
  options: PollOptions = {},
): Promise<AttackOutcome> {
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  const delayMs = options.delayMs ?? DEFAULT_DELAY_MS;

  let signature: string;
  try {
    const blockhash = await ports.latestBlockhash();
    signature = await ports.sendWithdraw({ ...params, blockhash });
  } catch (error) {
    return { kind: 'failed', reason: describe(error) };
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    let status: { err: unknown } | null = null;
    try {
      status = await ports.signatureStatus(signature);
    } catch {
      // A flaky read is not a verdict. Keep asking; only exhaustion is failure.
      status = null;
    }

    if (status) {
      return status.err
        ? { kind: 'rejected', signature, reason: describe(status.err) }
        : { kind: 'success', signature };
    }

    if (attempt < attempts - 1) await sleep(delayMs);
  }

  return {
    kind: 'failed',
    reason: `the transaction was not confirmed in time (${signature})`,
  };
}
