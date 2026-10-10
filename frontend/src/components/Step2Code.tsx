import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { AUTO_ADVANCE_MS } from '../lib/steps';
import { useLanguage } from '../i18n/language';
import { bilingualName, formatCluster } from '../i18n/messages';
import { highlightRust } from '../lib/highlight';
import { codeBlocks } from '../lib/code';
import { MARGIN_NOTES, type MarginNoteKey } from '../lib/contractSource';
import { VAULT_LAYERS } from '../config/layers';
import { VERIFICATION } from '../config/verification';

const LINE_STAGGER_MS = 60;

interface Step2CodeProps {
  /**
   * Reports where each stage's box currently sits, so step 3 can start its cards
   * from exactly those positions instead of fading them in at the centre. That
   * continuity is the whole point of the mapping animation.
   */
  onRegionRects?: (rects: Record<string, DOMRect>) => void;
}

/**
 * Step 2 — an excerpt of the deployed contract, highlighted line by line by our
 * own tokenizer.
 *
 * The listing shows the file `anchor build` compiled, but not all of it: 64
 * lines do not fit a 1280x820 viewport at a readable size, and the demo is
 * paged, not scrolled. The ranges shown are CONTRACT_EXCERPT, and every line in
 * them is the file's own text, character for character. What is left out is
 * marked on screen — an elision line says how many lines are hidden — and the
 * status bar says the listing is "key sections, shown verbatim", so the page
 * never quietly claims to be the whole file. The whole file is still linked,
 * verbatim, from the closing note on the attack page.
 *
 * The Chinese margin notes sit *beside* the lines they explain rather than
 * inside them, so the shown lines stay byte-identical to what was deployed.
 *
 * Halfway through the step, each region of the listing is boxed and labelled
 * with the stage it becomes. Without that, the cards in step 3 arrive from
 * nowhere; with it, the decomposition is just the boxes flying apart.
 */
