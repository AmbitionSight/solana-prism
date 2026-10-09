import { useEffect, useState } from 'react';
import {
  VERIFICATION,
  isFilled,
  solscanAccountUrl,
  solscanTxUrl,
} from '../config/verification';

const VIDEO_SRC = '/demo-verify.mp4';

interface RowProps {
  label: string;
  value: string;
  href?: string;
}

function Row({ label, value, href }: RowProps) {
  return (
    <div className="verify__row">
      <dt className="verify__key">{label}</dt>
      <dd className="verify__val">
        {isFilled(value) ? (
          href ? (
            <a href={href} target="_blank" rel="noreferrer">
              <code>{value}</code>
            </a>
          ) : (
            <code>{value}</code>
          )
        ) : (
          <span className="verify__pending">awaiting Phase 4</span>
        )}
      </dd>
    </div>
  );
}

/**
 * Step 6 — the on-chain evidence, collapsed behind a button so it never
 * interrupts the animation. Until Phase 4 fills in real Devnet values every
 * row reads as pending rather than as a link that goes nowhere.
 */
export default function VerifyPanel() {
  const [open, setOpen] = useState(false);
  const [videoBroken, setVideoBroken] = useState(false);
  /**
   * Whether the recording exists yet. `preload="none"` means the <video>'s own
   * error event does not fire until someone presses play, so without probing we
   * would show an empty black box until Phase 4 drops the file in.
   */
  const [videoAvailable, setVideoAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    fetch(VIDEO_SRC, { method: 'HEAD' })
      .then((response) => {
        // Guard against an SPA fallback answering 200 with HTML.
        const type = response.headers.get('content-type') ?? '';
        if (!cancelled) setVideoAvailable(response.ok && type.startsWith('video/'));
      })
      .catch(() => {
        if (!cancelled) setVideoAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const { vulnerableProgramId, fixedProgramId, attackTxSignature, attackTxError } = VERIFICATION;

  return (
    <div className="verify">
      <button
        type="button"
        className={`verify__toggle${open ? ' is-open' : ''}`}
        data-testid="verify-toggle"
        aria-expanded={open}
        aria-controls="verify-panel"
        onClick={() => setOpen((value) => !value)}
      >
        Verify on-chain <span aria-hidden="true">→</span>
      </button>

      {open && (
        <div className="verify__panel" id="verify-panel" data-testid="verify-panel" role="region" aria-label="On-chain verification">
          <p className="verify__claim">
            This is not an animation. The exploit is real, deployed, and reproducible on Devnet.
          </p>

          <dl className="verify__rows">
            <Row
              label="Vulnerable program"
              value={vulnerableProgramId}
              href={solscanAccountUrl(vulnerableProgramId)}
            />
            <Row
              label="Attack transaction"
              value={attackTxSignature}
              href={solscanTxUrl(attackTxSignature)}
            />
            <Row label="Vault balance" value={`${VERIFICATION.vaultBefore} → ${VERIFICATION.vaultAfter}`} />
            <Row
              label="Fixed program"
              value={fixedProgramId}
              href={solscanAccountUrl(fixedProgramId)}
            />
            <Row label="Same call, fixed build" value={attackTxError} />
          </dl>

          {videoAvailable && !videoBroken ? (
            <video
              className="verify__video"
              src={VIDEO_SRC}
              controls
              preload="metadata"
              onError={() => setVideoBroken(true)}
            />
          ) : videoAvailable === null ? null : (
            <p className="verify__pending verify__video-fallback">
              Recorded walkthrough (demo-verify.mp4) is added in Phase 4.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
