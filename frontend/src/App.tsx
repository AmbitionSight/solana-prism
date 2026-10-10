import { useCallback, useEffect, useRef, useState } from 'react';
import { Connection } from '@solana/web3.js';
import {
  AUTO_ADVANCE_MS,
  TX_CARD_MS,
  nextStep,
  type AttackState,
  type Step,
} from './lib/steps';
import AttackResult from './components/AttackResult';
import ClosingNote from './components/ClosingNote';
import ContractLayers, { type LayersMode } from './components/ContractLayers';
import DevnetRun from './components/DevnetRun';
import FixToggle from './components/FixToggle';
import LanguageToggle from './components/LanguageToggle';
import Step1Title from './components/Step1Title';
import Step2Code from './components/Step2Code';
import TxCard, { type TxPayload } from './components/TxCard';
import VerifyPanel from './components/VerifyPanel';
import WalletButton from './components/WalletButton';
import { VERIFICATION } from './config/verification';
import { useLanguage } from './i18n/language';
import { controlStatus, executeChainRun, verdictOf, type ChainResult } from './lib/devnetRun';
import { resolveDemoTarget, type DemoTargetResolution } from './lib/demoTarget';
import { attackPorts, createVaultReader } from './lib/solanaChain';
import { detectProvider, type SolanaProvider } from './lib/wallet';
import './styles/app.css';
import './styles/animations.css';

/**
 * Why the animated path cannot honestly run — every resolution that is not a
 * target. Derived from `DemoTargetResolution` rather than re-typed, so a new
 * kind cannot slip past `handleExecute`'s test and start a beat with no card.
 */
type BlockedKind = Exclude<DemoTargetResolution['kind'], 'target'>;

/**
 * `initialStep` exists for one reason: step 5 is entered by timers, and a test
 * that renders to a string runs no effects, so it cannot wait for them. Passing
 * the final step directly lets a test hold the demo in the state the default
 * path must keep behaving in. The app itself never passes it, so the demo still
 * opens on step 1.
 */
