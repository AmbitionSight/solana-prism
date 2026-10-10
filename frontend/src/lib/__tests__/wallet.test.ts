import { describe, it, expect } from 'vitest';
import { connectWallet, detectProvider, disconnectWallet, type SolanaProvider } from '../wallet';

/**
 * A stand-in for `window.solana`. Real Phantom cannot run in this environment —
 * and it should not have to: everything this module decides is a decision about
 * *shape* (is a provider there, does it expose connect, did the user refuse),
 * and that is all testable with a plain object.
 */
function fakeProvider(publicKey: string | null = 'ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU') {
  const calls: string[] = [];
  const provider = {
    publicKey: publicKey === null ? null : { toBase58: () => publicKey },
    connect: async () => {
      calls.push('connect');
      return { publicKey: { toBase58: () => publicKey ?? '' } };
    },
    disconnect: async () => {
      calls.push('disconnect');
    },
    signTransaction: async <T,>(transaction: T): Promise<T> => {
      calls.push('signTransaction');
      return transaction;
    },
  };
  return { provider: provider as unknown as SolanaProvider, calls };
}

describe('wallet — 探测 provider', () => {
  it('没有 solana 对象时返回 null', () => {
    expect(detectProvider({})).toBeNull();
    expect(detectProvider(undefined)).toBeNull();
  });

  it('solana 存在但没有 connect 时仍返回 null —— 那不是钱包', () => {
    expect(detectProvider({ solana: { publicKey: null } })).toBeNull();
    expect(detectProvider({ solana: 'phantom' })).toBeNull();
  });

  it('形状正确时返回该 provider', () => {
    const { provider } = fakeProvider();
    expect(detectProvider({ solana: provider })).toBe(provider);
  });
});

describe('wallet — 连接与断开', () => {
  it('连接后返回 base58 地址', async () => {
    const { provider, calls } = fakeProvider();
    expect(await connectWallet(provider)).toBe('ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU');
    expect(calls).toEqual(['connect']);
  });

  it('用户拒绝时抛出，不假装连上了', async () => {
    const provider = {
      publicKey: null,
      connect: async () => {
        throw new Error('User rejected the request.');
      },
      signTransaction: async <T,>(transaction: T) => transaction,
    } as unknown as SolanaProvider;

    await expect(connectWallet(provider)).rejects.toThrow(/rejected/i);
  });

  it('连接成功但没给地址时也抛出 —— 半个连接不是连接', async () => {
    const provider = {
      publicKey: null,
      connect: async () => ({ publicKey: null }),
      signTransaction: async <T,>(transaction: T) => transaction,
    } as unknown as SolanaProvider;

    await expect(connectWallet(provider)).rejects.toThrow();
  });

  it('断开时调用钱包的 disconnect', async () => {
    const { provider, calls } = fakeProvider();
    await disconnectWallet(provider);
    expect(calls).toEqual(['disconnect']);
  });

  it('钱包没有 disconnect 时静默通过，不抛错', async () => {
    const provider = {
      publicKey: null,
      connect: async () => ({ publicKey: null }),
      signTransaction: async <T,>(transaction: T) => transaction,
    } as unknown as SolanaProvider;

    await expect(disconnectWallet(provider)).resolves.toBeUndefined();
  });
});
