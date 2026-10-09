import { useCallback, useEffect, useState } from 'react';
import { AUTO_ADVANCE_MS, nextStep, type Step } from './lib/steps';
import './styles/app.css';

const TOTAL_STEPS = 5;

export default function App() {
  const [step, setStep] = useState<Step>(1);
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

  const replay = useCallback(() => {
    setStep(1);
    setRunId((id) => id + 1);
  }, []);

  return (
    <div className="app">
      <div className="step-indicator" data-testid="step-indicator">
        {String(step).padStart(2, '0')} / {String(TOTAL_STEPS).padStart(2, '0')}
      </div>

      <button type="button" className="replay-btn" onClick={replay}>
        Replay
      </button>

      <main className="stage">
        <div className="placeholder" data-testid="step-content">
          Step {step}
        </div>
      </main>
    </div>
  );
}
