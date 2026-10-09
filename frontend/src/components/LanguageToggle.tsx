import { useLanguage } from '../i18n/language';
import { LANGUAGES } from '../i18n/messages';

/**
 * Switches the whole demo between English and Chinese.
 *
 * Each option is labelled in its own language ("EN" / "中文") rather than
 * translated, so someone who cannot read the current UI can still find their way
 * back out.
 */
export default function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div className="lang-toggle" role="group" aria-label={t.ariaLanguage}>
      {LANGUAGES.map((option) => {
        const active = option.id === language;
        return (
          <button
            key={option.id}
            type="button"
            data-testid={`lang-${option.id}`}
            className={`lang-toggle__option${active ? ' is-active' : ''}`}
            aria-pressed={active}
            onClick={() => setLanguage(option.id)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
