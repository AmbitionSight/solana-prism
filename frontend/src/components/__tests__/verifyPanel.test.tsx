import { describe, it, expect } from 'vitest';
import VerifyPanel from '../VerifyPanel';
import { MESSAGES, formatCluster } from '../../i18n/messages';
import { PENDING, VERIFICATION, solscanTxUrl } from '../../config/verification';
import type { VerifyEvidence } from '../../config/verification';
import { baselines, render } from './harness';

/**
 * Step 6 gains one row and keeps its two voices.
 *
 * The two-voice behaviour is the part that must not break: the panel picks its
 * sentence by asking `isDeployed()`, and it is handed the evidence rather than
 * reading it, so both voices are reachable from a test. The new row is only in
 * the real half of the demo, and only when there is a signature to point at.
 */

const SIG = '4xKmB7mPQ8wQzADMiNx7wQ4xKmB7mPQ8wQzADMiNx7wQ4xKmB7mPQ8wQ';

/** React escapes apostrophes in text nodes; the catalogue keeps them readable. */
function asText(value: string): string {
  return value.replace(/'/g, '&#x27;');
}

describe('VerifyPanel — 缺省时与改动前逐字节一致', () => {
  it('未打开时的 markup 与基线相同', () => {
    expect(render(<VerifyPanel />)).toBe(baselines().verifyPanel);
  });
});

describe('VerifyPanel — 本次运行的签名', () => {
  it('真实模式下多出一行, 并且是这一笔的签名', () => {
    const html = render(<VerifyPanel defaultOpen runSignature={SIG} />);
    expect(html).toContain(asText(MESSAGES.en.chainRealSignature));
    expect(html).toContain(SIG);
  });

  it('那一行链到 Solscan 的这笔交易', () => {
    const html = render(<VerifyPanel defaultOpen runSignature={SIG} />);
    expect(html).toContain(`href="${solscanTxUrl(SIG)}"`);
  });

  it('没有真实运行时根本不渲染这一行', () => {
    const html = render(<VerifyPanel defaultOpen />);
    expect(html).not.toContain(asText(MESSAGES.en.chainRealSignature));
  });

  it('空签名也不会渲染出一个空行', () => {
    const html = render(<VerifyPanel defaultOpen runSignature="" />);
    expect(html).not.toContain(asText(MESSAGES.en.chainRealSignature));
  });

  it('两种话术仍由数据决定: 有真实证据时说已部署', () => {
    const html = render(<VerifyPanel defaultOpen runSignature={SIG} />);
    expect(html).toContain(formatCluster(MESSAGES.en.verifyClaimDeployed));
    expect(html).not.toContain(MESSAGES.en.verifyClaimNotDeployed);
  });

  it('同一份面板, 证据空缺时说没部署', () => {
    // The repository is deployed today, so reaching the other voice means
    // handing the panel a config with the run evidence missing — which is why
    // it takes the evidence as a prop instead of reading the module directly.
    const evidence: VerifyEvidence = {
      ...VERIFICATION,
      attackTxSignature: PENDING,
      attackTxError: PENDING,
    };
    const html = render(<VerifyPanel defaultOpen evidence={evidence} />);
    expect(html).toContain(MESSAGES.en.verifyClaimNotDeployed);
    expect(html).not.toContain(formatCluster(MESSAGES.en.verifyClaimDeployed));
  });
});
