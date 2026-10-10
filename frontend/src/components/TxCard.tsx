import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';
import { TX_CARD_MS } from '../lib/steps';
import { elide } from '../lib/elide';
import type { DemoTarget } from '../lib/demoTarget';
import type { CSSProperties } from 'react';

/**
 * TxCard — the transaction payload, shown before the dot drops.
 *
 * This is the answer to the demo's biggest comprehension gap: the attack looks
 * like magic unless you first see that the admin's *address* is present while
 * the admin's *signature* is absent. The two annotations spell that out.
 *
 * Field names (`program`, `vault`, `authority`, `accounts:`, `signatures:`) stay
 * in English on purpose — they are literal names from a real transaction, and
 * translating them would put the demo out of step with what a viewer sees on
 * Solscan. Only the annotations around them are translated.
 *
 * The card names addresses only when it has real ones. A `payload` — which only
 * a real run has — carries this run's own accounts. With no payload the animated
 * path passes a resolved `demoTarget`, whose values came off the deployed
 * config and the on-chain pool. With neither, the card renders no address rows
 * at all: there is no state in which it invents one, which is why the two
 * placeholders it used to show (`7xKm…9mPQ`, `ADMiN…x7wQ`) are gone.
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

const ANIMATED_SIGNATURES: SignatureRow[] = [
  { field: 'ATTACKER', present: true, noteKey: 'txNoteSigned' },
  { field: 'ADMIN', present: false, noteKey: 'txNoteSignatureAbsent' },
];

/**
 * The account rows, from the most specific real source available.
 *
 * `payload` wins when there is one — a real run's own accounts are the truth
 * while it is in flight. Otherwise the resolved `demoTarget` supplies the
 * deployed program, a pool vault, and the ADMIN address. With neither there is
 * nothing honest to name, so the caller gets null and renders no rows rather
 * than a placeholder.
 *
 * The program row is only added for `demoTarget`: `TxPayload` has no program id,
 * and the demo target's is always the vulnerable build, whereas a real run can
 * be against the fixed build — borrowing the wrong one would be a lie.
 */
function accountsFor(payload?: TxPayload, demoTarget?: DemoTarget): AccountRow[] | null {
  if (payload) {
    return [
      { field: 'vault', value: elide(payload.vault), noteKey: 'txNoteVaultTarget' },
      {
        field: 'authority',
        value: elide(payload.authority),
        noteKey: 'txNoteAdminPresent',
        emphasis: true,
      },
    ];
  }
  if (demoTarget) {
    return [
      { field: 'program', value: elide(demoTarget.programId), noteKey: 'txNoteProgram' },
      { field: 'vault', value: elide(demoTarget.vault), noteKey: 'txNoteVaultTarget' },
      {
        field: 'authority',
        value: elide(demoTarget.authority),
        noteKey: 'txNoteAdminPresent',
        emphasis: true,
      },
    ];
  }
  return null;
}

function signaturesFor(payload?: TxPayload): SignatureRow[] {
  if (!payload) return ANIMATED_SIGNATURES;
  return [
    { field: 'ATTACKER', present: true, noteKey: 'txNoteSigned', value: elide(payload.signer) },
    { field: 'ADMIN', present: false, noteKey: 'txNoteSignatureAbsent' },
  ];
}

export default function TxCard({
  payload,
  demoTarget,
}: {
  payload?: TxPayload;
  demoTarget?: DemoTarget;
}) {
  const { t } = useLanguage();

  // The card's hold is the same constant the orchestration uses, so the absent
  // signature's exit is timed to land exactly as the card is dismissed.
  const style = { '--tx-hold': `${TX_CARD_MS}ms` } as CSSProperties;

  const accounts = accountsFor(payload, demoTarget);

  return (
    <div className="txcard-overlay" data-testid="tx-card" style={style}>
      <section className="txcard" aria-label={t.txTitle}>
        <header className="txcard__header">{t.txTitle}</header>

        {accounts && (
          <div className="txcard__group">
            <span className="txcard__label">accounts:</span>
            <ul className="txcard__list">
              {accounts.map((row) => (
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
        )}

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
