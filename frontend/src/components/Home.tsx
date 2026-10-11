import type { LessonIndexEntry } from '../config/lessons';
import { useLanguage } from '../i18n/language';
import LanguageToggle from './LanguageToggle';

/**
 * The home page — the landing surface the platform opens on.
 *
 * Quiet on purpose: a title, one line saying what this is, and the lessons. It
 * is presentational: the shell fetches `lessons/index.json` (so the home page
 * reads the list rather than spelling it out) and hands the entries here. That
 * is why adding a lesson is an upload and not a markup change — and why this
 * component needs no network to be tested.
 *
 * The list arrives as `null` while it is being fetched, so the page can say so
 * honestly; a failed fetch is reported rather than shown as an empty list, which
 * would read as "there are no lessons" instead of "they could not be loaded".
 *
 * A lesson entry is a button, not an anchor: there is no router and no URL to
 * point at yet, and a link to nowhere would be a lie.
 */
export default function Home({
  lessons,
  error = false,
  onOpenLesson,
}: {
  /** The fetched lesson list, or null while it is still loading. */
  lessons: LessonIndexEntry[] | null;
  /** True when the list could not be fetched — said plainly, never as empty. */
  error?: boolean;
  onOpenLesson: (id: string) => void;
}) {
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

        {error ? (
          <p className="home__status" data-testid="lessons-error">
            {t.lessonLoadError}
          </p>
        ) : lessons === null ? (
          <p className="home__status" data-testid="lessons-loading">
            {t.lessonsLoading}
          </p>
        ) : (
          <ul className="lesson-list">
            {lessons.map((lesson) => (
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
        )}
      </main>
    </div>
  );
}
