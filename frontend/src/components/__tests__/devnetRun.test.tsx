import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import DevnetRun from '../DevnetRun';
import { LanguageContext } from '../../i18n/language';
import { MESSAGES, formatCluster, type Language } from '../../i18n/messages';
import { PENDING, VERIFICATION } from '../../config/verification';

/**
 * The real-run entry point is opt-in, and the opt-in test is the whole guard:
 * if this button can appear without a connected wallet, the demo's default path
 * has changed and `tools/shoot.mjs` is asserting against a page that no longer
 * exists.
 */

function render(node: ReactNode, language: Language = 'en'): string {
  return renderToStaticMarkup(
    <LanguageContext.Provider value={{ language, setLanguage: () => {}, t: MESSAGES[language] }}>
      {node}
    </LanguageContext.Provider>,
  );
}

const VULNERABLE = VERIFICATION.vulnerableProgramId;
const noop = () => {};

const base = {
  isFixed: false,
  programId: VULNERABLE,
  status: { kind: 'idle' } as const,
  onRun: noop,
};

describe('DevnetRun — 没有钱包就没有入口', () => {
  it('没有 provider 时什么都不渲染', () => {
    const html = render(<DevnetRun {...base} providerPresent={false} connected={false} />);
    expect(html).toBe('');
  });

  it('有 provider 但没连接时也不渲染 —— 没连接签不了名', () => {
    const html = render(<DevnetRun {...base} providerPresent connected={false} />);
    expect(html).toBe('');
  });

  it('没连接时不会出现任何真实模式文案', () => {
    const html = render(<DevnetRun {...base} providerPresent={false} connected={false} />);
    expect(html).not.toContain(formatCluster(MESSAGES.en.executeOnDevnet));
    expect(html).not.toContain(MESSAGES.en.chainExhausted);
  });
});

describe('DevnetRun — 已连接且程序已部署', () => {
  const html = render(<DevnetRun {...base} providerPresent connected />);

  it('给出真实模式按钮', () => {
    expect(html).toContain('data-testid="execute-devnet-btn"');
    expect(html).toContain(formatCluster(MESSAGES.en.executeOnDevnet));
  });

  it('空闲时不禁用', () => {
    expect(html).not.toContain('disabled');
  });

  it('提到需要一点 Devnet SOL', () => {
    expect(html).toContain(formatCluster(MESSAGES.en.chainNeedSol));
  });

  it('发送中时禁用并说明正在发送', () => {
    const sending = render(
      <DevnetRun {...base} status={{ kind: 'busy' }} providerPresent connected />,
    );
    expect(sending).toContain('disabled');
    expect(sending).toContain(MESSAGES.en.chainRunning);
  });

  it('池子用尽时如实说用尽, 而不是假装成功', () => {
    const empty = render(
      <DevnetRun {...base} status={{ kind: 'exhausted' }} providerPresent connected />,
    );
    expect(empty).toContain(MESSAGES.en.chainExhausted);
  });

  it('连攻击都没开始就失败时, 在入口旁边说没能完成', () => {
    const failed = render(
      <DevnetRun
        {...base}
        status={{ kind: 'failed', detail: 'getAccountInfo failed' }}
        providerPresent
        connected
      />,
    );
    expect(failed).toContain(MESSAGES.en.chainAttemptFailed);
    expect(failed).toContain('getAccountInfo failed');
    expect(failed).not.toContain(MESSAGES.en.resultRejectedTitle);
  });
});

describe('DevnetRun — 修复版还没部署时', () => {
  it('不给按钮, 并说明这里的拒绝来自动画', () => {
    const html = render(
      <DevnetRun {...base} isFixed programId={PENDING} providerPresent connected />,
    );
    expect(html).not.toContain('execute-devnet-btn');
    expect(html).toContain(MESSAGES.en.chainFixedNotDeployed);
  });

  it('那句话只对修复版说 —— 漏洞版没有这个回落态', () => {
    const html = render(
      <DevnetRun {...base} isFixed={false} programId={PENDING} providerPresent connected />,
    );
    expect(html).not.toContain(MESSAGES.en.chainFixedNotDeployed);
    expect(html).not.toContain('execute-devnet-btn');
  });

  it('修复版已部署时不说那句话', () => {
    const html = render(
      <DevnetRun
        {...base}
        isFixed
        programId={VERIFICATION.fixedProgramId}
        providerPresent
        connected
      />,
    );
    expect(html).not.toContain(MESSAGES.en.chainFixedNotDeployed);
    expect(html).toContain('execute-devnet-btn');
  });
});

describe('DevnetRun — 中文', () => {
  it('真实模式文案是中文, 不夹带英文', () => {
    const html = render(<DevnetRun {...base} providerPresent connected />, 'zh');
    expect(html).toContain(formatCluster(MESSAGES.zh.executeOnDevnet));
    expect(html).toContain(formatCluster(MESSAGES.zh.chainNeedSol));
    expect(html).not.toContain(formatCluster(MESSAGES.en.executeOnDevnet));
  });

  it('回落的拒绝说明也是中文', () => {
    const html = render(
      <DevnetRun {...base} isFixed programId={PENDING} providerPresent connected />,
      'zh',
    );
    expect(html).toContain(MESSAGES.zh.chainFixedNotDeployed);
    expect(html).not.toContain(MESSAGES.en.chainFixedNotDeployed);
  });

  it('没能完成的说明也是中文', () => {
    const html = render(
      <DevnetRun {...base} status={{ kind: 'failed', detail: 'boom' }} providerPresent connected />,
      'zh',
    );
    expect(html).toContain(MESSAGES.zh.chainAttemptFailed);
    expect(html).not.toContain(MESSAGES.en.chainAttemptFailed);
  });
});
