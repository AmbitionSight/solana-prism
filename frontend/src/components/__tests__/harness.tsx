import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import { LanguageContext } from '../../i18n/language';
import { MESSAGES, type Language } from '../../i18n/messages';
import type { SolanaProvider } from '../../lib/wallet';

/**
 * Shared test furniture for the components this feature touches.
 *
 * `BASELINES` is a capture of the three components' **default** renders, taken
 * before any of them changed. It lives in a file rather than in the test bodies
 * so the "unchanged" guards compare against something the change could not have
 * written: the fixture was produced by the pre-change code, and the guards that
 * read it run in the suite.
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

/** Render inside a language context, so a component needs no provider. */
export function render(node: ReactNode, language: Language = 'en'): string {
  return renderToStaticMarkup(
    <LanguageContext.Provider value={{ language, setLanguage: () => {}, t: MESSAGES[language] }}>
      {node}
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
