import { useLanguage } from '../i18n/language';

/**
 * Page 6 — why a competent person writes this bug.
 *
 * The mistake is not carelessness. `require(msg.sender == owner)` is a correct,
 * sufficient identity check in Solidity, because the protocol computes
 * `msg.sender` from the signatures it already verified. The hand that has typed
 * that line a thousand times types its Rust twin without noticing that the Rust
 * one proves nothing. The two panes are the two languages side by side; the
 * table is the structural difference underneath; the closing line is the whole
 * lesson in one sentence.
 *
 * The code samples are literals — they are the same in both languages.
 */

const SOLIDITY_CODE = 'require(msg.sender == owner);';
const SOLANA_CODE = 'require!(vault.authority == ctx.accounts.authority.key());';

export default function WhyItHappens() {
  const { t } = useLanguage();

  return (
    <section className="why" data-testid="why">
      <h2 className="page-intro__title">{t.whyTitle}</h2>

      <div className="two-panes">
        <div className="pane pane--good">
          <h4 className="pane__title">{t.whyEthTitle}</h4>
          <pre className="pane__code">
            <code>{SOLIDITY_CODE}</code>
          </pre>
          <p className="pane__body">{t.whySolidityBody}</p>
          <p className="pane__verdict">{t.whySolidityVerdict}</p>
        </div>
        <div className="pane pane--bad">
          <h4 className="pane__title">{t.whySolTitle}</h4>
          <pre className="pane__code">
            <code>{SOLANA_CODE}</code>
          </pre>
          <p className="pane__body">{t.whySolBody}</p>
          <p className="pane__verdict">{t.whySolVerdict}</p>
        </div>
      </div>

      <table className="cmp-table">
        <thead>
          <tr>
            <th />
            <th>{t.whyTableColEth}</th>
            <th>{t.whyTableColSol}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t.whyTableStateLabel}</td>
            <td>{t.whyTableStateEth}</td>
            <td>{t.whyTableStateSol}</td>
          </tr>
          <tr>
            <td>{t.whyTableCallerLabel}</td>
            <td>{t.whyTableCallerEth}</td>
            <td>{t.whyTableCallerSol}</td>
          </tr>
        </tbody>
      </table>

      <p className="page-intro__lede why__conclusion">{t.whyConclusion}</p>
      <p className="page-intro__note">{t.whyNote}</p>
    </section>
  );
}
