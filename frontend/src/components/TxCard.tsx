import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';
import { TX_CARD_MS } from '../lib/steps';
import { elide } from '../lib/elide';
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
 *
 * With a `payload` — which only a real run has — the two account values and the
 * signing address are this run's own, shown elided. With no payload the card
 * falls back to the constants the animation has always used, unchanged.
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
  /** The real signer's address, when there is a real run to name. */
  value?: string;
}

/**
 * What a real run puts on the card.
 *
 * `signer` is the visitor's own wallet: `withdraw` declares no signer at all
 * (see `lib/devnet.ts`), so the only signature on the transaction is the fee
 * payer's — which is exactly why a visitor can run the real attack alone.
 */
export interface TxPayload {
  vault: string;
  authority: string;
  signer: string;
}

const ANIMATED_ACCOUNTS: AccountRow[] = [
  { field: 'vault', value: '7xKm…9mPQ', noteKey: 'txNoteAttackerOwned' },
  {
    field: 'authority',
    value: 'ADMiN…x7wQ',
    noteKey: 'txNoteAdminPresent',
    emphasis: true,
  },
];

const ANIMATED_SIGNATURES: SignatureRow[] = [
  { field: 'ATTACKER', present: true, noteKey: 'txNoteSigned' },
  { field: 'ADMIN', present: false, noteKey: 'txNoteSignatureAbsent' },
];

function accountsFor(payload?: TxPayload): AccountRow[] {
  if (!payload) return ANIMATED_ACCOUNTS;
  return [
    { field: 'vault', value: elide(payload.vault), noteKey: 'txNoteAttackerOwned' },
    {
      field: 'authority',
      value: elide(payload.authority),
      noteKey: 'txNoteAdminPresent',
      emphasis: true,
    },
  ];
}

function signaturesFor(payload?: TxPayload): SignatureRow[] {
  if (!payload) return ANIMATED_SIGNATURES;
  return [
    { field: 'ATTACKER', present: true, noteKey: 'txNoteSigned', value: elide(payload.signer) },
    { field: 'ADMIN', present: false, noteKey: 'txNoteSignatureAbsent' },
  ];
}

export default function TxCard({ payload }: { payload?: TxPayload }) {
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
            {accountsFor(payload).map((row) => (
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
            {signaturesFor(payload).map((row) => (
              <li
                className={`txcard__item${row.present ? '' : ' txcard__item--missing'}`}
                key={row.field}
              >
                <span className="txcard__field">{row.field}</span>
                {row.value && <code className="txcard__value">{row.value}</code>}
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
