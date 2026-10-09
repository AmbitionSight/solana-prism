import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';
import { TX_CARD_MS } from '../lib/steps';
import type { CSSProperties } from 'react';

/**
 * TxCard — the transaction payload, shown before the dot drops.
 *
 * This is the answer to the demo's biggest comprehension gap: the attack looks
 * like magic unless you first see that the admin's *address* is present while
 * the admin's *signature* is absent. The two annotations spell that out.
 *
 * Field names (`vault`, `authority`, `accounts:`, `signatures:`) stay in English
 * on purpose — they are literal names from a real transaction, and translating
 * them would put the demo out of step with what a viewer sees on Solscan. Only
 * the annotations around them are translated.
 */

interface AccountRow {
  field: string;
  value: string;
  noteKey: MessageKey;
  emphasis?: boolean;
}

interface SignatureRow {
  field: string;
  present: boolean;
  noteKey: MessageKey;
}

const ACCOUNTS: AccountRow[] = [
  { field: 'vault', value: '7xKm…9mPQ', noteKey: 'txNoteAttackerOwned' },
  {
    field: 'authority',
    value: 'ADMiN…x7wQ',
    noteKey: 'txNoteAdminPresent',
    emphasis: true,
  },
];

const SIGNATURES: SignatureRow[] = [
  { field: 'ATTACKER', present: true, noteKey: 'txNoteSigned' },
  { field: 'ADMIN', present: false, noteKey: 'txNoteSignatureAbsent' },
];

export default function TxCard() {
  const { t } = useLanguage();

  // The card's hold is the same constant the orchestration uses, so the absent
  // signature's exit is timed to land exactly as the card is dismissed.
  const style = { '--tx-hold': `${TX_CARD_MS}ms` } as CSSProperties;

  return (
    <div className="txcard-overlay" data-testid="tx-card" style={style}>
      <section className="txcard" aria-label={t.txTitle}>
        <header className="txcard__header">{t.txTitle}</header>

        <div className="txcard__group">
          <span className="txcard__label">accounts:</span>
          <ul className="txcard__list">
            {ACCOUNTS.map((row) => (
              <li
                className={`txcard__item${row.emphasis ? ' txcard__item--emphasis' : ''}`}
                key={row.field}
              >
                <span className="txcard__field">{row.field}</span>
                <code className="txcard__value">{row.value}</code>
                <span className="txcard__note">{t[row.noteKey]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="txcard__group">
          <span className="txcard__label">signatures:</span>
          <ul className="txcard__list">
            {SIGNATURES.map((row) => (
              <li
                className={`txcard__item${row.present ? '' : ' txcard__item--missing'}`}
                key={row.field}
              >
                <span className="txcard__field">{row.field}</span>
                <span
                  className={`txcard__mark txcard__mark--${row.present ? 'ok' : 'missing'}`}
                  aria-label={row.present ? t.ariaSignaturePresent : t.ariaSignatureAbsent}
                >
                  {row.present ? '✓' : '✗'}
                </span>
                <span className="txcard__note">{t[row.noteKey]}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
