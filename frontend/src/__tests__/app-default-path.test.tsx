import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import LanguageProvider from '../i18n/LanguageProvider';
import App from '../App';
import { MESSAGES } from '../i18n/messages';
import type { SolanaProvider } from '../lib/wallet';

/**
 * The default path (no wallet) must stay deterministic.
 *
 * "No wallet" is the deciding factor for the real-chain layer: with nothing
 * injected, the page has to behave as it did before that layer existed, because
 * that is the state the recorded walkthrough, `tools/shoot.mjs` and every
 * screenshot assert against. The claim is invisible, so it is pinned to fixtures
 * captured from the two pages that matter:
 *
 *   - page 4 (the fill-address page) — the page a reader reaches before the
 *     attack, with no attack UI on it at all;
 *   - page 5 (the attack page) — where `Execute` and the opt-in real-chain entry
 *     live, and therefore where "no wallet means no entry point" is testable.
 *
 * The eight-page renumbering moved both pages down one, so both fixtures moved
 * with them — renamed to the new page numbers, and re-captured where the render
 * itself changed. Either way the generated `@keyframes` block is carried over
 * byte-for-byte because `lib/keyframes.ts` owns it and the suite strips it.
 *
 * What this compares is the server-rendered DOM of `<App>` on those pages with
 * no wallet present — every element, class, attribute and string the default
 * path emits. What it cannot see is anything that only exists after paint (the
 * measurement `ContractLayers` does in a layout effect) or CSS the browser
 * applies; the browser run in `tools/shoot.mjs` covers that half.
 */

const FIXTURE4 = fileURLToPath(new URL('./fixtures/app-step4-stage.html', import.meta.url));
const FIXTURE5 = fileURLToPath(new URL('./fixtures/app-step5-stage.html', import.meta.url));

function renderApp(initialStep: 1 | 4 | 5): string {
  // `renderToStaticMarkup` runs no effects, so ContractLayers' `useLayoutEffect`
  // cannot run and React warns about it. The warning is about SSR in general,
  // not about anything this guard asserts; every other console.error is passed
  // through untouched.
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('useLayoutEffect does nothing on the server')
    ) {
      return;
    }
    originalError(...args);
  };
  try {
    return renderToStaticMarkup(
      <LanguageProvider>
        <App initialStep={initialStep} />
      </LanguageProvider>,
    );
  } finally {
    console.error = originalError;
  }
}

/** Everything from the stage onward: the demo itself, minus the chrome. */
function stageOf(html: string): string {
  const start = html.indexOf('<main');
  expect(start).toBeGreaterThan(0);
  return html.slice(start);
}

/** The generated keyframes, which have their own guards and are not in scope. */
function withoutKeyframes(html: string): string {
  return html.replace(/<style>[\s\S]*?<\/style>/g, '<style></style>');
}

function topControlsOf(html: string): string {
  const start = html.indexOf('<div class="top-controls">');
  const end = html.indexOf('</div>', html.indexOf('<main'));
  expect(start).toBeGreaterThan(0);
  return html.slice(start, end);
}

/** A provider that passed `detectProvider`, with no address yet. */
function fakeProvider(): SolanaProvider {
  return {
    publicKey: null,
    connect: async () => ({ publicKey: null }),
    signTransaction: async <T,>(transaction: T) => transaction,
  };
}

const INJECTED = '__prism_test_provider__';

function injectProvider(provider: unknown): void {
  (globalThis as Record<string, unknown>)[INJECTED] = provider;
  (globalThis as Record<string, unknown>).solana = provider;
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>).solana;
  delete (globalThis as Record<string, unknown>)[INJECTED];
});

describe('默认路径 — 无钱包时页面与基线夹具逐字节一致', () => {
  it('确实读到了两个基线夹具, 而不是空文件', () => {
    // A comparison against an empty string would pass for any render at all.
    const page4 = readFileSync(FIXTURE4, 'utf8');
    expect(page4.length).toBeGreaterThan(500);
    expect(page4).toContain('data-testid="fill-address"');
    expect(page4).toContain('layers-container');
    // The fill page must carry no attack control at all.
    expect(page4).not.toContain('execute-btn');

    const page5 = readFileSync(FIXTURE5, 'utf8');
    expect(page5.length).toBeGreaterThan(500);
    expect(page5).toContain('data-testid="execute-btn"');
    expect(page5).toContain('layers-container');
  });

  it('page 4 的舞台 markup 与基线夹具完全相同', () => {
    const fixture = withoutKeyframes(readFileSync(FIXTURE4, 'utf8'));
    const actual = withoutKeyframes(stageOf(renderApp(4)));
    expect(actual).toBe(fixture);
  });

  it('page 5 的舞台 markup 与基线夹具完全相同', () => {
    const fixture = withoutKeyframes(readFileSync(FIXTURE5, 'utf8'));
    const actual = withoutKeyframes(stageOf(renderApp(5)));
    expect(actual).toBe(fixture);
  });

  it('无 provider 时真实模式入口根本不存在', () => {
    expect(renderApp(5)).not.toContain('execute-devnet-btn');
  });

  it('无 provider 时钱包位置只说没检测到, 不给连接按钮', () => {
    const controls = topControlsOf(renderApp(5));
    expect(controls).toContain(MESSAGES.en.walletMissing);
    expect(controls).not.toContain('wallet-connect-btn');
    expect(controls).not.toContain('wallet-disconnect-btn');
  });

  it('provider 是 undefined 时同样不渲染入口', () => {
    injectProvider(undefined);
    expect(renderApp(5)).not.toContain('execute-devnet-btn');
  });
});

describe('这条守卫本身必须能发现改动', () => {
  it('认得出一个字符的差别', () => {
    const fixture = withoutKeyframes(readFileSync(FIXTURE5, 'utf8'));
    expect(withoutKeyframes(`${fixture} `)).not.toBe(fixture);
  });

  it('不把 chrome 当作舞台', () => {
    const html = renderApp(5);
    expect(html).toContain('top-controls');
    expect(stageOf(html)).not.toContain('top-controls');
  });

  it('注入 provider 之后 chrome 确实变了 —— 说明上面比的是真的', () => {
    // If the wallet slot ignored the provider, the "no wallet" assertions above
    // would hold for a component that never reads it at all. They must not.
    const withoutWallet = topControlsOf(renderApp(5));
    injectProvider(fakeProvider());
    const withWallet = topControlsOf(renderApp(5));
    expect(withWallet).not.toBe(withoutWallet);
    expect(withoutWallet).toContain(MESSAGES.en.walletMissing);
    expect(withWallet).not.toContain(MESSAGES.en.walletMissing);
  });
});
