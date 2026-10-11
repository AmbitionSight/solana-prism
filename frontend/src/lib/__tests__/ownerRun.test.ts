import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import type { OwnerRunConfig, OwnerTarget } from '../ownerChain';
import { executeOwnerRun, type OwnerPorts } from '../ownerRun';

/**
 * Every branch of lesson two's run, with the chain faked.
 *
 * The point of these is the *order* and the *conditions*: the vault is prepared
 * before the attack and only for the vulnerable build; the target is announced
 * before anything is sent; and a submission that never happened is never
 * reported as a refusal.
 */

const VULNERABLE = '38hLgAJyNUnRiZvWVWAwTwt9cZMA6wzyPQm3QQDAdWJL';
const FIXED = 'BC5AtnTTYDfhrhxfng7JPUfoVwvcnvPrzuQsE7HpQW93';
const COUNTERFEIT = 'AKW7vUPNvueeG31GV7gRCRtPQyvsmvat4RnzjPXjxiHR';
const VAULT = new PublicKey('7XKEBJJR1rWLPYDmEQ5camjBxjWuHehc1SfsLf4tDEmb');

function config(over: Partial<OwnerRunConfig> = {}): OwnerRunConfig {
  return {
    isFixed: false,
    vulnerableProgramId: VULNERABLE,
    fixedProgramId: FIXED,
    counterfeitProgramId: COUNTERFEIT,
    attackLamports: 50_000_000,
    ...over,
  };
}

interface Harness {
  ports: OwnerPorts;
  trace: string[];
  target?: OwnerTarget;
}

function harness(over: Partial<OwnerPorts> = {}): Harness {
  const trace: string[] = [];
  const ports: OwnerPorts = {
    latestBlockhash: async () => {
      trace.push('blockhash');
      return 'BH';
    },
    ensureVault: async () => {
      trace.push('ensureVault');
    },
    forgeAndWithdraw: async (target) => {
      trace.push(`forgeAndWithdraw:${target.programId.toBase58()}`);
      return 'SIG';
    },
    signatureStatus: async () => {
      trace.push('signatureStatus');
      return { err: null };
    },
    ...over,
  };
  return { ports, trace };
}

const READY = async () => ({ exists: true, lamports: 50_000_000 });

describe('ownerRun — 一次成功的攻击', () => {
  it('先准备金库, 再公告目标, 再发送, 最后给出链的结论', async () => {
    const { ports, trace } = harness();
    const results: unknown[] = [];
    let target: OwnerTarget | undefined;

    await executeOwnerRun(
      {
        config: config(),
        vault: VAULT,
        creditKeypair: Keypair.generate(),
        recipient: Keypair.generate().publicKey,
        readVault: READY,
        ports,
        poll: { attempts: 1, delayMs: 0 },
      },
      {
        onTarget: (value) => {
          target = value;
          trace.push('onTarget');
        },
        onResult: (value) => {
          trace.push('onResult');
          results.push(value);
        },
      },
    );

    // The vault is prepared before the attack, and the target is announced
    // before anything is submitted.
    expect(trace[0]).toBe('onTarget');
    expect(trace).toContain('ensureVault');
    expect(trace.indexOf('ensureVault')).toBeLessThan(trace.indexOf('forgeAndWithdraw:' + VULNERABLE));
    expect(results).toEqual([{ kind: 'success', signature: 'SIG' }]);
    expect(target?.amount).toBe(50_000_000);
    expect(target?.vault.toBase58()).toBe(VAULT.toBase58());
  });
});

describe('ownerRun — 修复版永远不需要准备金库', () => {
  it('打修复版时不调用 ensureVault —— 拒绝从不掏空金库', async () => {
    const { ports, trace } = harness({
      signatureStatus: async () => {
        trace.push('signatureStatus');
        return { err: { InstructionError: [1, { Custom: 3007 }] } };
      },
    });
    const results: unknown[] = [];

    await executeOwnerRun(
      {
        config: config({ isFixed: true }),
        vault: new PublicKey('AFENMertdYaKcKy6FWf8c9dj75fVeaniCjCKK43e1i8N'),
        creditKeypair: Keypair.generate(),
        recipient: Keypair.generate().publicKey,
        readVault: READY,
        ports,
        poll: { attempts: 1, delayMs: 0 },
      },
      { onTarget: () => {}, onResult: (value) => results.push(value) },
    );

    expect(trace).not.toContain('ensureVault');
    expect(results).toEqual([
      { kind: 'rejected', signature: 'SIG', reason: expect.stringContaining('3007') },
    ]);
  });
});

describe('ownerRun — 没有东西可打时说清楚', () => {
  it('占位符 id 时是 notConfigured, 连目标都不公告', async () => {
    const { ports, trace } = harness();
    const results: unknown[] = [];

    await executeOwnerRun(
      {
        config: config({ vulnerableProgramId: 'TBD', counterfeitProgramId: 'TBD' }),
        vault: VAULT,
        creditKeypair: Keypair.generate(),
        recipient: Keypair.generate().publicKey,
        readVault: READY,
        ports,
      },
      {
        onTarget: () => trace.push('onTarget'),
        onResult: (value) => results.push(value),
      },
    );

    expect(trace).not.toContain('onTarget');
    expect(results).toEqual([{ kind: 'notConfigured' }]);
  });

  it('页面已经翻走时什么也不发', async () => {
    const { ports, trace } = harness();
    const results: unknown[] = [];

    await executeOwnerRun(
      {
        config: config(),
        vault: VAULT,
        creditKeypair: Keypair.generate(),
        recipient: Keypair.generate().publicKey,
        readVault: READY,
        ports,
        cancelled: () => true,
      },
      {
        onTarget: () => trace.push('onTarget'),
        onResult: (value) => results.push(value),
      },
    );

    expect(trace).not.toContain('onTarget');
    expect(trace).not.toContain('ensureVault');
    expect(results).toEqual([]);
  });
});

describe('ownerRun — 提交没发生就不是拒绝', () => {
  it('准备金库失败 → failed, 带原因', async () => {
    const { ports } = harness({
      ensureVault: async () => {
        throw new Error('rpc down');
      },
    });
    const results: { kind: string; reason?: string }[] = [];

    await executeOwnerRun(
      {
        config: config(),
        vault: VAULT,
        creditKeypair: Keypair.generate(),
        recipient: Keypair.generate().publicKey,
        readVault: READY,
        ports,
      },
      { onTarget: () => {}, onResult: (value) => results.push(value) },
    );

    expect(results).toEqual([{ kind: 'failed', reason: 'rpc down' }]);
  });

  it('发送失败 → failed, 而不是一条链上拒绝', async () => {
    const { ports } = harness({
      forgeAndWithdraw: async () => {
        throw new Error('send failed');
      },
    });
    const results: { kind: string; reason?: string }[] = [];

    await executeOwnerRun(
      {
        config: config(),
        vault: VAULT,
        creditKeypair: Keypair.generate(),
        recipient: Keypair.generate().publicKey,
        readVault: READY,
        ports,
      },
      { onTarget: () => {}, onResult: (value) => results.push(value) },
    );

    expect(results).toEqual([{ kind: 'failed', reason: 'send failed' }]);
  });
});
