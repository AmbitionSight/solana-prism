import { useLanguage } from '../i18n/language';
import type { MessageKey } from '../i18n/messages';

/**
 * Page 8 — the same forged credit against the repaired build, refused.
 *
 * The reading of the refusal, in lesson two's own terms: the declaration is what
 * changed, and what the declaration demands is what stops the call before the
 * handler runs. The table's last two rows are deliberately identical — the forged
 * credit's owner does not change between builds — because the difference is the
 * first row alone, and that is the whole lesson.
 */
interface Row {
  labelKey: MessageKey;
  vulnKey: MessageKey;
  fixedKey: MessageKey;
}

const ROWS: Row[] = [
  {
    labelKey: 'ownerRetryTableRuntimeLabel',
    vulnKey: 'ownerRetryTableRuntimeVuln',
    fixedKey: 'ownerRetryTableRuntimeFixed',
  },
  {
    labelKey: 'ownerRetryTableOwnerLabel',
    vulnKey: 'ownerRetryTableOwnerVuln',
    fixedKey: 'ownerRetryTableOwnerFixed',
  },
  {
    labelKey: 'ownerRetryTableResultLabel',
    vulnKey: 'ownerRetryTableResultVuln',
    fixedKey: 'ownerRetryTableResultFixed',
  },
];

export default function OwnerRetry() {
  const { t } = useLanguage();

  return (
    <section className="retry" data-testid="owner-retry">
      <div className="retry__grid">
        <div className="retry__copy">
          <h2 className="page-intro__title">{t.ownerRetryTitle}</h2>
          <p className="page-intro__body">{t.ownerRetryNote}</p>
          <p className="page-intro__lede retry__conclusion">{t.ownerRetryConclusion}</p>
        </div>

        <div className="retry__table">
          <h3 className="page-intro__heading">{t.ownerRetryTableHeading}</h3>
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
