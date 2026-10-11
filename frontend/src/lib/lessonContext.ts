/**
 * lessonContext.ts — how a rendered lesson reaches the components that draw it.
 *
 * `App` takes the lesson as a **prop** and provides it here; the components deep
 * in the tree (the listing, the flow, the comparison, the panel) read it back
 * with `useLesson()` instead of importing a module constant. That is the whole
 * reason the context exists: the lesson is no longer a thing the app *is*, it is
 * a thing the app is *given*, so a test can hand it a lesson object with no
 * network — and a second lesson needs no component change.
 *
 * The provider is `LessonContext.Provider` used directly by `App`; there is no
 * wrapper component to keep the context object and the hook in a plain module.
 */

import { createContext, useContext } from 'react';
import type { Lesson } from './lesson';

export const LessonContext = createContext<Lesson | null>(null);

export function useLesson(): Lesson {
  const value = useContext(LessonContext);
  if (!value) {
    throw new Error('useLesson() must be called inside a lesson (LessonContext.Provider)');
  }
  return value;
}
