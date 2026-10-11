import { useCallback, useEffect, useRef, useState } from 'react';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import {
  AUTO_ADVANCE_MS,
  TX_CARD_MS,
  nextStep,
  prevStep,
  type AttackState,
  type Step,
} from '../lib/steps';
import ContractLayers, { type LayersMode } from './ContractLayers';
import ForgeCredit from './ForgeCredit';
import LanguageToggle from './LanguageToggle';
import OwnerFix from './OwnerFix';
import OwnerResult from './OwnerResult';
import OwnerRetry from './OwnerRetry';
import OwnerTxCard, { type OwnerTxPayload } from './OwnerTxCard';
import Step1Title from './Step1Title';
import Step2Code from './Step2Code';
import VerifyPanel from './VerifyPanel';
import WhyOwnership from './WhyOwnership';
import { PLATFORM, isFilled } from '../config/verification';
import { demoSigner } from '../config/demoSigner';
import { useLanguage } from '../i18n/language';
import { LessonContext } from '../lib/lessonContext';
import type { Lesson } from '../lib/lesson';
import { verdictOf, type ChainResult } from '../lib/devnetRun';
import { vaultPda } from '../lib/ownerChain';
import { executeOwnerRun } from '../lib/ownerRun';
import { createOwnerVaultReader, ownerPorts } from '../lib/ownerPorts';
import '../styles/app.css';
import '../styles/animations.css';

/**
 * Lesson two's app — the same eight-page machine as lesson one, carrying a
 * different lesson.
 *
 * It is deliberately its own component rather than a parameterisation of `App`.
 * The two lessons share the flow's geometry, the narrated opening and the arrow
 * keys, but nothing about their *attacks* coincides: lesson one scans a pool of
 * vaults and calls `withdraw` with an address; lesson two forges an account with
 * a second program and calls `withdraw` with that account. Folding both into one
 * orchestrator would mean a component that branches on the lesson at every step
 * — a generic abstraction serving two things that are not the same shape. What
 * they genuinely share (the flow, the listing, the verify panel, the page
 * state machine) is already components and data, and is reused as such.
 *
 * The teaching pages are lesson two's own: `ForgeCredit`, `WhyOwnership`,
 * `OwnerFix` — none of which would read correctly with lesson one's signer prose.
 */

/** The repaired build is attacked on the last page, as in lesson one. */
const FIXED_FROM_STEP: Step = 8;

/** How long page 3's cards hold their scattered layout before they settle. */
const DECOMPOSE_MS = 1600;

type BlockedResult = Extract<ChainResult, { kind: 'notConfigured' | 'failed' }>;

