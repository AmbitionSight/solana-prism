import { createContext, useContext } from 'react';
import type { Language, Messages } from './messages';

export interface LanguageValue {
  language: Language;
  setLanguage: (next: Language) => void;
  /** The resolved catalogue for the current language. */
  t: Messages;
}

export const LanguageContext = createContext<LanguageValue | null>(null);

export function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) {
    throw new Error('useLanguage() must be called inside <LanguageProvider>');
  }
  return value;
}
