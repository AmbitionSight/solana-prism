import { describe, it, expect } from 'vitest';
import { codeBlocks, codeLines } from '../code';
import { AUTO_ADVANCE_MS } from '../steps';

/**
 * The listing as this project pins it. The two comment lines carry the lesson,
 * so they are the only lines allowed to differ between languages.
 */
const REFERENCE = [
  '#[derive(Accounts)]',
  "pub struct Withdraw<'info> {",
  '    #[account(mut)]',
  "    pub vault: Account<'info, Vault>,",
  '    /// CHECK: 只查地址，不要求签名 —— 漏洞就在这里',
  "    pub authority: AccountInfo<'info>,",
  '}',
  '',
  '#[program]',
  'pub mod xray_vault {',
  '    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {',
  '        let vault = &mut ctx.accounts.vault;',
  '        // 地址对得上就放行 —— 但从没验过是谁签的名',
  '        require!(vault.authority == ctx.accounts.authority.key());',
  '        vault.balance -= amount;',
  '        Ok(())',
  '    }',
  '}',
];

const COMMENT_INDICES = [4, 12];

describe('code listing', () => {
  it('两种语言行数一致', () => {
    expect(codeLines('en')).toHaveLength(REFERENCE.length);
    expect(codeLines('zh')).toHaveLength(REFERENCE.length);
  });

  it('中文版与基准逐字节相同', () => {
    expect(codeLines('zh')).toEqual(REFERENCE);
  });

  it('英文版除注释外与基准逐字节相同', () => {
    const en = codeLines('en');
    REFERENCE.forEach((line, index) => {
      if (COMMENT_INDICES.includes(index)) return;
      expect(en[index], `第 ${index + 1} 行代码被改动了`).toBe(line);
    });
  });

  it('两处注释确实分了语言', () => {
    const en = codeLines('en');
    const zh = codeLines('zh');
    for (const index of COMMENT_INDICES) {
      expect(en[index]).not.toBe(zh[index]);
    }
    // `///` doc comment and `//` line comment respectively.
    expect(en[4].trimStart().startsWith('/// ')).toBe(true);
    expect(en[12].trimStart().startsWith('// ')).toBe(true);
  });

  /**
   * Regression guard for the redesign: the earlier listing showed only the
   * handler body, which hid the declaration the whole demo is about.
   */
  it('列表必须包含账户声明 —— 漏洞就在那里', () => {
    const listing = codeLines('en').join('\n');
    expect(listing).toContain('#[derive(Accounts)]');
    expect(listing).toContain("pub authority: AccountInfo<'info>,");
    // ...and the declaration must come before the handler, as it does in Rust.
    expect(listing.indexOf('#[derive(Accounts)]')).toBeLessThan(listing.indexOf('#[program]'));
  });

  it('没有行尾空白', () => {
    for (const line of [...codeLines('en'), ...codeLines('zh')]) {
      expect(line).not.toMatch(/\s+$/);
    }
  });
});

describe('code blocks — 代码到阶段的映射', () => {
  it('每一行都恰好归属一个块, 顺序不变', () => {
    for (const language of ['en', 'zh'] as const) {
      expect(codeBlocks(language).flatMap((block) => block.lines)).toEqual(codeLines(language));
    }
  });

  it('五个阶段都被映射到了代码行', () => {
    const stages = codeBlocks('en')
      .map((block) => block.stageId)
      .filter((id): id is string => id !== null);
    expect([...stages].sort()).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
  });

  it('区块之间不重叠', () => {
    const blocks = codeBlocks('en');
    let expectedFrom = 0;
    for (const block of blocks) {
      expect(block.from).toBe(expectedFrom);
      expectedFrom += block.lines.length;
    }
  });

  it('两种语言的区块结构完全一致', () => {
    const shape = (language: 'en' | 'zh') =>
      codeBlocks(language).map((block) => [block.stageId, block.from, block.lines.length]);
    expect(shape('zh')).toEqual(shape('en'));
  });

  it('标注按源码顺序从上往下依次出现', () => {
    const reveals = codeBlocks('en')
      .filter((block) => block.revealAt !== undefined)
      .map((block) => block.revealAt as number);
    expect(reveals).toHaveLength(5);
    for (let i = 1; i < reveals.length; i++) {
      expect(reveals[i]).toBeGreaterThan(reveals[i - 1]);
    }
  });

  it('最后一个标注在卡片开始淡出之前就出现完了', () => {
    const duration = AUTO_ADVANCE_MS[2] ?? 0;
    const revealed = codeBlocks('en').filter((block) => block.revealAt !== undefined);
    const last = revealed[revealed.length - 1];
    // Reveal delay + the label's own animation, against the point the card
    // starts dissolving (code-card-out holds until 96%).
    const doneAtMs = (last?.revealAt ?? 0) * duration + 400;
    expect(doneAtMs).toBeLessThan(0.96 * duration);
  });
});
