import { useCallback, useEffect, useRef, useState } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  AUTO_ADVANCE_MS,
  TX_CARD_MS,
  nextStep,
  prevStep,
  type AttackState,
  type Step,
} from './lib/steps';
import AttackResult from './components/AttackResult';
import ContractLayers, { type LayersMode } from './components/ContractLayers';
import DevnetRun from './components/DevnetRun';
import FillAddress from './components/FillAddress';
import LanguageToggle from './components/LanguageToggle';
import RetryRefused from './components/RetryRefused';
import Step1Title from './components/Step1Title';
import Step2Code from './components/Step2Code';
import TheFix from './components/TheFix';
import TxCard, { type TxPayload } from './components/TxCard';
import VerifyPanel from './components/VerifyPanel';
import WalletButton from './components/WalletButton';
import WhyItHappens from './components/WhyItHappens';
import { PLATFORM } from './config/verification';
import { DEMO_SIGNER_PUBKEY } from './config/demoSigner';
import { useLanguage } from './i18n/language';
import { LessonContext } from './lib/lessonContext';
import type { Lesson } from './lib/lesson';
import { controlStatus, executeChainRun, verdictOf, type ChainResult } from './lib/devnetRun';
import { executeDemoAttack } from './lib/demoAttack';
import { attackPorts, createVaultReader } from './lib/solanaChain';
import { detectProvider, type SolanaProvider } from './lib/wallet';
import './styles/app.css';
import './styles/animations.css';

/**
 * A run result that produced no animation: the pool is exhausted, no authority
 * is configured, or the attempt never reached the chain at all. Each is reported
 * in the control's own words rather than by animating a drain that did not
 * happen. Derived from `ChainResult` rather than re-typed, so a new kind of
 * no-attempt result cannot slip past `handleExecute`'s switch and vanish.
 */
type BlockedResult = Extract<ChainResult, { kind: 'exhausted' | 'notConfigured' | 'failed' }>;

/**
 * Page 8 attacks the repaired build — the retry the whole lesson has been
 * building to. Which build is under attack is now a property of the page, not of
 * a manual switch: the vulnerable build is pages 3-7, the repaired one is page 8.
 */
const FIXED_FROM_STEP: Step = 8;

/** The attack page, where the caller's slot on stage 4 is filled in. */
const SLOT_FILLED_FROM_STEP: Step = 5;

/**
 * How long page 3's cards hold their scattered layout before they settle into
 * the flow. The decomposition is the page's own event: the cards start on the
 * page-2 code boxes, fly apart, then converge — all within page 3.
 */
const DECOMPOSE_MS = 1600;

/**
 * `initialStep` exists for one reason: the narrated pages are entered by timers,
 * and a test that renders to a string runs no effects, so it cannot wait for
 * them. Passing a later step directly lets a test hold the demo in the state the
 * default path must keep behaving in. The app itself never passes it, so the
 * demo still opens on step 1.
 *
 * `onExit` is the way back to the lesson list. It is optional so a render
 * without it (every unit test, and the fixtures) is byte-for-byte what it was
 * before the shell existed: with no callback there is no control to draw. The
 * shell always passes one, so a learner inside the app is never trapped.
 *
 * `lesson` is the substance being rendered — its stages, its contract, its
 * on-chain evidence — fetched from the lesson folder and handed here as a prop.
 * The app no longer imports any of it, so a test can render a lesson object with
 * no network, and a second lesson needs no change to this file. It is provided
 * to the tree below through `LessonContext`.
 */
