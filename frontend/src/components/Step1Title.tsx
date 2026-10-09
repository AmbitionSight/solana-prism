import type { CSSProperties } from 'react';
import { AUTO_ADVANCE_MS } from '../lib/steps';
import { useLanguage } from '../i18n/language';

/**
 * Step 1 — the title fades in and back out across the whole of step 1, so its
 * animation duration is derived from the step's own duration rather than
 * repeated as a literal.
 */
export default function Step1Title() {
  const { t } = useLanguage();

  const style = {
    '--step-duration': `${AUTO_ADVANCE_MS[1]}ms`,
  } as CSSProperties;

  return (
    <section className="step1" style={style}>
      <h1 className="step1__title">{t.step1Title}</h1>
    </section>
  );
}
