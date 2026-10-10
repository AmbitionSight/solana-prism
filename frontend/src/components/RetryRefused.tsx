import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

/**
 * Page 8 — the same attack against the repaired build, and the two versions
 * held side by side.
 *
 * This page carries no machinery of its own: the flow above it is the same
 * `ContractLayers` instance the whole lesson has used, now switched to the fixed
 * build, and the dot that stops on the declaration is the same attack dot. What
 * is here is the reading of it — the note that not one line of contract code
 * ran, and the table whose two columns differ in exactly one cell.
 *
 * `versionVulnerable` / `versionFixed` are reused for the columns because the
 * two builds are the same two builds named everywhere else.
 */

interface Row {
  labelKey: MessageKey;
  vulnKey: MessageKey;
  fixedKey: MessageKey;
}

const ROWS: Row[] = [
  {
    labelKey: 'retryTableRuntimeLabel',
    vulnKey: 'retryTableRuntimeVuln',
    fixedKey: 'retryTableRuntimeFixed',
  },
  {
    labelKey: 'retryTableSigLabel',
    vulnKey: 'retryTableSigVuln',
    fixedKey: 'retryTableSigFixed',
  },
  {
    labelKey: 'retryTableResultLabel',
    vulnKey: 'retryTableResultVuln',
    fixedKey: 'retryTableResultFixed',
  },
];

export default function RetryRefused() {
  const { t } = useLanguage();

  return (
    <section className="retry" data-testid="retry">
      {/* Copy and table side by side rather than stacked: together they are the
          tallest footer any page carries, and stacked they pushed page 8 past
          the fold. Read left then right, the same order as stacked. */}
      <div className="retry__grid">
        <div className="retry__copy">
          <h2 className="page-intro__title">{t.retryTitle}</h2>
          <p className="page-intro__body">{t.retryNote}</p>
          <p className="page-intro__lede retry__conclusion">{t.retryConclusion}</p>
        </div>

        <div className="retry__table">
          <h3 className="page-intro__heading">{t.retryTableHeading}</h3>
          <table className="cmp-table">
            <thead>
              <tr>
                <th />
                <th>{t.versionVulnerable}</th>
                <th>{t.versionFixed}</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.labelKey}>
                  <td>{t[row.labelKey]}</td>
                  <td>{t[row.vulnKey]}</td>
                  <td>{t[row.fixedKey]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
