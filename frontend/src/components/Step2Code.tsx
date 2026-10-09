import type { CSSProperties } from 'react';
import { AUTO_ADVANCE_MS } from '../lib/steps';
import { useLanguage } from '../i18n/language';
import { bilingualName } from '../i18n/messages';
import { highlightRust } from '../lib/highlight';
import { codeBlocks } from '../lib/code';
import { VAULT_LAYERS } from '../config/layers';

const LINE_STAGGER_MS = 60;

/**
 * Step 2 — the contract, highlighted line by line by our own tokenizer.
 *
 * Halfway through the step, each region of the listing is boxed and labelled
 * with the stage it becomes. Without that, the five cards in step 3 arrive from
 * nowhere; with it, the decomposition is just the boxes flying apart.
 *
 * The listing comes from lib/code.ts, which keeps the Rust identical across
 * languages and swaps only the comments.
 */
export default function Step2Code() {
  const { language } = useLanguage();
  const blocks = codeBlocks(language);
  const duration = AUTO_ADVANCE_MS[2] ?? 0;

  const style = {
    '--step-duration': `${duration}ms`,
  } as CSSProperties;

  return (
    <section className="step2" style={style} data-testid="step2-code">
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
                {block.lines.map((line, offset) => (
                  <span
                    className="code-card__line"
                    key={block.from + offset}
                    style={{ animationDelay: `${(block.from + offset) * LINE_STAGGER_MS}ms` }}
                  >
                    {highlightRust(line).map((token, tokenIndex) => (
                      <span className={`tok tok--${token.kind}`} key={tokenIndex}>
                        {token.text}
                      </span>
                    ))}
                  </span>
                ))}

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
