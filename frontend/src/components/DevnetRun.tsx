import { useLanguage } from '../i18n/language';
import { formatCluster } from '../i18n/messages';
import { isFilled } from '../config/verification';
import type { RunStatus } from '../lib/devnetRun';

interface DevnetRunProps {
  /** Which build is selected, because the fallback sentence names one of them. */
  isFixed: boolean;
  /** Whether this browser has a Solana wallet at all. */
  providerPresent: boolean;
  /** Whether that wallet is connected — without one there is nothing to sign with. */
  connected: boolean;
  /** The selected build's program id, straight from config: `PENDING` until deployed. */
  programId: string;
  /** What the last attempt is doing or did. See `controlStatus`. */
  status: RunStatus;
  onRun: () => void;
}

/**
 * The opt-in real-chain entry point.
 *
 * Three things decide whether anything renders here, and all three are data:
 * a wallet exists, it is connected, and the selected build has a program id that
 * is not `PENDING`. With no wallet this component renders nothing at all — that
 * is the property the default path and `tools/shoot.mjs` depend on, so it is the
 * first branch rather than a condition spread over the markup.
 */
export default function DevnetRun({
  isFixed,
  providerPresent,
  connected,
  programId,
  status,
  onRun,
}: DevnetRunProps) {
  const { t } = useLanguage();

  if (!providerPresent || !connected) return null;

  if (!isFilled(programId)) {
    // The fallback sentence names the repaired build, so it is only honest for
    // the repaired build. The vulnerable id is filled in, which makes the other
    // branch unreachable in the shipped configuration — and rendering a
    // sentence about the wrong program would be worse than rendering nothing.
    return isFixed ? <p className="attack-result__body">{t.chainFixedNotDeployed}</p> : null;
  }

  return (
    <div className="devnet-run">
      <button
        type="button"
        className="replay-btn"
        data-testid="execute-devnet-btn"
        disabled={status.kind === 'busy'}
        onClick={onRun}
      >
        {formatCluster(t.executeOnDevnet)}
      </button>
      <p className="attack-result__body">{formatCluster(t.chainNeedSol)}</p>
      {status.kind === 'busy' && <p className="attack-result__body">{t.chainRunning}</p>}
      {status.kind === 'exhausted' && <p className="attack-result__body">{t.chainExhausted}</p>}
      {status.kind === 'failed' && (
        <p className="attack-result__body">
          {t.chainAttemptFailed}
          {status.detail && <code> {status.detail}</code>}
        </p>
      )}
    </div>
  );
}
