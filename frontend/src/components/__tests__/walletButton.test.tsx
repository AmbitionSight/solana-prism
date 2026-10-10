import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactNode } from 'react';
import WalletButton from '../WalletButton';
import { LanguageContext } from '../../i18n/language';
import { MESSAGES, type Language } from '../../i18n/messages';
import type { SolanaProvider } from '../../lib/wallet';

/**
 * The wallet slot has exactly two jobs, and both are honesty jobs: say so when
 * there is no wallet, and never offer a control that cannot work. The second is
 * the one that has to be guarded — a connect button rendered without a provider
 * is a button that does nothing.
 */

const ADDRESS = 'ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU';

function render(node: ReactNode, language: Language = 'en'): string {
  return renderToStaticMarkup(
    <LanguageContext.Provider value={{ language, setLanguage: () => {}, t: MESSAGES[language] }}>
      {node}
    </LanguageContext.Provider>,
  );
}

function provider(): SolanaProvider {
  return {
    publicKey: null,
    connect: async () => ({ publicKey: null }),
    disconnect: async () => {},
    signTransaction: async <T,>(transaction: T) => transaction,
  };
}

const noop = () => {};

describe('WalletButton — 没有钱包时', () => {
  it('说没检测到, 而不是留一个死按钮', () => {
    const html = render(<WalletButton provider={null} address={null} onAddressChange={noop} />);
    expect(html).toContain(MESSAGES.en.walletMissing);
  });

  it('一个连接按钮都不渲染', () => {
    const html = render(<WalletButton provider={null} address={null} onAddressChange={noop} />);
    expect(html).not.toContain('wallet-connect-btn');
    expect(html).not.toContain('wallet-disconnect-btn');
  });
});

describe('WalletButton — 有钱包但还没连', () => {
  it('给连接按钮', () => {
    const html = render(<WalletButton provider={provider()} address={null} onAddressChange={noop} />);
    expect(html).toContain('data-testid="wallet-connect-btn"');
    expect(html).toContain(MESSAGES.en.walletConnect);
  });

  it('不谎称已连接', () => {
    const html = render(<WalletButton provider={provider()} address={null} onAddressChange={noop} />);
    expect(html).not.toContain(MESSAGES.en.walletConnected);
    expect(html).not.toContain('wallet-disconnect-btn');
  });
});

describe('WalletButton — 已连接', () => {
  const connected = render(
    <WalletButton provider={provider()} address={ADDRESS} onAddressChange={noop} />,
  );

  it('显示已连接与断开', () => {
    expect(connected).toContain(MESSAGES.en.walletConnected);
    expect(connected).toContain(MESSAGES.en.walletDisconnect);
    expect(connected).toContain('data-testid="wallet-disconnect-btn"');
  });

  it('不再显示连接按钮', () => {
    expect(connected).not.toContain('wallet-connect-btn');
  });

  it('地址是省略过的, 不是整串', () => {
    // The full key stays as the element's title — the point is that what is
    // *rendered* is the elided form, not that the value is hidden.
    expect(connected).toContain('>ECnX…N4VU</code>');
    expect(connected).not.toContain(`>${ADDRESS}<`);
  });

  it('可访问名来自文案表', () => {
    expect(connected).toContain(`aria-label="${MESSAGES.en.ariaWallet}"`);
  });
});

describe('WalletButton — 中文', () => {
  it('没有钱包时用中文说话, 不夹带英文', () => {
    const html = render(<WalletButton provider={null} address={null} onAddressChange={noop} />, 'zh');
    expect(html).toContain(MESSAGES.zh.walletMissing);
    expect(html).not.toContain(MESSAGES.en.walletMissing);
  });

  it('已连接时也是中文', () => {
    const html = render(
      <WalletButton provider={provider()} address={ADDRESS} onAddressChange={noop} />,
      'zh',
    );
    expect(html).toContain(MESSAGES.zh.walletConnected);
    expect(html).toContain(MESSAGES.zh.walletDisconnect);
    expect(html).not.toContain(MESSAGES.en.walletDisconnect);
  });
});
