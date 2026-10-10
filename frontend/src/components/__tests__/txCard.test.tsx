import { describe, it, expect } from 'vitest';
import TxCard, { type TxPayload } from '../TxCard';
import { MESSAGES } from '../../i18n/messages';
import { baselines, render } from './harness';

/**
 * The transaction card is where the demo's argument is easiest to fake: the two
 * addresses on it used to be hardcoded ellipses that no transaction ever had.
 * In a real run they must be this run's addresses, and in the animated run they
 * must still be exactly what they were.
 */

const VAULT = '7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2';
const ADMIN = 'ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU';
const SIGNER = '9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq';

const payload: TxPayload = { vault: VAULT, authority: ADMIN, signer: SIGNER };

describe('TxCard — 没有 payload 时与改动前逐字节一致', () => {
  it('markup 与基线完全相同', () => {
    expect(render(<TxCard />)).toBe(baselines().txCard);
  });

  it('基线里确实是那两个写死的省略地址', () => {
    // Guards the baseline itself: a fixture that had been re-captured after the
    // change would make the comparison above vacuous.
    expect(baselines().txCard).toContain('7xKm…9mPQ');
    expect(baselines().txCard).toContain('ADMiN…x7wQ');
  });
});

describe('TxCard — 有真实 payload 时', () => {
  const html = render(<TxCard payload={payload} />);

  it('vault 与 authority 换成这一次真实的 base58, 省略显示', () => {
    expect(html).toContain('<code class="txcard__value">7Sdc…P8U2</code>');
    expect(html).toContain('<code class="txcard__value">ECnX…N4VU</code>');
  });

  it('写死的占位一个都不再出现', () => {
    expect(html).not.toContain('7xKm…9mPQ');
    expect(html).not.toContain('ADMiN…x7wQ');
  });

  it('签名的是访客钱包自己的地址', () => {
    expect(html).toContain('9CFb…ayPq');
  });

  it('ADMIN 依旧没有签名 —— 这正是演示的论点', () => {
    expect(html).toContain(MESSAGES.en.txNoteSignatureAbsent);
    expect(html).toContain('txcard__item--missing');
  });

  it('整串地址不出现在可见文本里, 只出现省略形式', () => {
    expect(html).not.toContain(`>${VAULT}<`);
    expect(html).not.toContain(`>${ADMIN}<`);
  });

  it('字段名仍然是交易里的原名, 没有被翻译', () => {
    expect(html).toContain('accounts:');
    expect(html).toContain('signatures:');
    expect(html).toContain('vault');
    expect(html).toContain('authority');
  });
});
