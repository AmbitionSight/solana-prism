import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';
import type { ResultOutcome } from './AttackResult';

/**
 * The ownership attack's payoff line.
 *
 * The same three outcomes lesson one's result speaks about, but the sentences
 * are lesson two's: here the attacker *did* sign, and what the two verdicts turn
 * on is whether the account was the protocol's. The titles are shared — a
 * refusal is a refusal in either lesson — and only the bodies differ.
 */
const COPY: Record<ResultOutcome, { title: MessageKey; body?: MessageKey }> = {
  success: { title: 'resultSuccessTitle', body: 'resultOwnerSuccessBody' },
  rejected: { title: 'resultRejectedTitle', body: 'resultOwnerRejectedBody' },
  failed: { title: 'chainAttemptFailed' },
};

interface OwnerResultProps {
  outcome: ResultOutcome;
  /** The chain's own words, shown as evidence rather than translated. */
  detail?: string;
}

export default function OwnerResult({ outcome, detail }: OwnerResultProps) {
  const { t } = useLanguage();
  const { title, body } = COPY[outcome];

  return (
    <div
      className={`attack-result attack-result--${outcome}`}
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
