import { describe, it, expect } from 'vitest';
import { codeLines } from '../code';

/**
 * The listing exactly as the master spec pins it (docs/solana-xray-plan.md,
 * step 2). The two comment lines carry the lesson, so they are the only lines
 * allowed to differ between languages.
 */
const SPEC_LINES = [
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

const COMMENT_INDICES = [4, 6];

describe('code listing', () => {
  it('两种语言都是 11 行', () => {
    expect(codeLines('en')).toHaveLength(11);
    expect(codeLines('zh')).toHaveLength(11);
  });

  it('中文版与主计划的 11 行逐字节相同', () => {
    expect(codeLines('zh')).toEqual(SPEC_LINES);
  });

  it('英文版除注释外与主计划逐字节相同', () => {
    const en = codeLines('en');
    SPEC_LINES.forEach((specLine, index) => {
      if (COMMENT_INDICES.includes(index)) return;
      expect(en[index], `第 ${index + 1} 行代码被改动了`).toBe(specLine);
    });
  });

  it('两处注释确实分了语言', () => {
    const en = codeLines('en');
    const zh = codeLines('zh');
    for (const index of COMMENT_INDICES) {
      expect(en[index]).not.toBe(zh[index]);
      expect(en[index].startsWith('        // ')).toBe(true);
      expect(zh[index].startsWith('        // ')).toBe(true);
    }
  });

  it('注释行保持缩进, 不破坏 Rust 结构', () => {
    for (const line of [...codeLines('en'), ...codeLines('zh')]) {
      expect(line).not.toMatch(/\s+$/); // no trailing whitespace
    }
  });
});
