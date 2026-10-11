import { useState } from 'react';
import App from '../App';
import { LESSONS } from '../config/lessons';
import Home from './Home';

/**
 * The shell: it decides whether the visitor is looking at the lesson list or
 * inside a lesson, and it is the only thing that owns that choice.
 *
 * Opening a lesson mounts `<App>` — which is lesson one today — and leaving
 * unmounts it. What the shell must never do is re-mount `<App>` *while* a lesson
 * is open: `ContractLayers`' cards have to keep their DOM identity across the
 * lesson's pages (the verification harness probes for exactly that), so nothing
 * here is keyed on the step or otherwise re-created mid-lesson.
 *
 * `initialOpenLessonId` exists for the same reason `App`'s `initialStep` does:
 * `renderToStaticMarkup` runs no effects and cannot click, so a test that wants
 * to hold the shell inside a lesson passes the id directly. The app itself never
 * passes it, so the demo still opens on the home page.
 */
export default function Shell({
  initialOpenLessonId = null,
}: {
  initialOpenLessonId?: string | null;
} = {}) {
  const [openLessonId, setOpenLessonId] = useState<string | null>(initialOpenLessonId);

  // A non-null id only opens a lesson if it names one that exists. There is one
  // lesson today, and the eight pages are hard-wired to it; when the lesson
  // becomes data this is where it would be selected and handed to `<App>`.
  const openLesson = LESSONS.find((lesson) => lesson.id === openLessonId);

  if (!openLesson) return <Home onOpenLesson={setOpenLessonId} />;

  return <App onExit={() => setOpenLessonId(null)} />;
}
