import { useLayoutEffect, type CSSProperties } from 'react';
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
 * Step 2 — the deployed contract, verbatim, highlighted line by line by our own
 * tokenizer.
 *
 * The listing is the file `anchor build` compiled, not an excerpt of it: the
 * status bar above names the program and the chain it runs on, and the Chinese
 * margin notes sit *beside* the lines they explain rather than inside them, so
 * the code can stay byte-identical to what was deployed.
 *
 * Halfway through the step, each region of the listing is boxed and labelled
 * with the stage it becomes. Without that, the five cards in step 3 arrive from
 * nowhere; with it, the decomposition is just the boxes flying apart.
 */
export default function Step2Code({ onRegionRects }: Step2CodeProps) {
  const { language, t } = useLanguage();
  const blocks = codeBlocks();
  const duration = AUTO_ADVANCE_MS[2] ?? 0;

  // Notes are keyed by absolute line index, so build the lookup once per render
  // rather than scanning MARGIN_NOTES for every one of the file's lines.
  const noteByLine = new Map<number, MarginNoteKey>(
    MARGIN_NOTES.map((note) => [note.line, note.key]),
  );

  // No dependency array: the boxes only change when the listing does, and this
  // is five getBoundingClientRect calls. Runs before paint, so the rects are
  // always current by the time step 3 reads them.
  useLayoutEffect(() => {
    if (!onRegionRects) return;
    const rects: Record<string, DOMRect> = {};
    for (const element of document.querySelectorAll<HTMLElement>('.code-block--mapped')) {
      const id = element.dataset.stage;
      if (id) rects[id] = element.getBoundingClientRect();
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

      <pre className="code-card">
        <code>
          {blocks.map((block) => {
            const stage = block.stageId
              ? VAULT_LAYERS.find((layer) => layer.id === block.stageId)
              : undefined;
            const name = stage ? bilingualName(language, stage.nameKey) : undefined;

            const blockStyle = {
              '--reveal-at': block.revealAt ?? 0,
            } as CSSProperties;

            return (
              <span
                className={`code-block${stage ? ' code-block--mapped' : ''}`}
                key={block.from}
                data-stage={block.stageId ?? undefined}
                style={blockStyle}
              >
                {block.lines.map((line, offset) => {
                  const index = block.from + offset;
                  const noteKey = noteByLine.get(index);

                  return (
                    <span
                      className="code-card__line"
                      key={index}
                      style={{ animationDelay: `${index * LINE_STAGGER_MS}ms` }}
                    >
                      {highlightRust(line).map((token, tokenIndex) => (
                        <span className={`tok tok--${token.kind}`} key={tokenIndex}>
                          {token.text}
                        </span>
                      ))}
                      {noteKey && (
                        <span className="code-card__note" data-testid={`code-note-${index}`}>
                          {t[noteKey]}
                        </span>
                      )}
                    </span>
                  );
                })}

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