export default function App({ initialStep = 1 }: { initialStep?: Step } = {}) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(initialStep);
  const [isFixed, setIsFixed] = useState(false);
  const [attackState, setAttackState] = useState<AttackState>('idle');
  /** Bumped on replay so the auto-advance timers restart from step 1. */
  const [runId, setRunId] = useState(0);

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
   * What the animated path names when there is no wallet — resolved once, at
   * page load.
   *
   * `null` means not settled yet. The resolution is an RPC round trip, so
   * before it lands the card has no address to show and renders without its
   * `accounts:` rows; the address rows appear once it settles. Step 5 is only
   * reachable after steps 1-4 auto-advance, so in practice it settles long
   * before anyone gets there.
   */
  const [demoTarget, setDemoTarget] = useState<DemoTargetResolution | null>(null);

  /**
   * Why the animated path cannot honestly run, set when Execute is pressed.
   *
   * Read from the same `demoTarget` the card does, so the sentence and the card
   * can never disagree about what is attackable.
   */
  const [demoBlocked, setDemoBlocked] = useState<BlockedKind | null>(null);

  /**
   * Bumped whenever the page moves on. A chain answer that arrives after that
   * belongs to a run nobody is waiting for any more, and acting on it would put
   * one run's verdict under another run's animation.
   */
  const runToken = useRef(0);

  /**
   * Resolve the animated path's real target once, at page load.
   *
   * `resolveDemoTarget` reports its own failures as states rather than throwing,
   * so this guard is only about unmount: a resolution landing after the page is
   * gone must not set state.
   */
  useEffect(() => {
    let cancelled = false;
    const connection = new Connection(VERIFICATION.rpcEndpoint, 'confirmed');
    void resolveDemoTarget(createVaultReader(connection)).then((resolved) => {
      if (!cancelled) setDemoTarget(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Steps 1-4 narrate themselves; step 5 has no entry in AUTO_ADVANCE_MS and
  // therefore waits for the user.
  useEffect(() => {
    const delay = AUTO_ADVANCE_MS[step];
    if (delay === undefined) return;
    const id = window.setTimeout(() => {
      const next = nextStep(step);
      if (next !== null) setStep(next);
    }, delay);
    return () => window.clearTimeout(id);
  }, [step, runId]);

  // Holding the payload on screen is an orchestration beat, not a race to
  // avoid — unlike the drop itself, which ends on its own animation event.
  useEffect(() => {
    if (attackState !== 'showing-tx') return;
    const id = window.setTimeout(() => setAttackState('running'), TX_CARD_MS);
    return () => window.clearTimeout(id);
  }, [attackState]);

  // The animated run's verdict is the animation, so it lands on the animation's
  // own end — unchanged. A real run's verdict is the chain's, so it waits for
  // both: the drop has to finish before a finding can be shown under it.
  useEffect(() => {
    if (attackState !== 'running') return;
    if (!chainResult || !dotLanded) return;
    setAttackState('done');
  }, [attackState, chainResult, dotLanded]);

  /**
   * Take the page back off the chain.
   *
   * Called whenever the demo restarts or switches build, so a run that is still
   * planning cannot land under the new state — and so the next drop is the
   * animation's verdict again rather than a stale one from the chain.
   */
  const clearRealRun = useCallback(() => {
    runToken.current += 1;
    setPayload(null);
    setChainResult(null);
    setDotLanded(false);
    setChainBusy(false);
    setDemoBlocked(null);
  }, []);

  const handleExecute = useCallback(() => {
    clearRealRun();
    // An empty pool and a missing authority are real states, and neither is
    // attackable. The animated path says so with the same sentence the real path
    // uses, rather than starting a beat whose transaction card would have no
    // honest address to name. Tested against `'target'` (and typed as
    // `BlockedKind`) so a new non-target kind is caught here instead of falling
    // through to a beat that renders nothing.
    if (demoTarget && demoTarget.kind !== 'target') {
      setDemoBlocked(demoTarget.kind);
      return;
    }
    setAttackState('showing-tx');
  }, [clearRealRun, demoTarget]);

  const handleAttackEnd = useCallback(() => {
    // With no real run in flight this is the verdict, exactly as before.
    if (!payload) {
      setAttackState('done');
      return;
    }
    setDotLanded(true);
  }, [payload]);

  const handleFixChange = useCallback(
    (next: boolean) => {
      setIsFixed(next);
      setAttackState('idle');
      clearRealRun();
    },
    [clearRealRun],
  );

  const replay = useCallback(() => {
    setStep(1);
    setIsFixed(false);
    setAttackState('idle');
    setRunId((id) => id + 1);
    clearRealRun();
  }, [clearRealRun]);

  /**
   * Run the real attack.
   *
   * Nothing here decides what is true: `lib/devnetRun.ts` picks the vault and
   * reports the outcome, and this only moves the same `attackState` machine the
   * animated path uses. A pool that turns out to be empty ends the attempt
   * before the animation starts, because there is nothing to animate.
   */
  const handleRealRun = useCallback(() => {
    if (!provider || !walletAddress) return;

    const token = (runToken.current += 1);
    const connection = new Connection(VERIFICATION.rpcEndpoint, 'confirmed');
    const stale = () => runToken.current !== token;

    setChainBusy(true);
    setPayload(null);
    setChainResult(null);
    setDotLanded(false);
    // A real run replaces whatever the animated path last said: the stale
    // "nothing to attack" sentence belongs to the demo target, not to this run.
    setDemoBlocked(null);

    void executeChainRun(
      {
        config: {
          isFixed,
          vulnerableProgramId: VERIFICATION.vulnerableProgramId,
          fixedProgramId: VERIFICATION.fixedProgramId,
          adminPubkey: VERIFICATION.adminPubkey,
          poolSize: VERIFICATION.poolSize,
        },
        read: createVaultReader(connection),
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
  }, [provider, walletAddress, isFixed]);

  /** Where step 2's stage boxes sat, handed to step 3 so the cards start there. */
  const regionRects = useRef<Record<string, DOMRect>>({});

  const layersMode: LayersMode = step >= 4 ? 'stacked' : step === 3 ? 'decomposed' : 'hidden';
  const chainVerdict = chainResult ? verdictOf(chainResult) : null;
  const chainStatus = controlStatus(chainResult, payload !== null, chainBusy);

  // The card comes up whenever the beat is showing, with whatever honest
  // addresses there are at that moment. `demoTarget` is passed only once it has
  // settled on a real target; before then `accountsFor` sees no source and
  // renders no address rows. The rows that carry the lesson are the signatures
  // ("ATTACKER ✓ / ADMIN ✗"), and those never depend on an address — dropping
  // the whole card for want of an address would hide precisely the argument it
  // exists to make.
  const txTarget = demoTarget?.kind === 'target' ? demoTarget.target : undefined;
  const showTxCard = attackState === 'showing-tx';

  return (
    // data-step is the machine-readable current step. The visible 01/05 counter
    // was removed, so the verification harness reads this instead of scraping
    // the DOM for text that is no longer rendered.
    <div className="app" data-step={step}>
      <div className="top-controls">
        <button type="button" className="replay-btn" onClick={replay}>
          {t.replay}
        </button>
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
            <div className="layers-wrap">
              <ContractLayers
                mode={layersMode}
                isFixed={isFixed}
                attackState={attackState}
                onAttackEnd={handleAttackEnd}
                originRects={regionRects.current}
              />
              {showTxCard && <TxCard payload={payload ?? undefined} demoTarget={txTarget} />}
            </div>

            {/* Reserved from step 3 so the stack never shifts while the attack
                plays — a layout jump mid-animation would read as a glitch. */}
            <div className="footer-slot">
              {step === 5 && (
                <div className="controls">
                  <FixToggle isFixed={isFixed} onChange={handleFixChange} />
                  <button
                    type="button"
                    className="execute-btn"
                    data-testid="execute-btn"
                    disabled={attackState === 'showing-tx' || attackState === 'running'}
                    onClick={handleExecute}
                  >
                    {t.execute}
                  </button>
                  <DevnetRun
                    isFixed={isFixed}
                    providerPresent={provider !== null}
                    connected={walletAddress !== null}
                    programId={
                      isFixed ? VERIFICATION.fixedProgramId : VERIFICATION.vulnerableProgramId
                    }
                    status={chainStatus}
                    onRun={handleRealRun}
                  />
                  {/* The animated path telling the same story the real path
                      does, when there is nothing it can honestly attack. */}
                  {demoBlocked === 'exhausted' && (
                    <p className="attack-result__body">{t.chainExhausted}</p>
                  )}
                  {demoBlocked === 'notConfigured' && (
                    <p className="attack-result__body">{t.demoNoTarget}</p>
                  )}
                </div>
              )}

              {attackState === 'done' && (
                <>
                  <AttackResult
                    isFixed={isFixed}
                    outcome={chainVerdict?.verdict ?? undefined}
                    detail={chainVerdict?.detail}
                  />
                  {/* What the real evidence does and does not show. Both lines
                      are only reachable through a real run: with no chain answer
                      there is no verdict here to annotate. */}
                  {chainVerdict?.verdict === 'success' && (
                    <p className="attack-result__body">{t.chainNotLamports}</p>
                  )}
                  {chainVerdict?.verdict === 'rejected' && (
                    <p className="attack-result__body">{t.chainTxFailed}</p>
                  )}
                  <ClosingNote />
                  <VerifyPanel runSignature={chainVerdict?.signature} />
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
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
