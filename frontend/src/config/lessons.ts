/**
 * lessons.ts — the shape of one entry in the lesson list.
 *
 * The list itself is no longer here. It is a file in the platform's lessons
 * directory (`public/lessons/index.json`), fetched at runtime by the shell, so
 * adding a lesson is an upload and not a code change. What remains is the shape
 * each entry must have.
 *
 * `title` and `blurb` are catalogue keys, not strings, so the home page renders
 * them through the message catalogue in whichever language is active. The type
 * still says so; the loader checks it at runtime, because JSON cannot.
 */

import type { MessageKey } from '../i18n/messages';

export interface LessonIndexEntry {
  /** Stable id. Also the folder name, and the harness's entry selector (`lesson-<id>`). */
  id: string;
  /** Catalogue key for the lesson's title. */
  title: MessageKey;
  /** Catalogue key for the one-line description of the vulnerability taught. */
  blurb: MessageKey;
}
