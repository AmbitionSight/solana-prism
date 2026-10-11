import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { LanguageContext } from '../../i18n/language';
import { LessonContext } from '../../lib/lessonContext';
import { MESSAGES, type Language } from '../../i18n/messages';
import type { SolanaProvider } from '../../lib/wallet';
import { shippedLesson } from '../../__tests__/shipped';

/**
 * Shared test furniture for the components this feature touches.
 *
 * `BASELINES` is a capture of the three components' **default** renders, taken
 * before any of them changed. It lives in a file rather than in the test bodies
 * so the "unchanged" guards compare against something the change could not have
 * written: the fixture was produced by the pre-change code, and the guards that
 * read it run in the suite.
 *
 * One key was re-captured deliberately: `txCard`'s default render really did
 * change, because the card no longer shows the placeholder addresses
 * (`7xKm…9mPQ`, `ADMiN…x7wQ`) it used to. That is the point of the change, so
 * its guard now pins the placeholder-free render instead of the old one. The
 * other three keys were not touched.
 */

export interface DefaultRenders {
  txCard: string;
  attackResultVulnerable: string;
  attackResultFixed: string;
  verifyPanel: string;
}

export function baselines(): DefaultRenders {
  return JSON.parse(
    readFileSync(
      fileURLToPath(new URL('./fixtures/default-renders.json', import.meta.url)),
      'utf8',
    ),
  ) as DefaultRenders;
}

/**
 * Render inside a language context and the shipped lesson, so a component needs
 * no provider of its own. The lesson comes from the same bytes the app fetches;
 * a component that reads `useLesson()` (the comparison's address, the panel's
 * evidence) renders exactly what it renders in the app.
 */
export function render(node: ReactNode, language: Language = 'en'): string {
  return renderToStaticMarkup(
    <LanguageContext.Provider value={{ language, setLanguage: () => {}, t: MESSAGES[language] }}>
      <LessonContext.Provider value={shippedLesson()}>{node}</LessonContext.Provider>
    </LanguageContext.Provider>,
  );
}

export function provider(): SolanaProvider {
  return {
    publicKey: null,
    connect: async () => ({ publicKey: null }),
    disconnect: async () => {},
    signTransaction: async <T,>(transaction: T) => transaction,
  };
}
