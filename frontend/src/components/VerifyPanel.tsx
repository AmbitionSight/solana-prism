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
import { formatCluster, type MessageKey } from '../i18n/messages';
import type { VerifyEvidence } from '../config/verification';

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
 * Step 5 — the on-chain evidence, collapsed behind a button so it never
 * interrupts the animation.
 *
 * The panel has two voices and picks between them by asking `isDeployed()`, not
 * by being told. With nothing deployed there is no program id, no signature and
 * no balance to show, so it says exactly that: the walkthrough is faithful to
 * the source in this repository, and there is nothing on a chain behind it.
 * Claiming otherwise would make the one sentence this demo cannot afford to get
 * wrong — "this is real" — the only false one.
 */
export default function VerifyPanel({
  defaultOpen = false,
  runSignature,
  evidence = VERIFICATION,
}: {
  /**
   * The demo opens the panel by click. A test that renders to a string cannot
   * click, and the panel's contents are the thing worth asserting on, so the
   * initial state is overridable. The demo never passes it.
   */
  defaultOpen?: boolean;
  /**
   * This run's signature — present only after a real run, because only a real
   * run has one. Absent, no row is rendered at all.
   */
  runSignature?: string;
  /**
   * The evidence the panel speaks from. Defaults to the repository's real
   * config; a test overrides it so both voices get exercised, rather than only
   * the one this repository happens to be in today.
   */
  evidence?: VerifyEvidence;
} = {}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(defaultOpen);
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

  const { vulnerableProgramId, fixedProgramId, attackTxSignature, attackTxError } = evidence;
  const deployed = isDeployed(evidence);

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
            {deployed ? formatCluster(t.verifyClaimDeployed) : t.verifyClaimNotDeployed}
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
            {/* Only a real run has a signature, and only then is there a row to
                show: the animated run never touched a chain, so it has nothing
                to point at. */}
            {runSignature && isFilled(runSignature) && (
              <Row
                labelKey="chainRealSignature"
                value={runSignature}
                href={solscanTxUrl(runSignature)}
              />
            )}
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