export default function Step2Code({ onRegionRects }: Step2CodeProps) {
  const { language, t } = useLanguage();
  const blocks = codeBlocks();
  const duration = AUTO_ADVANCE_MS[2] ?? 0;
  /** Scopes the measurement below to this listing, not the whole document. */
  const cardRef = useRef<HTMLPreElement>(null);

  // Notes are keyed by absolute line index, so build the lookup once per render
  // rather than scanning MARGIN_NOTES for every one of the file's lines.
  const noteByLine = new Map<number, MarginNoteKey>(
    MARGIN_NOTES.map((note) => [note.line, note.key]),
  );

  // The measured element is a run of code lines, never the boxed block: the
  // margin note sits inside the box, and measuring the box would fold the
  // note's height into the region's centre — an animation point that would
  // then depend on how long the copy happens to be, and so on language. The
  // code lines are identical in both languages; the notes are not.
  //
  // A note on a region's last line therefore falls outside the measurement
  // entirely — four of the five regions. A note *between* two lines splits the
  // region into two runs and the union of those runs is used; a rect cannot be
  // non-contiguous, so that union necessarily spans the note. The residual is
  // half a note line, and at the current copy length the note is one line in
  // both languages, so the bias is a constant rather than a per-language one.
  //
  // No dependency array: the boxes only change when the listing does, and this
  // is five getBoundingClientRect calls. Runs before paint, so the rects are
  // always current by the time step 3 reads them.
  useLayoutEffect(() => {
    if (!onRegionRects) return;
    const root = cardRef.current;
    if (!root) return;
    const rects: Record<string, DOMRect> = {};
    for (const element of root.querySelectorAll<HTMLElement>('.code-block__code[data-stage]')) {
      const id = element.dataset.stage;
      if (!id) continue;
      const rect = element.getBoundingClientRect();
      const previous = rects[id];
      rects[id] = previous
        ? new DOMRect(
            Math.min(previous.left, rect.left),
            Math.min(previous.top, rect.top),
            Math.max(previous.right, rect.right) - Math.min(previous.left, rect.left),
            Math.max(previous.bottom, rect.bottom) - Math.min(previous.top, rect.top),
          )
        : rect;
    }
    onRegionRects(rects);
  });

  const style = {
    '--step-duration': `${duration}ms`,
  } as CSSProperties;

  return (
    <section className="step2" style={style} data-testid="step2-code">
      <div className="contract-status" data-testid="contract-status">
        <span className="contract-status__name">prism_vulnerable</span>
        <span className="contract-status__id">{VERIFICATION.vulnerableProgramId}</span>
        <span className="contract-status__live">{formatCluster(t.contractLive)}</span>
      </div>
      {/* What is on screen, stated on the page: this is sections of the file,
          not the whole file. Without it the elision markers below would be the
          only clue, and "the deployed contract" would read as "all of it". */}
      <p className="contract-scope" data-testid="contract-scope">
        {t.excerptScope}
      </p>

      <pre className="code-card" ref={cardRef}>
        <code>
          {blocks.map((block) => {
            // A gap in the excerpt: print how many lines are missing rather than
            // let the code jump, so the excerpt reads as an excerpt.
            if (block.kind === 'elision') {
              return (
                <span
                  className="code-card__line code-card__elision"
                  key={`elide-${block.from}`}
                  data-testid={`code-elision-${block.from}`}
                  style={{ animationDelay: `${block.from * LINE_STAGGER_MS}ms` }}
                >
                  {t.excerptElided.replace('{n}', String(block.count))}
                </span>
              );
            }

            const stage = block.stageId
              ? VAULT_LAYERS.find((layer) => layer.id === block.stageId)
              : undefined;
            const name = stage ? bilingualName(language, stage.nameKey) : undefined;

            const blockStyle = {
              '--reveal-at': block.revealAt ?? 0,
            } as CSSProperties;

            // Split the block at each margin note, so a note sits *between* two
            // runs of code rather than inside one: the measured wrapper then
            // never contains it, while the note still renders on its own line,
            // exactly where it was.
            const parts: (
              | { kind: 'code'; lines: { text: string; index: number }[] }
              | { kind: 'note'; index: number; key: MarginNoteKey }
            )[] = [];
            let run: { text: string; index: number }[] = [];
            block.lines.forEach((text, offset) => {
              const index = block.from + offset;
              run.push({ text, index });
              const noteKey = noteByLine.get(index);
              if (noteKey) {
                parts.push({ kind: 'code', lines: run });
                parts.push({ kind: 'note', index, key: noteKey });
                run = [];
              }
            });
            if (run.length > 0) parts.push({ kind: 'code', lines: run });

            return (
              <span
                className={`code-block${stage ? ' code-block--mapped' : ''}`}
                key={block.from}
                style={blockStyle}
              >
                {parts.map((part) =>
                  part.kind === 'code' ? (
                    <span
                      className="code-block__code"
                      data-stage={block.stageId ?? undefined}
                      key={`code-${part.lines[0].index}`}
                    >
                      {part.lines.map(({ text, index }) => (
                        <span
                          className="code-card__line"
                          key={index}
                          style={{ animationDelay: `${index * LINE_STAGGER_MS}ms` }}
                        >
                          {highlightRust(text).map((token, tokenIndex) => (
                            <span className={`tok tok--${token.kind}`} key={tokenIndex}>
                              {token.text}
                            </span>
                          ))}
                        </span>
                      ))}
                    </span>
                  ) : (
                    <span
                      className="code-card__line"
                      key={`note-${part.index}`}
                      style={{ animationDelay: `${part.index * LINE_STAGGER_MS}ms` }}
                    >
                      <span className="code-card__note" data-testid={`code-note-${part.index}`}>
                        {t[part.key]}
                      </span>
                    </span>
                  ),
                )}

                {stage && name && (
                  <span className="code-block__label" data-testid={`code-label-${stage.id}`}>
                    <span className="code-block__id">{stage.id}</span>
                    <span className="code-block__name">
                      {name.primary}
                      {name.secondary && (
                        <span className="code-block__name-latin"> {name.secondary}</span>
                      )}
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </code>
      </pre>
    </section>
  );
}
