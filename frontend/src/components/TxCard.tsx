/**
 * TxCard — the transaction payload, shown before the dot drops.
 *
 * This is the answer to the demo's biggest comprehension gap: the attack looks
 * like magic unless you first see that the admin's *address* is present while
 * the admin's *signature* is absent. The two annotations spell that out.
 */

interface AccountRow {
  field: string;
  value: string;
  note: string;
  emphasis?: boolean;
}

interface SignatureRow {
  field: string;
  present: boolean;
  note: string;
}

const ACCOUNTS: AccountRow[] = [
  { field: 'vault', value: '7xKm…9mPQ', note: 'attacker-owned' },
  {
    field: 'authority',
    value: 'ADMiN…x7wQ',
    note: 'admin address present',
    emphasis: true,
  },
];

const SIGNATURES: SignatureRow[] = [
  { field: 'ATTACKER', present: true, note: 'signed' },
  { field: 'ADMIN', present: false, note: 'signature absent' },
];

export default function TxCard() {
  return (
    <div className="txcard-overlay" data-testid="tx-card">
      <section className="txcard" aria-label="Transaction">
        <header className="txcard__header">Transaction</header>

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
                <span className="txcard__note">{row.note}</span>
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
                  aria-label={row.present ? 'signature present' : 'signature absent'}
                >
                  {row.present ? '✓' : '✗'}
                </span>
                <span className="txcard__note">{row.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
