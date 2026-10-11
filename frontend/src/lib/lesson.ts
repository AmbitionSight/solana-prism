/**
 * lesson.ts — a lesson is a folder of static files the app fetches and renders.
 *
 * The layout:
 *
 *   public/lessons/index.json                  the list the home page reads
 *   public/lessons/<id>/lesson.json            this lesson's data
 *   public/lessons/<id>/contract.rs            the contract, verbatim
 *
 * Nothing here is a build-time import: the whole point is the upload path, and
 * a bundled import would prove nothing about it. The app fetches, validates and
 * assembles a `Lesson`, and every render path takes that object — so a test can
 * hand the app a lesson without a network, and a second lesson needs no code.
 *
 * The JSON boundary erases one guarantee that TypeScript used to give for free:
 * that every `sayKey` / `nameKey` / note key names a real catalogue entry. JSON
 * cannot be type-checked against `Messages`, so the loaders below re-establish
 * it at runtime — a key that is not in the catalogue, or a region that runs off
 * the end of the contract, is a `LessonError` the shell reports honestly, never
 * a blank sentence on screen and never a white page.
 */

import { LAYER_NAME_KEYS, MESSAGES, type MessageKey } from '../i18n/messages';
import type { ContractLayer } from '../config/layers';
import type { LessonIndexEntry } from '../config/lessons';
import type { VerifyEvidence } from '../config/verification';
import { MARGIN_NOTE_KEYS, type MarginNote } from './contractSource';

/** A run of the contract's own lines boxed as a stage. */
export interface ContractRegion {
  stageId: string;
  from: number;
  to: number;
}

/** A run of the contract shown plain. Everything outside is elided. */
export interface ContractRange {
  from: number;
  to: number;
}

/**
 * The contract as the lesson ships it: the file's lines, and the structure the
 * pages draw from them. `lines` is filled from `contract.rs` by the loader; the
 * rest come from `lesson.json`.
 */
export interface LessonContract {
  lines: string[];
  regions: ContractRegion[];
  excerpt: ContractRange[];
  marginNotes: MarginNote[];
}

/** A whole lesson: what page 2 shows, what the flow draws, what the panel cites. */
export interface Lesson {
  id: string;
  /**
   * The crate name the listing is built from, e.g. `prism_owner_vulnerable`.
   * Shown verbatim in page 2's status bar, so it is an identifier, not copy —
   * but it is still lesson data, because the name differs per lesson. Absent
   * means lesson one's own name, which is what page 2 falls back to.
   */
  contractName?: string;
  layers: ContractLayer[];
  contract: LessonContract;
  verification: VerifyEvidence;
}

export type LessonErrorKind = 'notFound' | 'network' | 'malformed';

/** A fetch or shape failure, in a form the shell can report rather than throw on. */
export class LessonError extends Error {
  readonly kind: LessonErrorKind;

  constructor(kind: LessonErrorKind, message: string) {
    super(message);
    this.name = 'LessonError';
    this.kind = kind;
  }
}

/** A lesson id is also a folder name, so it is restricted to a safe slug. */
const LESSON_ID = /^[a-z0-9][a-z0-9-]*$/;

const MESSAGE_KEYS = new Set(Object.keys(MESSAGES.en));
const LAYER_NAME_KEY_SET = new Set<string>(LAYER_NAME_KEYS);
const MARGIN_NOTE_KEY_SET = new Set<string>(MARGIN_NOTE_KEYS);

const isMessageKey = (value: unknown): value is MessageKey =>
  typeof value === 'string' && MESSAGE_KEYS.has(value);
const isLayerNameKey = (value: unknown): value is (typeof LAYER_NAME_KEYS)[number] =>
  typeof value === 'string' && LAYER_NAME_KEY_SET.has(value);
const isMarginNoteKey = (value: unknown): value is (typeof MARGIN_NOTE_KEYS)[number] =>
  typeof value === 'string' && MARGIN_NOTE_KEY_SET.has(value);
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0;

function malformed(detail: string): never {
  throw new LessonError('malformed', detail);
}

/**
 * The file's lines, exactly as `CONTRACT_LINES` used to hold them: split on
 * newlines, CRLF normalised, and the trailing newline's empty entry dropped. The
 * byte guard on `contract.rs` is what keeps this equal to the deployed file.
 */
