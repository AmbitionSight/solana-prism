import type { CSSProperties } from 'react';
import { TX_CARD_MS } from '../lib/steps';
import { elide } from '../lib/elide';
import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

/**
 * OwnerTxCard — the payload of an ownership attack, shown before the dot drops.
 *
 * Lesson one's card makes one point: the admin's address is present and the
 * admin's signature is absent. Lesson two's attack is a different act, so its
 * card makes a different point — the account the protocol is asked to trust is
 * there, and it is not the protocol's. The signer is present, because the
 * attacker must sign as the recipient; that is not what is wrong here. What is
 * wrong is the `credit` row, and it is the only one emphasised.
 *
 * Field names stay in English on purpose, as on lesson one's card: they are
 * literal names from a real transaction, and translating them would put the
 * demo out of step with Solscan.
 */
export interface OwnerTxPayload {
  programId: string;
  vault: string;
  credit: string;
  recipient: string;
}

interface AccountRow {
  field: string;
  value: keyof OwnerTxPayload;
  noteKey: MessageKey;
  emphasis?: boolean;
}

const ACCOUNTS: AccountRow[] = [
  { field: 'program', value: 'programId', noteKey: 'txNoteProgram' },
  { field: 'vault', value: 'vault', noteKey: 'txNoteVaultTarget' },
  { field: 'credit', value: 'credit', noteKey: 'txNoteCreditForged', emphasis: true },
  { field: 'recipient', value: 'recipient', noteKey: 'txNoteRecipient' },
];

const SIGNER = 'ATTACKER';

export default function OwnerTxCard({ payload }: { payload: OwnerTxPayload }) {
  const { t } = useLanguage();
  const style = { '--tx-hold': `${TX_CARD_MS}ms` } as CSSProperties;

  return (
    <div className="txcard-overlay" data-testid="tx-card" style={style}>
      <section className="txcard" aria-label={t.txTitle}>
        <header className="txcard__header">{t.txTitle}</header>

        <div className="txcard__group">
          <span className="txcard__label">{'accounts:'}</span>
          <ul className="txcard__list">
            {ACCOUNTS.map((row) => (
              <li
                className={`txcard__item${row.emphasis ? ' txcard__item--emphasis' : ''}`}
                key={row.field}
              >
                <span className="txcard__field">{row.field}</span>
                <code className="txcard__value">{elide(payload[row.value])}</code>
                <span className="txcard__note">{t[row.noteKey]}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="txcard__group">
          <span className="txcard__label">{'signatures:'}</span>
          <ul className="txcard__list">
            <li className="txcard__item">
              <span className="txcard__field">{SIGNER}</span>
              <code className="txcard__value">{elide(payload.recipient)}</code>
              <span className="txcard__mark txcard__mark--ok" aria-label={t.ariaSignaturePresent}>
                ✓
              </span>
              <span className="txcard__note">{t.txNoteSigned}</span>
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}
