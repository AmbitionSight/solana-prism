import type { CSSProperties } from 'react';
import { AUTO_ADVANCE_MS } from '../lib/steps';
import { useLanguage } from '../i18n/language';
import { highlightRust } from '../lib/highlight';
import { codeLines } from '../lib/code';

const LINE_STAGGER_MS = 60;

/**
 * Step 2 — the contract, highlighted line by line by our own tokenizer.
 *
 * The listing comes from lib/code.ts, which keeps the Rust identical across
 * languages and swaps only the two comments. Lines arrive staggered so the code
 * reads as if it is being written.
 */
export default function Step2Code() {
  const { language } = useLanguage();
  const lines = codeLines(language);

  const style = {
    '--step-duration': `${AUTO_ADVANCE_MS[2]}ms`,
  } as CSSProperties;

  return (
    <section className="step2" style={style} data-testid="step2-code">
      <pre className="code-card">
        <code>
          {lines.map((line, lineIndex) => (
            <span
              className="code-card__line"
              // Keyed by position, NOT by text: the comment lines change when the
              // language changes, and keying by text would remount them and
              // replay their fade-in on every switch.
              key={lineIndex}
              style={{ animationDelay: `${lineIndex * LINE_STAGGER_MS}ms` }}
            >
              {highlightRust(line).map((token, tokenIndex) => (
                <span className={`tok tok--${token.kind}`} key={tokenIndex}>
                  {token.text}
                </span>
              ))}
            </span>
          ))}
        </code>
      </pre>
    </section>
  );
}
