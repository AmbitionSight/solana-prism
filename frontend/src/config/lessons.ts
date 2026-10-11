/**
 * lessons.ts — the catalogue of lessons the platform offers.
 *
 * The home page reads this list rather than a hand-written block of JSX, so a
 * second lesson is a data change here (plus its copy in the message catalogue)
 * and nothing else. That is the whole point of the file: today there is exactly
 * one lesson, and the home page must not be built in a way that treats "one" as
 * a fact about the markup.
 *
 * Deliberately NOT here yet: the lesson itself as data. The eight pages still
 * live in `App.tsx` and are hard-wired to lesson one — turning the narrative
 * into data is a later, larger job, and this file only carries what the home
 * page has to know to *list* a lesson and hand its id to the shell.
 *
 * `title` and `blurb` are catalogue keys, not strings. The copy is therefore in
 * both languages by construction (`messages.ts` types both languages against one
 * interface), and a key that exists in neither is a compile error rather than a
 * blank row on the home page.
 */

import type { MessageKey } from '../i18n/messages';

export interface Lesson {
  /** Stable id. Also the harness's entry selector (`lesson-<id>`). */
  id: string;
  /** Catalogue key for the lesson's title. */
  title: MessageKey;
  /** Catalogue key for the one-line description of the vulnerability taught. */
  blurb: MessageKey;
}

export const LESSONS: Lesson[] = [
  {
    id: 'missing-signer',
    title: 'lessonMissingSignerTitle',
    blurb: 'lessonMissingSignerBlurb',
  },
];
