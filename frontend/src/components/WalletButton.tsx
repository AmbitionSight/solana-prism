import { useCallback, useState } from 'react';
import { connectWallet, disconnectWallet, type SolanaProvider } from '../lib/wallet';
import { elide } from '../lib/elide';
import { useLanguage } from '../i18n/language';

interface WalletButtonProps {
  /** The injected provider, or null when this browser has no wallet in it. */
  provider: SolanaProvider | null;
  /** The connected address as base58, or null while disconnected. */
  address: string | null;
  onAddressChange: (address: string | null) => void;
}

/**
 * The wallet slot in the top controls.
 *
 * The provider is read once by `App` and handed down, rather than detected here,
 * because the real-run layer needs the same provider to sign with — one
 * detection, one answer.
 *
 * With no provider this renders the sentence that says so and nothing else. A
 * connect button there would be a control that cannot do anything, which is
 * exactly the kind of affordance this demo is about.
 */
export default function WalletButton({ provider, address, onAddressChange }: WalletButtonProps) {
  const { t } = useLanguage();
  const [busy, setBusy] = useState(false);

  const connect = useCallback(async () => {
    if (!provider) return;
    setBusy(true);
    try {
      onAddressChange(await connectWallet(provider));
    } catch {
      // A connection the wallet refused is not a connection. Report none rather
      // than render an address we were never given.
      onAddressChange(null);
    } finally {
      setBusy(false);
    }
  }, [provider, onAddressChange]);

  const disconnect = useCallback(async () => {
    if (!provider) return;
    setBusy(true);
    try {
      await disconnectWallet(provider);
    } finally {
      // Even a wallet that throws on disconnect has stopped being connected as
      // far as this page is concerned; leaving the address on screen would be
      // the lie, not clearing it.
      onAddressChange(null);
      setBusy(false);
    }
  }, [provider, onAddressChange]);

  if (!provider) {
    return <span className="wallet__missing">{t.walletMissing}</span>;
  }

  return (
    <div className="wallet" role="group" aria-label={t.ariaWallet}>
      {address ? (
        <>
          <span className="wallet__state">{t.walletConnected}</span>
          <code className="wallet__address" title={address}>
            {elide(address)}
          </code>
          <button
            type="button"
            className="replay-btn"
            data-testid="wallet-disconnect-btn"
            disabled={busy}
            onClick={disconnect}
          >
            {t.walletDisconnect}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="replay-btn"
          data-testid="wallet-connect-btn"
          disabled={busy}
          onClick={connect}
        >
          {t.walletConnect}
        </button>
      )}
    </div>
  );
}
