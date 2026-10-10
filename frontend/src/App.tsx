import { useCallback, useEffect, useRef, useState } from 'react';
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
import FixToggle from './components/FixToggle';
import LanguageToggle from './components/LanguageToggle';
import Step1Title from './components/Step1Title';
import Step2Code from './components/Step2Code';
import TxCard from './components/TxCard';
import VerifyPanel from './components/VerifyPanel';
import { useLanguage } from './i18n/language';
import './styles/app.css';
import './styles/animations.css';

export default function App() {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>(1);
  const [isFixed, setIsFixed] = useState(false);
  const [attackState, setAttackState] = useState<AttackState>('idle');
  /** Bumped on replay so the auto-advance timers restart from step 1. */
  const [runId, setRunId] = useState(0);

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

  const handleExecute = useCallback(() => setAttackState('showing-tx'), []);
  const handleAttackEnd = useCallback(() => setAttackState('done'), []);

  const handleFixChange = useCallback((next: boolean) => {
    setIsFixed(next);
    setAttackState('idle');
  }, []);

  const replay = useCallback(() => {
    setStep(1);
    setIsFixed(false);
    setAttackState('idle');
    setRunId((id) => id + 1);
  }, []);

  /** Where step 2's stage boxes sat, handed to step 3 so the cards start there. */
  const regionRects = useRef<Record<string, DOMRect>>({});

  const layersMode: LayersMode = step >= 4 ? 'stacked' : step === 3 ? 'decomposed' : 'hidden';

  return (
    // data-step is the machine-readable current step. The visible 01/05 counter
    // was removed, so the verification harness reads this instead of scraping
    // the DOM for text that is no longer rendered.
    <div className="app" data-step={step}>
      <div className="top-controls">
        <button type="button" className="replay-btn" onClick={replay}>
          {t.replay}
        </button>
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
              {attackState === 'showing-tx' && <TxCard />}
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
                </div>
              )}

              {attackState === 'done' && (
                <>
                  <AttackResult isFixed={isFixed} />
                  <ClosingNote />
                  <VerifyPanel />
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
