import { attackOutcome, type AttackOutcome } from '../lib/steps';
import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

/**
 * The three things a run can conclude.
 *
 * `failed` is not a refusal. `lib/chainRun.ts` keeps them apart on purpose — a
 * submission that never happened is not evidence about the program — so it gets
 * its own sentence here rather than the one about the runtime saying no.
 */
export type ResultOutcome = AttackOutcome | 'failed';

const COPY: Record<ResultOutcome, { title: MessageKey; body?: MessageKey }> = {
  success: { title: 'resultSuccessTitle', body: 'resultSuccessBody' },
  rejected: { title: 'resultRejectedTitle', body: 'resultRejectedBody' },
  failed: { title: 'chainAttemptFailed' },
};

interface AttackResultProps {
  /** Which build was attacked, for the animated run. */
  isFixed: boolean;
  /**
   * The real run's verdict, when there was one. Absent means the animation's
   * outcome is the verdict, which is what this component has always rendered.
   */
  outcome?: ResultOutcome;
  /** The chain's own words, shown as evidence rather than translated. */
  detail?: string;
}

/**
 * The attack's payoff line.
 *
 * Same rendering either way: what changes is where the verdict comes from. With
 * no explicit outcome it is derived from the selected build, exactly as before;
 * with one, the chain's answer wins.
 */
export default function AttackResult({ isFixed, outcome, detail }: AttackResultProps) {
  const { t } = useLanguage();

  const verdict = outcome ?? attackOutcome(isFixed);
  const { title, body } = COPY[verdict];

  return (
    <div
      className={`attack-result attack-result--${verdict}`}
      data-testid="attack-result"
      role="status"
    >
      <h2 className="attack-result__title">{t[title]}</h2>
      {body && <p className="attack-result__body">{t[body]}</p>}
      {detail && (
        <p className="attack-result__body">
          <code>{detail}</code>
        </p>
      )}
    </div>
  );
}
