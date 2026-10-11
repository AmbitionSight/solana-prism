import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseLesson, parseLessonIndex, type Lesson } from '../lib/lesson';
import type { LessonIndexEntry } from '../config/lessons';

/**
 * The shipped lesson, read from disk the way the app reads it over the network.
 *
 * Tests cannot `fetch`, so this stands in for the network: it reads the very
 * bytes under `public/lessons/**` and runs them through the *same* `parseLesson`
 * and `parseLessonIndex` the loader uses. The suite therefore guards what the
 * app actually renders — a change to `lesson.json` that the loader would reject
 * fails here too, rather than passing against a hand-built object.
 *
 * (A build-time JSON import would have proven nothing about the upload path, so
 * the fixture deliberately goes through fs + the runtime parser instead.)
 */

const PUBLIC = '../../public/lessons/';

function readUtf8(relative: string): string {
  return readFileSync(fileURLToPath(new URL(relative, import.meta.url)), 'utf8');
}

function readJson(relative: string): unknown {
  return JSON.parse(readUtf8(relative)) as unknown;
}

/** Lesson one, assembled exactly as the shell does. */
export function shippedLesson(): Lesson {
  return parseLesson(
    readJson(`${PUBLIC}missing-signer/lesson.json`),
    readUtf8(`${PUBLIC}missing-signer/contract.rs`),
  );
}

/** Lesson two, read the same way — the ownership lesson's own folder. */
export function shippedOwnerLesson(): Lesson {
  return parseLesson(
    readJson(`${PUBLIC}missing-owner/lesson.json`),
    readUtf8(`${PUBLIC}missing-owner/contract.rs`),
  );
}

/** The lesson list the home page reads. */
export function shippedIndex(): LessonIndexEntry[] {
  return parseLessonIndex(readJson(`${PUBLIC}index.json`));
}
