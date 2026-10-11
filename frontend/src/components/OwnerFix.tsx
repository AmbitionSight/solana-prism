import { useLanguage } from '../i18n/language';

/**
 * Page 7 — the repair is one declaration.
 *
 * As in lesson one, the instinct after the attack is to add a check, and there
 * is nothing to add. The handler was right: it read the credit and paid it. What
 * was wrong is the declaration above it, which told the runtime to check
 * nothing. The diff is the actual before-and-after declaration, and the two code
 * lines are literals — identifiers that read the same in both languages.
 */
const REMOVED = "pub credit: UncheckedAccount<'info>,";
const ADDED = "pub credit: Account<'info, Credit>,";

export default function OwnerFix() {
  const { t } = useLanguage();

  return (
    <section className="fix" data-testid="owner-fix">
      <h2 className="page-intro__title">{t.ownerFixTitle}</h2>
      <p className="page-intro__lede">{t.ownerFixLede}</p>

      <pre className="diff" data-testid="owner-fix-diff">
        <code className="diff__line diff__line--del">{REMOVED}</code>
        <code className="diff__line diff__line--add">{ADDED}</code>
      </pre>

      <p className="page-intro__body">{t.ownerFixBody}</p>
      <p className="page-intro__body">{t.ownerFixBodyDeclaration}</p>
      <p className="page-intro__note">{t.ownerFixNote}</p>
    </section>
  );
}
