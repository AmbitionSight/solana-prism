import { useEffect, useState } from 'react';
import {
  PENDING,
  VERIFICATION,
  isDeployed,
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
 * interrupts the animation.
 *
 * The panel has two voices and picks between them by asking `isDeployed()`, not
 * by being told. With nothing deployed there is no program id, no signature and
 * no balance to show, so it says exactly that: the walkthrough is faithful to
 * the source in this repository, and there is nothing on a chain behind it.
 * Claiming otherwise would make the one sentence this demo cannot afford to get
 * wrong — "this is real" — the only false one.
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
  const deployed = isDeployed();

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
          <p className={`verify__claim${deployed ? '' : ' verify__claim--unproven'}`}>
            {deployed ? t.verifyClaimDeployed : t.verifyClaimNotDeployed}
          </p>

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
            {/* The balance is a number the contract is written to produce, not
                one anyone has read off a chain. With nothing deployed it is
                pending like everything else here. */}
            <Row
              labelKey="verifyVaultBalance"
              value={
                deployed ? `${VERIFICATION.vaultBefore} → ${VERIFICATION.vaultAfter}` : PENDING
              }
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
