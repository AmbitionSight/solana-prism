import type { CSSProperties } from 'react';
import { AUTO_ADVANCE_MS } from '../lib/steps';
import { useLanguage } from '../i18n/language';

/**
 * Lesson two's page 1 — the same slot lesson one opens on, saying something
 * true about this lesson instead of asking again what a smart contract is.
 *
 * The reader has already taken lesson one, so its title ("What is a smart
 * contract?") would be repetition dressed as an introduction. This page is a
 * bridge between the two flaws: lesson one's was that no signature was ever
 * demanded; this lesson's is that no one is asked who owns the account. Two
 * lines, the same fade, the same few seconds — a title page, not an essay.
 *
 * It is lesson two's own component, like `ForgeCredit` and `WhyOwnership`, and
 * it reuses lesson one's `title-in-out` keyframes rather than its page: the
 * animation is the shared, quiet register; the copy is not.
 */
export default function OwnerTitle() {
  const { t } = useLanguage();

  const style = {
    '--step-duration': `${AUTO_ADVANCE_MS[1]}ms`,
  } as CSSProperties;

  return (
    <section className="owner-title" style={style} data-testid="owner-title">
      <h1 className="owner-title__title">
        <span className="owner-title__line owner-title__line--last">{t.ownerTitleLast}</span>
        <span className="owner-title__line">{t.ownerTitleThis}</span>
      </h1>
    </section>
  );
}
