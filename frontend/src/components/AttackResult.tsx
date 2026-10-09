import { attackOutcome, type AttackOutcome } from '../lib/steps';
import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

const COPY: Record<AttackOutcome, { title: MessageKey; body: MessageKey }> = {
  success: { title: 'resultSuccessTitle', body: 'resultSuccessBody' },
  rejected: { title: 'resultRejectedTitle', body: 'resultRejectedBody' },
};

/** Step 5's payoff line, chosen by which build of the contract was attacked. */
export default function AttackResult({ isFixed }: { isFixed: boolean }) {
  const { t } = useLanguage();

  const outcome = attackOutcome(isFixed);
  const { title, body } = COPY[outcome];

  return (
    <div
      className={`attack-result attack-result--${outcome}`}
      data-testid="attack-result"
      role="status"
    >
      <h2 className="attack-result__title">{t[title]}</h2>
      <p className="attack-result__body">{t[body]}</p>
    </div>
  );
}
