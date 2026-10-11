import { describe, it, expect } from 'vitest';
import { highlightRust } from '../highlight';
import { shippedLesson } from '../../__tests__/shipped';

/** The deployed contract's own lines, as the lesson ships them. */
const CONTRACT_LINES = shippedLesson().contract.lines;

describe('highlightRust', () => {
  it('关键字标红', () => {
    expect(highlightRust('pub fn withdraw')).toEqual([
      { kind: 'keyword', text: 'pub' },
      { kind: 'plain', text: ' ' },
      { kind: 'keyword', text: 'fn' },
      { kind: 'plain', text: ' ' },
      { kind: 'plain', text: 'withdraw' },
    ]);
  });

  it('类型标蓝', () => {
    expect(highlightRust('amount: u64')).toEqual([
      { kind: 'plain', text: 'amount' },
      { kind: 'plain', text: ': ' },
      { kind: 'type', text: 'u64' },
    ]);
  });

  it('注释整行变灰', () => {
    expect(highlightRust('// 但... 没有检查签名!')).toEqual([
      { kind: 'comment', text: '// 但... 没有检查签名!' },
    ]);
  });

  it('缩进的注释保留前导空白为 plain', () => {
    expect(highlightRust('    // 检查 authority')).toEqual([
      { kind: 'plain', text: '    ' },
      { kind: 'comment', text: '// 检查 authority' },
    ]);
  });

  it('require! 宏算关键字', () => {
    const tokens = highlightRust('require!(vault.authority == key());');
    expect(tokens[0]).toEqual({ kind: 'keyword', text: 'require!' });
  });

  it('还原原文无损(不吞字符)', () => {
    const lines = [
      '#[program]',
      'pub mod prism_vulnerable {',
      '    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {',
      '        let vault = &mut ctx.accounts.vault;',
      '        // 检查 authority 地址是否匹配',
      '        require!(vault.authority == ctx.accounts.authority.key());',
      '        vault.balance -= amount;',
      '        Ok(())',
      '    }',
      '}',
      // The verbatim file brought constructs the old excerpt never had. These
      // are its real lines, so the round-trip pins the tokenizer paths they
      // open: `//!` doc comments, `declare_id!`, `use ...;`, `#[account(...)]`.
      CONTRACT_LINES.find((line) => line.startsWith('//!'))!,
      CONTRACT_LINES.find((line) => line.includes('declare_id!'))!,
      CONTRACT_LINES.find((line) => line.includes('use anchor_lang::prelude::*;'))!,
      CONTRACT_LINES.find((line) => line.includes('#[account(init'))!,
    ];
    for (const line of lines) {
      expect(highlightRust(line).map((t) => t.text).join('')).toBe(line);
    }
  });

  it('空行返回空数组', () => {
    expect(highlightRust('')).toEqual([]);
  });
});
