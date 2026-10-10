import { useLanguage } from '../i18n/language';

/**
 * Page 8 — the repair is one declaration.
 *
 * The instinct after page 6 is to add a check. There is nothing to add: the
 * `require!` line was correct, it compares exactly the right two values, and it
 * keeps working. What was wrong is the declaration above it, which told the
 * runtime to demand nothing. So the diff is a single line, and the copy says so
 * plainly, because "we added a check" would describe a different, wrong fix.
 *
 * The two code lines are the actual before/after declarations — literals, the
 * same in both languages.
 */

const REMOVED = "pub authority: AccountInfo<'info>,";
const ADDED = "pub authority: Signer<'info>,";

export default function TheFix() {
  const { t } = useLanguage();

  return (
    <section className="fix" data-testid="the-fix">
      <h2 className="page-intro__title">{t.fixTitle}</h2>
      <p className="page-intro__lede">{t.fixLede}</p>

      <pre className="diff" data-testid="fix-diff">
        <code className="diff__line diff__line--del">{REMOVED}</code>
        <code className="diff__line diff__line--add">{ADDED}</code>
      </pre>

      <p className="page-intro__body">{t.fixBody}</p>
      <p className="page-intro__body">{t.fixBodyDeclaration}</p>
      <p className="page-intro__note">{t.fixNote}</p>
    </section>
  );
}
