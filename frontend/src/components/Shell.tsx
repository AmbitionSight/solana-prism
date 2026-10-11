import { useEffect, useState } from 'react';
import App from '../App';
import OwnerApp from './OwnerApp';
import type { LessonIndexEntry } from '../config/lessons';
import { fetchLesson, fetchLessonIndex, type Lesson } from '../lib/lesson';
import { useLanguage } from '../i18n/language';
import Home from './Home';

/**
 * The shell: it decides whether the visitor is looking at the lesson list or
 * inside a lesson, and it is the only thing that owns that choice.
 *
 * It is also the platform's one piece of I/O: it fetches `lessons/index.json`
 * for the home page, and when a lesson is opened it fetches that lesson's folder
 * (`lesson.json` + `contract.rs`) and hands the assembled `Lesson` to `<App>`.
 * Everything downstream takes the lesson as a prop or through `LessonContext`,
 * so nothing below imports lesson data — that is what the experiment is about.
 *
 * What the shell must never do is re-mount `<App>` *while* a lesson is open:
 * `ContractLayers`' cards have to keep their DOM identity across the lesson's
 * pages (the verification harness probes for exactly that), so nothing here is
 * keyed on the step or otherwise re-created mid-lesson.
 *
 * The three `initial*` props exist for the same reason `App`'s `initialStep`
 * does: `renderToStaticMarkup` runs no effects and cannot click, so a test that
 * wants to hold the shell in a given state passes it directly. The app itself
 * never passes them.
 */
export default function Shell({
  initialOpenLessonId = null,
  initialLesson = null,
  initialLessons = null,
}: {
  initialOpenLessonId?: string | null;
  initialLesson?: Lesson | null;
  initialLessons?: LessonIndexEntry[] | null;
} = {}) {
  const { t } = useLanguage();
  const [lessons, setLessons] = useState<LessonIndexEntry[] | null>(initialLessons);
  const [openLessonId, setOpenLessonId] = useState<string | null>(initialOpenLessonId);
  const [lesson, setLesson] = useState<Lesson | null>(initialLesson);
  /** True when the list or the chosen lesson could not be fetched. */
  const [failed, setFailed] = useState(false);

  // Read the lesson list once, unless a test supplied it.
  useEffect(() => {
    if (initialLessons) return;
    let cancelled = false;
    fetchLessonIndex()
      .then((list) => {
        if (!cancelled) setLessons(list);
      })
      .catch(() => {
        if (!cancelled) {
          setLessons(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [initialLessons]);

  // Fetch the chosen lesson's folder. Only once the id is known to name a real
  // lesson: an unknown id never becomes a fetch, and the visitor stays on the
  // list rather than on a spinner for something that is not there.
  useEffect(() => {
    if (!openLessonId) return;
    if (!lessons?.some((entry) => entry.id === openLessonId)) return;
    if (lesson?.id === openLessonId) return;

    let cancelled = false;
    setFailed(false);
    fetchLesson(openLessonId)
      .then((value) => {
        if (!cancelled) setLesson(value);
      })
      .catch(() => {
        if (!cancelled) {
          setLesson(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [openLessonId, lesson, lessons]);

  const known =
    openLessonId !== null && lessons?.some((entry) => entry.id === openLessonId) === true;

  if (known && lesson?.id === openLessonId) {
    // A lesson is data, but the *pages* that read it are not: lesson two teaches
    // ownership with its own components, so the shell dispatch is by id rather
    // than a component that tries to serve both. The flow, the listing, the
    // verify panel and the page machine are shared; the prose is not.
    if (lesson.id === 'missing-owner') {
      return <OwnerApp lesson={lesson} onExit={() => setOpenLessonId(null)} />;
    }
    return <App lesson={lesson} onExit={() => setOpenLessonId(null)} />;
  }

  // Opening a lesson that is still loading (or failed): say so honestly, and
  // always leave a way back — a malformed or missing folder must not trap the
  // visitor or white-screen them.
  if (known) {
    return (
      <div className="home">
        <div className="top-controls">
          <button
            type="button"
            className="back-btn"
            data-testid="exit-lesson"
            onClick={() => setOpenLessonId(null)}
          >
            {t.backToLessons}
          </button>
        </div>
        <main className="home__inner">
          <p className="home__status" data-testid="lesson-status">
            {failed ? t.lessonLoadError : t.lessonsLoading}
          </p>
        </main>
      </div>
    );
  }

  return <Home lessons={lessons} error={failed} onOpenLesson={setOpenLessonId} />;
}
