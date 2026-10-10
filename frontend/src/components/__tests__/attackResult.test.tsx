import { describe, it, expect } from 'vitest';
import AttackResult from '../AttackResult';
import { MESSAGES } from '../../i18n/messages';
import { baselines, render } from './harness';

/**
 * The payoff line. Two things must hold at once:
 *
 * - with no explicit outcome it is still the animation's verdict, byte for byte;
 * - with one, the animation's verdict is replaced by what the chain actually
 *   said — and a run that never reached the chain may not borrow the sentence
 *   for one the runtime refused.
 */

describe('AttackResult — 缺省时仍由 isFixed 推导, 与改动前一致', () => {
  it('漏洞版 → 攻击成功', () => {
    expect(render(<AttackResult isFixed={false} />)).toBe(baselines().attackResultVulnerable);
  });

  it('修复版 → 交易被拒绝', () => {
    expect(render(<AttackResult isFixed />)).toBe(baselines().attackResultFixed);
  });
});

describe('AttackResult — 真实结论优先于推导', () => {
  it('漏洞版但链上真的拒绝了 → 显示被拒', () => {
    expect(render(<AttackResult isFixed={false} outcome="rejected" />)).toBe(
      baselines().attackResultFixed,
    );
  });

  it('修复版但链上真的成功了 → 显示成功', () => {
    expect(render(<AttackResult isFixed outcome="success" />)).toBe(
      baselines().attackResultVulnerable,
    );
  });

  it('真实的运行时拒绝会带上机器的原话', () => {
    const html = render(
      <AttackResult isFixed outcome="rejected" detail="InstructionError: AccountNotSigner" />,
    );
    expect(html).toContain(MESSAGES.en.resultRejectedTitle);
    expect(html).toContain('AccountNotSigner');
  });
});

describe('AttackResult — 提交失败不得说成被运行时拒绝', () => {
  const html = render(<AttackResult isFixed outcome="failed" detail="wallet refused to sign" />);

  it('用自己的一句话, 而不是借来的指责', () => {
    expect(html).toContain(MESSAGES.en.chainAttemptFailed);
  });

  it('不出现"交易被拒绝"的结论', () => {
    expect(html).not.toContain(MESSAGES.en.resultRejectedTitle);
    expect(html).not.toContain(MESSAGES.en.resultRejectedBody);
    // ...and not the other refusal sentence either: nothing was refused.
    expect(html).not.toContain(MESSAGES.en.chainTxFailed);
  });

  it('把机器的原话如实带上, 而不是替它下结论', () => {
    expect(html).toContain('wallet refused to sign');
  });

  it('没有细节时也依然是"没有结论", 不会退回成功或被拒', () => {
    const bare = render(<AttackResult isFixed={false} outcome="failed" />);
    expect(bare).toContain(MESSAGES.en.chainAttemptFailed);
    expect(bare).not.toContain(MESSAGES.en.resultRejectedTitle);
    expect(bare).not.toContain(MESSAGES.en.resultSuccessTitle);
  });

  it('中文下也是自己的一句话', () => {
    const zh = render(<AttackResult isFixed outcome="failed" />, 'zh');
    expect(zh).toContain(MESSAGES.zh.chainAttemptFailed);
    expect(zh).not.toContain(MESSAGES.zh.resultRejectedTitle);
  });
});
