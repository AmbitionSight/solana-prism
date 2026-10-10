/**
 * wallet.ts — the wallet boundary, kept as thin as it can be.
 *
 * Deliberately not `@solana/wallet-adapter-react`. That package brings a
 * dependency tree and a React UI of its own, and this demo needs exactly four
 * things from a wallet: is one there, connect, disconnect, sign. It also only
 * ever talks to Phantom, so a generic multi-wallet abstraction would be
 * machinery with nothing to abstract.
 *
 * There is no `window` reference at module scope and no side effect on import:
 * `detectProvider` takes the scope as an argument, which is what makes the
 * whole module testable without a browser.
 */

/** Just enough of a public key: the demo only ever renders base58. */
export interface WalletPublicKey {
  toBase58(): string;
}

/** The subset of Phantom's provider API this demo uses. */
export interface SolanaProvider {
  publicKey: WalletPublicKey | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: WalletPublicKey | null }>;
  disconnect?(): Promise<void>;
  signTransaction<T>(transaction: T): Promise<T>;
}

/**
 * Whether this looks like a wallet provider.
 *
 * `connect` alone is not enough to accept — anything can expose a `connect`
 * function, and accepting one would render a wallet button that cannot sign.
 * Both the ability to connect and the ability to sign are required, because
 * both are used.
 */
function isProvider(value: unknown): value is SolanaProvider {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.connect === 'function' && typeof candidate.signTransaction === 'function';
}

/** The injected provider, or null when this browser has no wallet in it. */
export function detectProvider(scope: unknown = globalThis): SolanaProvider | null {
  if (typeof scope !== 'object' || scope === null) return null;
  const candidate = (scope as Record<string, unknown>).solana;
  return isProvider(candidate) ? candidate : null;
}

/**
 * Connect and return the address as base58.
 *
 * Throws rather than returning null when there is no address: a connection with
 * no key is not a connection, and a caller that treats it as one would go on to
 * build a transaction from nothing.
 */
export async function connectWallet(provider: SolanaProvider): Promise<string> {
  const result = await provider.connect();
  const publicKey = result?.publicKey ?? provider.publicKey;
  if (!publicKey) throw new Error('wallet connected without a public key');
  return publicKey.toBase58();
}

/** Disconnect if the wallet supports it; a wallet without it is not an error. */
export async function disconnectWallet(provider: SolanaProvider): Promise<void> {
  if (typeof provider.disconnect === 'function') await provider.disconnect();
}
