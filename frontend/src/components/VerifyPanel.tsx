import { useEffect, useState } from 'react';
import {
  VERIFICATION,
  isFilled,
  solscanAccountUrl,
  solscanTxUrl,
} from '../config/verification';
import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

const VIDEO_SRC = '/demo-verify.mp4';

interface RowProps {
  labelKey: MessageKey;
  value: string;
  href?: string;
}

function Row({ labelKey, value, href }: RowProps) {
  const { t } = useLanguage();

  return (
    <div className="verify__row">
      <dt className="verify__key">{t[labelKey]}</dt>
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
          <span className="verify__pending">{t.verifyPending}</span>
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
  const { t } = useLanguage();
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
        {t.verifyToggle} <span aria-hidden="true">→</span>
      </button>

      {open && (
        <div
          className="verify__panel"
          id="verify-panel"
          data-testid="verify-panel"
          role="region"
          aria-label={t.ariaVerifyRegion}
        >
          <p className="verify__claim">{t.verifyClaim}</p>

          <dl className="verify__rows">
            <Row
              labelKey="verifyVulnerableProgram"
              value={vulnerableProgramId}
              href={solscanAccountUrl(vulnerableProgramId)}
            />
            <Row
              labelKey="verifyAttackTx"
              value={attackTxSignature}
              href={solscanTxUrl(attackTxSignature)}
            />
            <Row
              labelKey="verifyVaultBalance"
              value={`${VERIFICATION.vaultBefore} → ${VERIFICATION.vaultAfter}`}
            />
            <Row
              labelKey="verifyFixedProgram"
              value={fixedProgramId}
              href={solscanAccountUrl(fixedProgramId)}
            />
            <Row labelKey="verifySameCall" value={attackTxError} />
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
            <p className="verify__pending verify__video-fallback">{t.verifyVideoNote}</p>
          )}
        </div>
      )}
    </div>
  );
}
