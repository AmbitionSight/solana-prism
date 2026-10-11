/**
 * contractSource.ts — the shape of the deployed contract as the app displays it.
 *
 * The text itself no longer lives here. It is a file in the lesson folder
 * (`public/lessons/<id>/contract.rs`), fetched at runtime so the app renders
 * whatever the lesson ships — which is what makes a lesson uploadable. This
 * module keeps only the *vocabulary* that is the same for every lesson: the
 * margin-note key union, and the interface for one note.
 *
 * The chain of custody that used to run through `CONTRACT_LINES` now runs
 * through the file: `public/lessons/<id>/contract.rs` is pinned byte-for-byte to
 * `public/source/prism_vulnerable.rs.txt` (which `source-assets.test.ts` in turn
 * pins to `contract/`), so a drift still fails the suite. What the old
 * `contractSource.test.ts` guarded — that the stage regions land on the right
 * lines and the margin notes match the code they annotate — is now guarded
 * against the *fetched* lesson data, so the guard sits on what actually renders.
 */

/**
 * The margin-note keys, as both a type and a runtime list.
 *
 * Deriving the type from the array (rather than repeating the five names) means
 * the loader can validate a fetched note's key against the same list the type is
 * built from — one source, so the two can never drift.
 */
export const MARGIN_NOTE_KEYS = [
  'noteDeclareId',
  'noteStructNotSigner',
  'noteHandlerRequires',
  'noteTheBug',
  'noteStateChange',
] as const;

export type MarginNoteKey = (typeof MARGIN_NOTE_KEYS)[number];

/**
 * Chinese explanation, keyed to a line of the listing.
 *
 * Beside the code rather than inside it: the listing has to stay byte-identical
 * to the deployed file, and a Chinese comment inside it would end that the
 * moment the file was rebuilt.
 *
 * `match` pins each note to its line's content, so a note cannot drift onto the
 * wrong line without a test (and the loader) going red.
 */
export interface MarginNote {
  line: number;
  key: MarginNoteKey;
  match: string;
}