export function parseContractLines(text: string): string[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function parseLayer(raw: unknown, index: number): ContractLayer {
  if (!isRecord(raw)) return malformed(`layers[${index}] is not an object`);
  if (!isNonEmptyString(raw.id)) return malformed(`layers[${index}].id must be a non-empty string`);
  if (!isLayerNameKey(raw.nameKey)) {
    return malformed(`layers[${index}].nameKey "${String(raw.nameKey)}" is not a stage name`);
  }
  if (!isMessageKey(raw.sayKey)) {
    return malformed(`layers[${index}].sayKey "${String(raw.sayKey)}" is not a catalogue key`);
  }
  if (raw.sayWhenFixed !== undefined && !isMessageKey(raw.sayWhenFixed)) {
    return malformed(`layers[${index}].sayWhenFixed "${String(raw.sayWhenFixed)}" is not a catalogue key`);
  }
  if (typeof raw.code !== 'string') return malformed(`layers[${index}].code must be a string`);
  if (raw.codeWhenFixed !== undefined && typeof raw.codeWhenFixed !== 'string') {
    return malformed(`layers[${index}].codeWhenFixed must be a string`);
  }
  // The badge is optional, and both keys must be real catalogue entries when
  // present — a lesson that words the flaw differently must not be able to name
  // a sentence that does not exist.
  if (raw.badgeKey !== undefined && !isMessageKey(raw.badgeKey)) {
    return malformed(`layers[${index}].badgeKey "${String(raw.badgeKey)}" is not a catalogue key`);
  }
  if (raw.badgeFixedKey !== undefined && !isMessageKey(raw.badgeFixedKey)) {
    return malformed(
      `layers[${index}].badgeFixedKey "${String(raw.badgeFixedKey)}" is not a catalogue key`,
    );
  }
  if (typeof raw.isSecurityLayer !== 'boolean' || typeof raw.broken !== 'boolean') {
    return malformed(`layers[${index}] must carry boolean isSecurityLayer and broken`);
  }
  if (
    !isRecord(raw.scatter) ||
    !isFiniteNumber(raw.scatter.x) ||
    !isFiniteNumber(raw.scatter.y)
  ) {
    return malformed(`layers[${index}].scatter must be finite {x, y}`);
  }

  let compare: ContractLayer['compare'];
  if (raw.compare !== undefined) {
    if (!isRecord(raw.compare)) return malformed(`layers[${index}].compare must be an object`);
    const c = raw.compare;
    if (
      !isMessageKey(c.storedKey) ||
      !isMessageKey(c.storedFromKey) ||
      !isMessageKey(c.suppliedKey) ||
      !isMessageKey(c.suppliedNoteKey) ||
      !isMessageKey(c.resultKey)
    ) {
      return malformed(`layers[${index}].compare carries a key that is not in the catalogue`);
    }
    compare = {
      storedKey: c.storedKey,
      storedFromKey: c.storedFromKey,
      suppliedKey: c.suppliedKey,
      suppliedNoteKey: c.suppliedNoteKey,
      resultKey: c.resultKey,
    };
  }

  return {
    id: raw.id,
    nameKey: raw.nameKey,
    sayKey: raw.sayKey,
    sayWhenFixed: raw.sayWhenFixed,
    code: raw.code,
    codeWhenFixed: raw.codeWhenFixed,
    badgeKey: raw.badgeKey,
    badgeFixedKey: raw.badgeFixedKey,
    compare,
    isSecurityLayer: raw.isSecurityLayer,
    broken: raw.broken,
    scatter: { x: raw.scatter.x, y: raw.scatter.y },
  };
}

function parseRegions(raw: unknown, lineCount: number, layerIds: Set<string>): ContractRegion[] {
  if (!Array.isArray(raw)) return malformed('contract.regions must be an array');
  return raw.map((entry, index) => {
    if (!isRecord(entry)) return malformed(`contract.regions[${index}] is not an object`);
    if (!isNonEmptyString(entry.stageId)) {
      return malformed(`contract.regions[${index}].stageId must be a non-empty string`);
    }
    if (!layerIds.has(entry.stageId)) {
      return malformed(`contract.regions[${index}].stageId "${entry.stageId}" names no layer`);
    }
    if (!isFiniteNumber(entry.from) || !isFiniteNumber(entry.to)) {
      return malformed(`contract.regions[${index}] needs numeric from and to`);
    }
    if (entry.from < 0 || entry.to < entry.from || entry.to >= lineCount) {
      return malformed(`contract.regions[${index}] runs outside the contract (${entry.from}..${entry.to})`);
    }
    return { stageId: entry.stageId, from: entry.from, to: entry.to };
  });
}

function parseRanges(raw: unknown, what: string, lineCount: number): ContractRange[] {
  if (!Array.isArray(raw)) return malformed(`contract.${what} must be an array`);
  return raw.map((entry, index) => {
    if (!isRecord(entry)) return malformed(`contract.${what}[${index}] is not an object`);
    if (!isFiniteNumber(entry.from) || !isFiniteNumber(entry.to)) {
      return malformed(`contract.${what}[${index}] needs numeric from and to`);
    }
    if (entry.from < 0 || entry.to < entry.from || entry.to >= lineCount) {
      return malformed(`contract.${what}[${index}] runs outside the contract (${entry.from}..${entry.to})`);
    }
    return { from: entry.from, to: entry.to };
  });
}

/**
 * Margin notes, each pinned to a real line whose text contains its `match`.
 *
 * This is the same property the old `contractSource.test.ts` asserted, moved to
 * the load boundary: a note whose line shifted onto different code is rejected
 * before it can annotate the wrong thing on screen.
 */
function parseMarginNotes(raw: unknown, lines: string[]): MarginNote[] {
  if (!Array.isArray(raw)) return malformed('contract.marginNotes must be an array');
  const seen = new Set<number>();
  return raw.map((entry, index) => {
    if (!isRecord(entry)) return malformed(`contract.marginNotes[${index}] is not an object`);
    if (!isMarginNoteKey(entry.key)) {
      return malformed(`contract.marginNotes[${index}].key "${String(entry.key)}" is not a note key`);
    }
    if (!isFiniteNumber(entry.line) || entry.line < 0 || entry.line >= lines.length) {
      return malformed(`contract.marginNotes[${index}].line is outside the contract`);
    }
    if (!isNonEmptyString(entry.match)) {
      return malformed(`contract.marginNotes[${index}].match must be a non-empty string`);
    }
    if (seen.has(entry.line)) return malformed(`contract.marginNotes[${index}].line is duplicated`);
    seen.add(entry.line);
    if (!lines[entry.line].includes(entry.match)) {
      return malformed(
        `contract.marginNotes[${index}] match "${entry.match}" is not on line ${entry.line}`,
      );
    }
    return { line: entry.line, key: entry.key, match: entry.match };
  });
}

function parseVerification(raw: unknown): VerifyEvidence {
  if (!isRecord(raw)) return malformed('verification must be an object');
  const strings = [
    'vulnerableProgramId',
    'fixedProgramId',
    'attackTxSignature',
    'attackTxError',
    'adminPubkey',
  ] as const;
  for (const key of strings) {
    // `attackTxError` may legitimately be empty before a run; the rest must be
    // filled, because a blank program id or authority is not evidence.
    if (String(raw[key] ?? '') === '' && key !== 'attackTxError') {
      return malformed(`verification.${key} must be a non-empty string`);
    }
    if (typeof raw[key] !== 'string') return malformed(`verification.${key} must be a string`);
  }
  if (!isFiniteNumber(raw.vaultBefore) || !isFiniteNumber(raw.vaultAfter)) {
    return malformed('verification.vaultBefore and vaultAfter must be numbers');
  }
  // Optional: only a lesson whose attack needs a second program (the attacker's
  // own) names one. When present it must be a string, like every other id.
  if (raw.counterfeitProgramId !== undefined && typeof raw.counterfeitProgramId !== 'string') {
    return malformed('verification.counterfeitProgramId must be a string');
  }
  return {
    vulnerableProgramId: raw.vulnerableProgramId as string,
    fixedProgramId: raw.fixedProgramId as string,
    attackTxSignature: raw.attackTxSignature as string,
    attackTxError: raw.attackTxError as string,
    adminPubkey: raw.adminPubkey as string,
    counterfeitProgramId: raw.counterfeitProgramId as string | undefined,
    vaultBefore: raw.vaultBefore,
    vaultAfter: raw.vaultAfter,
  };
}

/**
 * Assemble a lesson from its parsed JSON and its contract text.
 *
 * Split out from the fetch so the very same validation runs on the shipped bytes
 * in the suite — the guard exercises what the app actually renders, not a
 * parallel copy of it.
 */
export function parseLesson(raw: unknown, contractText: string): Lesson {
  if (!isRecord(raw)) return malformed('lesson.json must be an object');
  if (!isNonEmptyString(raw.id) || !LESSON_ID.test(raw.id)) {
    return malformed(`lesson id "${String(raw.id)}" is not a safe slug`);
  }
  if (!Array.isArray(raw.layers) || raw.layers.length === 0) {
    return malformed('layers must be a non-empty array');
  }
  const layers = raw.layers.map(parseLayer);

  const ids = new Set<string>();
  for (const layer of layers) {
    if (ids.has(layer.id)) return malformed(`layer id "${layer.id}" is duplicated`);
    ids.add(layer.id);
  }

  if (!isRecord(raw.contract)) return malformed('contract must be an object');
  const lines = parseContractLines(contractText);
  if (!lines.some((line) => line.includes('declare_id!'))) {
    return malformed('contract.rs has no declare_id!');
  }

  return {
    id: raw.id,
    contractName: isNonEmptyString(raw.contractName) ? raw.contractName : undefined,
    layers,
    contract: {
      lines,
      regions: parseRegions(raw.contract.regions, lines.length, ids),
      excerpt: parseRanges(raw.contract.excerpt, 'excerpt', lines.length),
      marginNotes: parseMarginNotes(raw.contract.marginNotes, lines),
    },
    verification: parseVerification(raw.verification),
  };
}

/** The lesson list the home page reads. */
export function parseLessonIndex(raw: unknown): LessonIndexEntry[] {
  if (!Array.isArray(raw)) return malformed('index.json must be an array');
  return raw.map((entry, index) => {
    if (!isRecord(entry)) return malformed(`index[${index}] is not an object`);
    if (!isNonEmptyString(entry.id) || !LESSON_ID.test(entry.id)) {
      return malformed(`index[${index}].id "${String(entry.id)}" is not a safe slug`);
    }
    if (!isMessageKey(entry.title)) {
      return malformed(`index[${index}].title "${String(entry.title)}" is not a catalogue key`);
    }
    if (!isMessageKey(entry.blurb)) {
      return malformed(`index[${index}].blurb "${String(entry.blurb)}" is not a catalogue key`);
    }
    return { id: entry.id, title: entry.title, blurb: entry.blurb };
  });
}

const BASE = '/lessons';

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (error) {
    throw new LessonError('network', `could not reach ${url}: ${messageOf(error)}`);
  }
  if (response.status === 404) throw new LessonError('notFound', `no lesson file at ${url}`);
  if (!response.ok) throw new LessonError('network', `${url} answered ${response.status}`);
  return response.text();
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const text = await fetchText(url, signal);
  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new LessonError('malformed', `${url} is not valid JSON: ${messageOf(error)}`);
  }
}

/** Read the lesson list. */
export async function fetchLessonIndex(signal?: AbortSignal): Promise<LessonIndexEntry[]> {
  return parseLessonIndex(await fetchJson(`${BASE}/index.json`, signal));
}

/**
 * Read one lesson's folder: its data and its contract together.
 *
 * Both files are fetched in parallel, and the id is checked before it becomes a
 * path — a lesson id is a folder name here, so it may not carry a slash.
 */
export async function fetchLesson(id: string, signal?: AbortSignal): Promise<Lesson> {
  if (!LESSON_ID.test(id)) throw new LessonError('notFound', `"${id}" is not a lesson id`);
  const [data, contract] = await Promise.all([
    fetchJson(`${BASE}/${id}/lesson.json`, signal),
    fetchText(`${BASE}/${id}/contract.rs`, signal),
  ]);
  return parseLesson(data, contract);
}

function messageOf(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
