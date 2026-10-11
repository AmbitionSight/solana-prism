import { LESSONS } from '../config/lessons';
import { useLanguage } from '../i18n/language';
import LanguageToggle from './LanguageToggle';

/**
 * The home page — the landing surface the platform opens on.
 *
 * Quiet on purpose: a title, one line saying what this is, and the lessons. It
 * lists `LESSONS` rather than spelling the entries out, so adding a lesson is a
 * change to `config/lessons.ts` and its copy, not to this markup. Each entry is
 * a button carrying a title and the one-line description of the vulnerability
 * that lesson teaches.
 *
 * A button, not an anchor: there is no router and no URL to point at yet, and a
 * link to nowhere would be a lie. The learner enters a lesson with the pointer or
 * with the keyboard (Tab to the entry, then Enter or Space) — the arrow keys
 * deliberately do nothing here; see `Shell`.
 */
export default function Home({ onOpenLesson }: { onOpenLesson: (id: string) => void }) {
  const { t } = useLanguage();

  return (
    <div className="home">
      <div className="top-controls">
        <LanguageToggle />
      </div>

      <main className="home__inner">
        <header className="home__head">
          <h1 className="home__title">{t.homeTitle}</h1>
          <p className="home__lede">{t.homeLede}</p>
        </header>

        <ul className="lesson-list">
          {LESSONS.map((lesson) => (
            <li key={lesson.id} className="lesson-list__item">
              <button
                type="button"
                className="lesson-card"
                data-testid={`lesson-${lesson.id}`}
                onClick={() => onOpenLesson(lesson.id)}
              >
                <span className="lesson-card__title">{t[lesson.title]}</span>
                <span className="lesson-card__blurb">{t[lesson.blurb]}</span>
              </button>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
