import type { CSSProperties } from 'react';
import { AUTO_ADVANCE_MS } from '../lib/steps';
import { highlightRust } from '../lib/highlight';

/** The withdraw path as it appears in the vulnerable build. */
const CODE = [
  '#[program]',
  'pub mod xray_vault {',
  '    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {',
  '        let vault = &mut ctx.accounts.vault;',
  '        // 检查 authority 地址是否匹配',
  '        require!(vault.authority == ctx.accounts.authority.key());',
  '        // 但... 没有检查签名!',
  '        vault.balance -= amount;',
  '        Ok(())',
  '    }',
  '}',
];

const LINE_STAGGER_MS = 60;

/**
 * Step 2 — the contract, highlighted line by line by our own tokenizer.
 * Lines arrive staggered so the code reads as if it is being written.
 */
export default function Step2Code() {
  const style = {
    '--step-duration': `${AUTO_ADVANCE_MS[2]}ms`,
  } as CSSProperties;

  return (
    <section className="step2" style={style} data-testid="step2-code">
      <pre className="code-card">
        <code>
          {CODE.map((line, lineIndex) => (
            <span
              className="code-card__line"
              key={line}
              style={{ animationDelay: `${lineIndex * LINE_STAGGER_MS}ms` }}
            >
              {highlightRust(line).map((token, tokenIndex) => (
                <span className={`tok tok--${token.kind}`} key={tokenIndex}>
                  {token.text}
                </span>
              ))}
              {'\n'}
            </span>
          ))}
        </code>
      </pre>
    </section>
  );
}