export default function OwnerApp({
  lesson,
  initialStep = 1,
  onExit,
}: {
  lesson: Lesson;
  initialStep?: Step;
  onExit?: () => void;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(initialStep);
  const [flowSettled, setFlowSettled] = useState(false);
  const [attackState, setAttackState] = useState<AttackState>('idle');

  const [payload, setPayload] = useState<OwnerTxPayload | null>(null);
  const [chainResult, setChainResult] = useState<ChainResult | null>(null);
  const [chainBusy, setChainBusy] = useState(false);
  const [dotLanded, setDotLanded] = useState(false);
  const [blocked, setBlocked] = useState<BlockedResult | null>(null);

  /** Bumped on every page move, so a late chain answer is recognised as stale. */
  const runToken = useRef(0);
  /** Where step 2's stage boxes sat, so the flow's cards start from there. */
  const regionRects = useRef<Record<string, DOMRect>>({});

  // Steps 1-3 narrate themselves; every later page waits for the reader.
  useEffect(() => {
    const delay = AUTO_ADVANCE_MS[step];
    if (delay === undefined) return;
    const id = window.setTimeout(() => {
      const next = nextStep(step);
      if (next !== null) setStep(next);
    }, delay);
    return () => window.clearTimeout(id);
  }, [step]);

  // Page 3's decomposition ends on its own timer, in place.
  useEffect(() => {
    if (step !== 3 || flowSettled) return;
    const id = window.setTimeout(() => setFlowSettled(true), DECOMPOSE_MS);
    return () => window.clearTimeout(id);
  }, [step, flowSettled]);

  const isFixed = step >= FIXED_FROM_STEP;

  // The payload card is a beat: it holds, then the dot drops.
  useEffect(() => {
    if (attackState !== 'showing-tx') return;
    const id = window.setTimeout(() => setAttackState('running'), TX_CARD_MS);
    return () => window.clearTimeout(id);
  }, [attackState]);

  // The verdict waits for both the dot and the chain, exactly as in lesson one.
  useEffect(() => {
    if (attackState !== 'running') return;
    if (!chainResult || !dotLanded) return;
    setAttackState('done');
  }, [attackState, chainResult, dotLanded]);

  const clearRun = useCallback(() => {
    runToken.current += 1;
    setPayload(null);
    setChainResult(null);
    setDotLanded(false);
    setChainBusy(false);
    setBlocked(null);
  }, []);

  // Arrow keys page through the lesson, and a page move takes the run with it.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
      const target = event.target as HTMLElement | null;
      if (
        target?.isContentEditable ||
        target?.tagName === 'INPUT' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'TEXTAREA'
      ) {
        return;
      }
      const next = event.key === 'ArrowUp' ? prevStep(step) : nextStep(step);
      if (next === null) return;
      event.preventDefault();
      setAttackState('idle');
      clearRun();
      setStep(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, clearRun]);

  /**
   * Execute — the real forge-and-drain.
   *
   * One message, two instructions: the attacker's program mints a credit, and
   * `withdraw` pays it from the vault. The demo key signs as the attacker, so
   * the lamports really move, and the verdict on screen is the cluster's answer
   * rather than a local rule. On the repaired build the same message is refused
   * before the handler runs, and that failed transaction is the evidence.
   */
  const handleExecute = useCallback(() => {
    clearRun();
    const token = (runToken.current += 1);
    const stale = () => runToken.current !== token;

    const programIdBase58 = isFixed
      ? lesson.verification.fixedProgramId
      : lesson.verification.vulnerableProgramId;
    if (!isFilled(programIdBase58)) {
      setBlocked({ kind: 'notConfigured' });
      return;
    }

    const connection = new Connection(PLATFORM.rpcEndpoint, 'confirmed');
    const attacker = demoSigner();
    setChainBusy(true);

    void executeOwnerRun(
      {
        config: {
          isFixed,
          vulnerableProgramId: lesson.verification.vulnerableProgramId,
          fixedProgramId: lesson.verification.fixedProgramId,
          counterfeitProgramId: lesson.verification.counterfeitProgramId ?? '',
          // What the forged credit claims: the lesson's own vulnerable balance.
          attackLamports: lesson.verification.vaultBefore,
        },
        vault: vaultPda(new PublicKey(programIdBase58)),
        // A fresh keypair: `init` needs an account that does not yet exist, and
        // the attacker has to sign for its creation.
        creditKeypair: Keypair.generate(),
        recipient: attacker.publicKey,
        readVault: createOwnerVaultReader(connection),
        ports: ownerPorts(connection, attacker),
        cancelled: stale,
      },
      {
        onTarget: (target) => {
          if (stale()) return;
          setPayload({
            programId: target.programId.toBase58(),
            vault: target.vault.toBase58(),
            credit: target.creditKeypair.publicKey.toBase58(),
            recipient: target.recipient.toBase58(),
          });
          setAttackState('showing-tx');
        },
        onResult: (result) => {
          if (stale()) return;
          setChainBusy(false);
          // Nothing was submitted, so there is no animation to hang a verdict
          // under — the control says so in its own words instead.
          if (result.kind === 'notConfigured') {
            setBlocked(result);
            return;
          }
          setChainResult(result);
        },
      },
    ).catch((error: unknown) => {
      if (stale()) return;
      setChainBusy(false);
      setBlocked({ kind: 'failed', reason: messageOf(error) });
    });
  }, [clearRun, isFixed, lesson]);

  const handleAttackEnd = useCallback(() => setDotLanded(true), []);

  const layersMode: LayersMode =
    step < 3 ? 'hidden' : step === 3 && !flowSettled ? 'decomposed' : 'flow';

  // The flow stays mounted across every page (its DOM identity is the harness's
  // rule), but is taken out of the layout while pages 6 and 7 are read.
  const flowHidden = step === 6 || step === 7;

  const chainVerdict = chainResult ? verdictOf(chainResult) : null;
  const showTxCard = attackState === 'showing-tx';

  const attackControls = (
    <div className="controls">
      <button
        type="button"
        className="execute-btn"
        data-testid="execute-btn"
        disabled={chainBusy || attackState === 'showing-tx' || attackState === 'running'}
        onClick={handleExecute}
      >
        {t.execute}
      </button>
      {blocked?.kind === 'notConfigured' && (
        <p className="attack-result__body">{t.demoNoTarget}</p>
      )}
      {blocked?.kind === 'failed' && (
        <p className="attack-result__body">
          {t.chainAttemptFailed}
          {blocked.reason && <code> {blocked.reason}</code>}
        </p>
      )}
    </div>
  );

  const attackVerdict = (
    <>
      {chainVerdict?.verdict && <OwnerResult outcome={chainVerdict.verdict} detail={chainVerdict.detail} />}
      {/* The one sentence that says what the real evidence does and does not
          show: on the vulnerable build real lamports moved. */}
      {chainVerdict?.verdict === 'success' && (
        <p className="attack-result__body">{t.ownerChainLamportsMoved}</p>
      )}
      {chainVerdict?.verdict === 'rejected' && (
        <p className="attack-result__body">{t.chainTxFailed}</p>
      )}
      <VerifyPanel runSignature={chainVerdict?.signature} outcome={chainVerdict?.verdict} />
    </>
  );

  return (
    <LessonContext.Provider value={lesson}>
      <div className="app" data-step={step}>
        {onExit && (
          <button type="button" className="back-btn" data-testid="exit-lesson" onClick={onExit}>
            {t.backToLessons}
          </button>
        )}

        <div className="top-controls">
          <LanguageToggle />
        </div>

        <main className="stage">
          {step === 1 && <Step1Title />}
          {step === 2 && (
            <Step2Code
              onRegionRects={(rects) => {
                regionRects.current = rects;
              }}
            />
          )}

          {step >= 3 && (
            <>
              <div className={`layers-wrap${flowHidden ? ' is-hidden' : ''}`}>
                <ContractLayers
                  mode={layersMode}
                  isFixed={isFixed}
                  attackState={attackState}
                  onAttackEnd={handleAttackEnd}
                  originRects={regionRects.current}
                />
                {showTxCard && payload && <OwnerTxCard payload={payload} />}
              </div>

              <div className="footer-slot">
                {step === 4 && <ForgeCredit />}
                {(step === 5 || step === 8) && attackControls}
                {step === 6 && <WhyOwnership />}
                {step === 7 && <OwnerFix />}

                {step === 8 && attackState === 'done' ? (
                  <div className="footer-pair">
                    <OwnerRetry />
                    <div className="footer-pair__verdict">
                      {attackVerdict}
                      {onExit && (
                        <button
                          type="button"
                          className="lesson-done-btn"
                          data-testid="lesson-done-home"
                          onClick={onExit}
                        >
                          {t.backToLessons}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {step === 8 && <OwnerRetry />}
                    {attackState === 'done' && attackVerdict}
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>
    </LessonContext.Provider>
  );
}

/** An exception's own words. Nothing here decides whether it was a refusal. */
function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
