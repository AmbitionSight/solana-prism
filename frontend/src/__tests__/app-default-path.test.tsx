import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderToStaticMarkup } from 'react-dom/server';
import LanguageProvider from '../i18n/LanguageProvider';
import App from '../App';
import { MESSAGES } from '../i18n/messages';
import type { SolanaProvider } from '../lib/wallet';

/**
 * The default path is the one thing this feature must not touch.
 *
 * "No wallet" is the deciding factor for the real-chain layer: with nothing
 * injected, the page has to behave exactly as it did before, because that is the
 * state the recorded walkthrough, `tools/shoot.mjs` and every screenshot assert
 * against. That claim is easy to make and impossible to see, so it is pinned to
 * a fixture captured from the step-5 stage **before** the Devnet layer existed.
 *
 * What this compares, precisely: the server-rendered DOM of `<App>` sitting on
 * step 5 with no wallet present. Both sides are rendered by this same suite, so
 * what it can see is every element, class, attribute and string the default path
 * emits. What it cannot see is anything that only exists after paint (the
 * measurement `ContractLayers` does in a layout effect) or CSS the browser
 * applies — the browser run in `tools/shoot.mjs` covers that half.
 *
 * The generated `@keyframes` block is stripped from both sides: it is produced by
 * `lib/keyframes.ts` from `lib/geometry.ts`, has its own guards, and is not part
 * of what this feature is allowed to disturb.
 *
 * If the demo's steps 3-5 are ever deliberately redesigned, this fixture has to
 * be re-captured — and that is the correct outcome, because the redesign *is* a
 * change to the default path.
 */

const FIXTURE = fileURLToPath(new URL('./fixtures/app-step5-stage.html', import.meta.url));

function renderApp(initialStep: 1 | 5): string {
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

describe('默认路径 — 无钱包时 DOM 与改动前逐字节一致', () => {
  it('确实读到了基线夹具, 而不是空文件', () => {
    // A comparison against an empty string would pass for any render at all.
    const fixture = readFileSync(FIXTURE, 'utf8');
    expect(fixture.length).toBeGreaterThan(500);
    expect(fixture).toContain('data-testid="execute-btn"');
    expect(fixture).toContain('layers-container');
  });

  it('step 5 的舞台 markup 与改动前完全相同', () => {
    const fixture = withoutKeyframes(readFileSync(FIXTURE, 'utf8'));
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
    const fixture = withoutKeyframes(readFileSync(FIXTURE, 'utf8'));
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