export default function App({
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
  /**
   * Whether page 3's cards have settled into the flow yet. They start scattered
   * (from the page-2 code boxes) and converge a beat later, so the decomposition
   * happens on the page that shows the flow rather than across a page change.
   */
  const [flowSettled, setFlowSettled] = useState(false);
  const [attackState, setAttackState] = useState<AttackState>('idle');
  /**
   * The wallet, detected once and held here rather than inside the button: the
   * real-run layer needs the same provider to sign with, and two detections
   * could disagree.
   */
  const [provider] = useState<SolanaProvider | null>(() => detectProvider());
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  /**
   * The real run. `payload` is set the moment there is something real to
   * submit — which is also what puts the transaction card on screen — and
   * `result` is the chain's answer, which may arrive long after.
   */
  const [payload, setPayload] = useState<TxPayload | null>(null);
  const [chainResult, setChainResult] = useState<ChainResult | null>(null);
  /** True from the click until the chain answers, including the pool scan. */
  const [chainBusy, setChainBusy] = useState(false);
  /** Whether the dot's drop has finished — the real verdict waits for it. */
  const [dotLanded, setDotLanded] = useState(false);

  /**
   * The no-attempt outcomes of the primary Execute run — set when the run
   * reports the pool is empty, no authority is configured, or the attempt never
   * reached the chain. It is the control's own sentence for a real state, never
   * an animated drain that did not happen.
   */
  const [demoBlocked, setDemoBlocked] = useState<BlockedResult | null>(null);

  /**
   * Bumped whenever the page moves on. A chain answer that arrives after that
   * belongs to a run nobody is waiting for any more, and acting on it would put
   * one run's verdict under another run's animation.
   */
  const runToken = useRef(0);

  // Steps 1-3 narrate themselves; step 4 has no entry in AUTO_ADVANCE_MS and
  // therefore waits for the user.
  useEffect(() => {
    const delay = AUTO_ADVANCE_MS[step];
    if (delay === undefined) return;
    const id = window.setTimeout(() => {
      const next = nextStep(step);
      if (next !== null) setStep(next);
    }, delay);
    return () => window.clearTimeout(id);
  }, [step]);

  // Page 3's decomposition happens in place: the cards first land on the page-2
  // code boxes, then fly apart, then settle into the flow. The scatter is not a
  // separate page any more, so this timer is what ends it.
  useEffect(() => {
    if (step !== 3 || flowSettled) return;
    const id = window.setTimeout(() => setFlowSettled(true), DECOMPOSE_MS);
    return () => window.clearTimeout(id);
  }, [step, flowSettled]);

  /**
   * Which build the flow is drawn for. The repair is page 7's story, and page 8
   * attacks the repaired build, so from page 8 the security node reads green and
   * demands a signature. Pages 3-7 show the shipped, vulnerable build.
   */
  const isFixed = step >= FIXED_FROM_STEP;

  // Holding the payload on screen is an orchestration beat, not a race to
  // avoid — unlike the drop itself, which ends on its own animation event.
  useEffect(() => {
    if (attackState !== 'showing-tx') return;
    const id = window.setTimeout(() => setAttackState('running'), TX_CARD_MS);
    return () => window.clearTimeout(id);
  }, [attackState]);

  // The verdict is the chain's now, so the result waits for both: the drop has
  // to finish before a finding can be shown under it, and the chain has to have
  // answered. Whichever is slower sets the pace; the dot never decides the
  // outcome, only when it may be shown.
  useEffect(() => {
    if (attackState !== 'running') return;
    if (!chainResult || !dotLanded) return;
    setAttackState('done');
  }, [attackState, chainResult, dotLanded]);

  /**
   * Take the page back off the chain.
   *
   * Called whenever the demo restarts or switches build, so a run that is still
   * planning cannot land under the new state — and so the next run starts from a
   * clean slate rather than under a stale result from the last one.
   */
  const clearRealRun = useCallback(() => {
    runToken.current += 1;
    setPayload(null);
    setChainResult(null);
    setDotLanded(false);
    setChainBusy(false);
    setDemoBlocked(null);
  }, []);

  /**
   * Step through the demo by hand: ↓ forward, ↑ back.
   *
   * A narrator who wants the previous page should not have to wait out the
   * timer. It works mid-narration because the auto-advance effect above is keyed
   * on `step`: setting it here re-runs that effect, which clears the timer that
   * was armed for the page being left and arms a fresh one for the page arrived
   * at — so pressing ↓ while page 2 narrates moves on at once instead of
   * queueing behind the 9s timer.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;

      // A focused form control owns the arrow keys: a radio group uses ↑/↓ to
      // move between its options and a text field to move the caret. Taking the
      // key from it would make those pages unusable, so the control keeps it.
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

      // The arrow keys are the paging gesture here, and the demo is paged, not
      // scrolled. Every page now fits the reference viewport, so on the default
      // path there is nothing for the browser's own arrow-key scroll to move —
      // but the suppression is kept as a guard, not an everyday event: it stops
      // the key from scrolling if content ever overflows (a regression, a
      // shorter window, or the opt-in post-attack reveal, which adds the closing
      // note and the verify panel below the flow). Without it, the page change
      // and a native scroll would run together and read as a conflict. It is
      // claimed only on the path where this handler acts: the guards above
      // return early for a focused form control (a radio group still needs ↑/↓
      // for its options) and at the first/last page, so keys this handler does
      // not act on are never swallowed.
      event.preventDefault();

      // Leaving a page takes the run with it — a chain answer that lands after
      // the move belongs to a page nobody is on any more. The same reset the
      // execute path uses, so there is only one of it.
      setAttackState('idle');
      clearRealRun();
      setStep(next);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [step, clearRealRun]);

  /**
   * Execute — the attack, for real.
   *
   * This used to be pure theatre: it started the visual and let `attackOutcome`
   * decide the verdict from the selected build. Now it runs the same machinery
   * the wallet path uses (`lib/devnetRun.ts`), with the demo key as the signer
   * instead of a wallet (`lib/demoAttack.ts`) — so the transaction is real, the
   * verdict is the chain's, and the signature in the verify panel is one Solscan
   * can find. The visual is kept because it is the reveal; what changed is that
   * it now sits under a real result rather than standing in for one.
   */
  const handleExecute = useCallback(() => {
    clearRealRun();

    const token = (runToken.current += 1);
    const connection = new Connection(PLATFORM.rpcEndpoint, 'confirmed');
    const stale = () => runToken.current !== token;

    // Set before planning so the button is disabled through the pool scan too,
    // not only once `onTarget` has put the card up.
    setChainBusy(true);

    void executeDemoAttack(
      connection,
      {
        isFixed,
        vulnerableProgramId: lesson.verification.vulnerableProgramId,
        fixedProgramId: lesson.verification.fixedProgramId,
        adminPubkey: lesson.verification.adminPubkey,
        poolSize: PLATFORM.poolSize,
      },
      {
        onTarget: (target) => {
          if (stale()) return;
          setPayload({
            programId: target.programId.toBase58(),
            vault: target.vault.toBase58(),
            authority: target.authority.toBase58(),
            // The demo key — the fee payer and the only signature on this
            // transaction. The wallet plays no part on this path.
            signer: DEMO_SIGNER_PUBKEY,
          });
          setAttackState('showing-tx');
        },
        onResult: (result) => {
          if (stale()) return;
          setChainBusy(false);
          // These two never reached `onTarget`: there is no transaction and no
          // animation, so the control says so in its own words. A `failed` here
          // cannot be one of these — it comes from `runAttack`, which only runs
          // after `onTarget` — so it belongs under the animation with the rest.
          if (result.kind === 'exhausted' || result.kind === 'notConfigured') {
            setDemoBlocked(result);
            return;
          }
          setChainResult(result);
        },
      },
      stale,
    ).catch((error: unknown) => {
      // Planning is itself a chain call and can fail — an unreachable RPC is the
      // ordinary case. No transaction was built, so this is not a verdict, just
      // the reason the attempt never began.
      if (stale()) return;
      setChainBusy(false);
      setDemoBlocked({ kind: 'failed', reason: messageOf(error) });
    });
  }, [clearRealRun, isFixed, lesson]);

  const handleAttackEnd = useCallback(() => {
    // The dot's drop is over; the verdict waits for the chain. There is no local
    // verdict any more — every run that reaches here has a real transaction, so
    // the result is the chain's answer and never `attackOutcome`'s guess.
    setDotLanded(true);
  }, []);

  /**
   * Run the real attack with the visitor's own wallet.
   *
   * Nothing here decides what is true: `lib/devnetRun.ts` picks the vault and
   * reports the outcome, and this only moves the same `attackState` machine the
   * primary Execute run uses. A pool that turns out to be empty ends the attempt
   * before the animation starts, because there is nothing to animate.
   */
  const handleRealRun = useCallback(() => {
    if (!provider || !walletAddress) return;

    const token = (runToken.current += 1);
    const connection = new Connection(PLATFORM.rpcEndpoint, 'confirmed');
    const stale = () => runToken.current !== token;

    setChainBusy(true);
    setPayload(null);
    setChainResult(null);
    setDotLanded(false);
    // A wallet run replaces whatever the primary path last said: the stale
    // "nothing to attack" sentence belongs to that run, not to this one.
    setDemoBlocked(null);

    void executeChainRun(
      {
        config: {
          isFixed,
          vulnerableProgramId: lesson.verification.vulnerableProgramId,
          fixedProgramId: lesson.verification.fixedProgramId,
          adminPubkey: lesson.verification.adminPubkey,
          poolSize: PLATFORM.poolSize,
        },
        // A vault is identified by the program that owns it. Only the vulnerable
        // build scans the pool, so its id is the owner the reader insists on —
        // that is what keeps the fixed build's vault from being picked.
        read: createVaultReader(connection, new PublicKey(lesson.verification.vulnerableProgramId)),
        portsFor: (programId) => attackPorts(connection, provider, programId),
        cancelled: stale,
      },
      {
        onTarget: (target) => {
          if (stale()) return;
          setPayload({
            // The program this run actually called: the selected build, fixed
            // or vulnerable. `ChainTarget` carries it, so the card names the
            // address the transaction did rather than borrowing the demo's.
            programId: target.programId.toBase58(),
            vault: target.vault.toBase58(),
            authority: target.authority.toBase58(),
            // `withdraw` declares no signer, so the only signature on this
            // transaction is the visitor's own — which is the whole reason a
            // visitor can run the real attack without the admin's key.
            signer: walletAddress,
          });
          setAttackState('showing-tx');
        },
        onResult: (result) => {
          if (stale()) return;
          setChainBusy(false);
          setChainResult(result);
        },
      },
    ).catch((error: unknown) => {
      // Looking for a vault is itself a chain call, and it can fail — an
      // unreachable RPC is the ordinary case. That is a run that never got
      // started, so it is reported as such rather than as a refusal.
      if (stale()) return;
      setChainBusy(false);
      setChainResult({ kind: 'failed', reason: messageOf(error) });
    });
  }, [provider, walletAddress, isFixed, lesson]);

  /** Where step 2's stage boxes sat, handed to the flow so the cards start there. */
  const regionRects = useRef<Record<string, DOMRect>>({});

  // The flow's layout, all on one page now: page 3 seeds the cards onto the
  // page-2 code boxes, scatters them, then settles them into the flow. Every
  // later page keeps the settled flow — the same component, the same nodes.
  const layersMode: LayersMode =
    step < 3 ? 'hidden' : step === 3 && !flowSettled ? 'decomposed' : 'flow';

  // Pages 6 and 7 are not part of the flow's story: the flow stays mounted (its
  // DOM identity is load-bearing across pages 3-8) but is taken out of the
  // layout while the two-pane comparison and the diff are read. Hiding it — not
  // unmounting it — keeps the DOM identity the harness's iron rule 1 depends on.
  //
  // The post-attack state deliberately does NOT hide it. The flow is the
  // evidence the verdict is drawn from, and its final state on the attack page —
  // the flawed node still red, the comparison node filled and matching — is what
  // the reader should be left looking at. It fits, because the closing note that
  // used to sit under the verdict has moved to the page that is actually about
  // why the mistake is made.
  const flowHidden = step === 6 || step === 7;

  // Stage 4's caller slot is blank until the attack supplies the admin's address.
  const slotFilled = step >= SLOT_FILLED_FROM_STEP;

  const chainVerdict = chainResult ? verdictOf(chainResult) : null;
  const chainStatus = controlStatus(chainResult, payload !== null, chainBusy);

  // The card comes up whenever the beat is showing, and it always has a real
  // payload behind it now: the beat only starts from `onTarget`, which carries
  // this run's own program, vault and authority. The rows that carry the lesson
  // are the signatures ("ATTACKER ✓ / ADMIN ✗").
  const showTxCard = attackState === 'showing-tx';

  // The attack controls, on the two pages that run an attack: page 5 (the
  // vulnerable build) and page 8 (the repaired one). Rendered from one place so
  // the two pages cannot drift, and so the Execute button — and therefore the
  // real run — exists on exactly those pages and no others.
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
      <DevnetRun
        isFixed={isFixed}
        providerPresent={provider !== null}
        connected={walletAddress !== null}
        programId={isFixed ? lesson.verification.fixedProgramId : lesson.verification.vulnerableProgramId}
        status={chainStatus}
        onRun={handleRealRun}
      />
      {/* The no-attempt outcomes, each in the control's own words: an empty
          pool, a missing authority, or an attempt that never reached the chain.
          None of them animates a drain that did not happen. */}
      {demoBlocked?.kind === 'exhausted' && (
        <p className="attack-result__body">{t.chainExhausted}</p>
      )}
      {demoBlocked?.kind === 'notConfigured' && (
        <p className="attack-result__body">{t.demoNoTarget}</p>
      )}
      {demoBlocked?.kind === 'failed' && (
        <p className="attack-result__body">
          {t.chainAttemptFailed}
          {demoBlocked.reason && <code> {demoBlocked.reason}</code>}
        </p>
      )}
    </div>
  );

  // The verdict and the evidence that frame it: the chain's own answer, the one
  // sentence saying what that answer does and does not show, and the control
  // that opens the panel behind it. It stays on the page the attack happened on,
  // under the flow it was drawn from — on the retry page, beside the reading.
  const attackVerdict = (
    <>
      <AttackResult
        isFixed={isFixed}
        outcome={chainVerdict?.verdict ?? undefined}
        detail={chainVerdict?.detail}
      />
      {/* What the real evidence does and does not show. Both lines are only
          reachable through a real run: with no chain answer there is no verdict
          here to annotate. */}
      {chainVerdict?.verdict === 'success' && (
        <p className="attack-result__body">{t.chainNotLamports}</p>
      )}
      {chainVerdict?.verdict === 'rejected' && (
        <p className="attack-result__body">{t.chainTxFailed}</p>
      )}
      <VerifyPanel runSignature={chainVerdict?.signature} outcome={chainVerdict?.verdict} />
    </>
  );

  return (
    <LessonContext.Provider value={lesson}>
    {/* data-step is the machine-readable current step. The visible page counter
        was removed, so the verification harness reads this instead of scraping
        the DOM for text that is no longer rendered. */}
    <div className="app" data-step={step}>
      {/* The way out, at every page of the lesson. Deliberately in the top-left
          corner rather than in the top-right chrome: the flow's cards reach into
          that corner on the tall pages, and a control there would land on the
          lesson. The top-left is empty on every page — the stage is centred — so
          the exit sits in the margin, quiet and out of the way. It is drawn only
          when the shell gives it something to do: a render with no `onExit`
          emits exactly what it did before this control existed. */}
      {onExit && (
        <button type="button" className="back-btn" data-testid="exit-lesson" onClick={onExit}>
          {t.backToLessons}
        </button>
      )}

      <div className="top-controls">
        <WalletButton
          provider={provider}
          address={walletAddress}
          onAddressChange={setWalletAddress}
        />
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
                slotFilled={slotFilled}
                onAttackEnd={handleAttackEnd}
                originRects={regionRects.current}
              />
              {showTxCard && <TxCard payload={payload ?? undefined} />}
            </div>

            {/* Reserved from page 3 so the stack never shifts while the attack
                plays — a layout jump mid-animation would read as a glitch. */}
            <div className="footer-slot">
              {step === 4 && <FillAddress />}
              {(step === 5 || step === 8) && attackControls}
              {step === 6 && <WhyItHappens />}
              {step === 7 && <TheFix />}

              {/* The retry page's footer once the attack has run: the reading
                  and the verdict side by side. Stacked, they — with the flow
                  still up as the evidence — were taller than the 1280x820 fold;
                  side by side the section is as tall as its taller half, so the
                  flow, the reading and the verdict all fit at once. Read left
                  then right, the same order they are stacked in everywhere else. */}
              {step === 8 && attackState === 'done' ? (
                <div className="footer-pair">
                  <RetryRefused />
                  <div className="footer-pair__verdict">
                    {attackVerdict}
                    {/* The lesson is over here: the refusal is shown, with its
                        evidence. This is the way home from the end — the
                        deliberate one, under the verdict, not merely the chrome
                        control that is available on every page. */}
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
                  {step === 8 && <RetryRefused />}
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
