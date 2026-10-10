import { VERIFICATION } from '../config/verification';
import { elide } from '../lib/elide';
import { useLanguage } from '../i18n/language';

/**
 * Page 5 — the attacker's whole contribution.
 *
 * Page 4 left stage 4's caller slot blank. This page says what fills it: the
 * admin's *public* address, which is visible to anyone. No forgery, no stolen
 * key — a piece of public information written into a position the program never
 * checks.
 *
 * The word discipline matters: the attacker does not *tamper*, he *fills in*. A
 * heading that said otherwise would be a different, false claim about what the
 * demo shows.
 *
 * The address is config (`VERIFICATION.adminPubkey`), elided for display with
 * the full value in `title` — never a literal in the copy. The field label and
 * the placeholder are identifiers, not translation, so they stay out of the
 * catalogue.
 */

const FIELD = 'authority:';
const PLACEHOLDER = '？？？';

export default function FillAddress() {
  const { t } = useLanguage();
  const address = VERIFICATION.adminPubkey;

  return (
    <section className="fill-address" data-testid="fill-address">
      <h2 className="page-intro__title">{t.fillTitle}</h2>

      <div className="fill-line">
        <code className="fill-line__field">{FIELD}</code>
        <span className="fill-slot">{PLACEHOLDER}</span>
        <span className="fill-line__arrow" aria-hidden="true">
          →
        </span>
        <code className="fill-line__field">{FIELD}</code>
        <span className="fill-slot fill-slot--filled" title={address}>
          {elide(address)}
        </span>
      </div>

      <p className="page-intro__lede">{t.fillLede}</p>
      <p className="page-intro__body">{t.fillNoHack}</p>

      <div className="two-panes">
        <div className="pane">
          <h4 className="pane__title">{t.fillNeedHeading}</h4>
          <p className="pane__body">{t.fillNeedBody}</p>
        </div>
        <div className="pane pane--bad">
          <h4 className="pane__title">{t.fillNowHeading}</h4>
          <p className="pane__body">{t.fillNowBody}</p>
        </div>
      </div>
    </section>
  );
}
