import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { LanguageContext, type LanguageValue } from './language';
import { MESSAGES, type Language } from './messages';

/**
 * Holds the current language for the whole app.
 *
 * Deliberately not persisted: the demo always opens in English (the language it
 * is presented in), so there is never a stale choice waiting on stage.
 */
export default function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  useEffect(() => {
    // Tell the browser what is actually on screen. It picks CJK glyph variants
    // from this, and a screen reader picks its pronunciation from it.
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
  }, [language]);

  const value = useMemo<LanguageValue>(
    () => ({ language, setLanguage, t: MESSAGES[language] }),
    [language],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
