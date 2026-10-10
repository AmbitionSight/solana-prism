import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import {
  ATTACK_AMOUNT,
  FIXED_VAULT_INDEX,
  INITIAL_BALANCE,
  POOL_SIZE,
  VAULT_DISCRIMINATOR,
  VAULT_SPACE,
  vaultAddress,
} from '../devnet';
import {
  controlStatus,
  executeChainRun,
  planChainRun,
  verdictOf,
  type ChainPlanConfig,
} from '../devnetRun';
import type { AttackPorts } from '../chainRun';

/**
 * Which vault a real run attacks, and what it must *not* do when there is
 * nothing to attack. Both halves are decisions, and decisions that only exist
 * inside a click handler are decisions nobody can check.
 *
 * The two builds are not the same shape of problem:
 *
 * - The vulnerable build consumes a vault, so it needs the pool scan and can run
 *   out (`exhausted` is a real state to report).
 * - The repaired build refuses every attempt, so its vault is never consumed and
 *   there is nothing to scan for. It is deliberately *outside* the pool: aim a
 *   fixed-build call at a vulnerable-owned vault and the runtime refuses it for
 *   the wrong reason (the account's owner, checked before any signer), which
 *   would prove nothing about the missing-signature lesson.
 */

const VULNERABLE_ID = '7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2';
const FIXED_ID = '9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq';
const ADMIN = 'ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU';

function config(overrides: Partial<ChainPlanConfig> = {}): ChainPlanConfig {
  return {
    isFixed: false,
    vulnerableProgramId: VULNERABLE_ID,
    fixedProgramId: FIXED_ID,
    adminPubkey: ADMIN,
    poolSize: POOL_SIZE,
    ...overrides,
  };
}

/** A Vault account as the program lays it out: 8 + 32 + 8 bytes. */
function vaultData(authority: string, balance: number): Uint8Array {
  const data = new Uint8Array(VAULT_SPACE);
  data.set(VAULT_DISCRIMINATOR, 0);
  data.set(new PublicKey(authority).toBytes(), 8);
  new DataView(data.buffer).setBigUint64(40, BigInt(balance), true);
  return data;
}

/** Reads only the pool indices, so index POOL_SIZE is genuinely absent. */
function poolReader(balances: (number | null)[]) {
  return async (address: PublicKey): Promise<Uint8Array | null> => {
    for (let i = 0; i < balances.length; i += 1) {
      if (vaultAddress(i).equals(address)) {
        const balance = balances[i];
        return balance === null ? null : vaultData(ADMIN, balance);
      }
    }
    return null;
  };
}

describe('devnetRun — 漏洞版: 用池子里下一个 fresh vault', () => {
  it('第一个 fresh vault 就是目标', async () => {
    const plan = await planChainRun(config(), poolReader([INITIAL_BALANCE, INITIAL_BALANCE]));
    expect(plan.kind).toBe('run');
    if (plan.kind !== 'run') throw new Error('unreachable');
    expect(plan.target.vault.toBase58()).toBe(vaultAddress(0).toBase58());
  });

  it('跳过已经用掉的那个', async () => {
    const plan = await planChainRun(config(), poolReader([500, INITIAL_BALANCE]));
    if (plan.kind !== 'run') throw new Error('unreachable');
    expect(plan.target.vault.toBase58()).toBe(vaultAddress(1).toBase58());
  });

  it('打的是漏洞版程序, authority 填 ADMIN, 金额是 500', async () => {
    const plan = await planChainRun(config(), poolReader([INITIAL_BALANCE]));
    if (plan.kind !== 'run') throw new Error('unreachable');
    expect(plan.target.programId.toBase58()).toBe(VULNERABLE_ID);
    expect(plan.target.authority.toBase58()).toBe(ADMIN);
    expect(plan.target.amount).toBe(ATTACK_AMOUNT);
  });

  it('池子用尽时是 exhausted, 不是一次注定失败的运行', async () => {
    const plan = await planChainRun(config(), poolReader([500, 500]));
    expect(plan).toEqual({ kind: 'exhausted' });
  });

  it('扫描范围听配置的, 不是写死的', async () => {
    // Index 2 is fresh but the configured pool is only two vaults wide, so the
    // run must report exhaustion rather than reach past what the pool script made.
    const plan = await planChainRun(
      config({ poolSize: 2 }),
      poolReader([500, 500, INITIAL_BALANCE]),
    );
    expect(plan).toEqual({ kind: 'exhausted' });
  });
});

describe('devnetRun — 修复版: 一个不会被消耗的 vault', () => {
  it('目标是池子之外的那一号', async () => {
    const plan = await planChainRun(config({ isFixed: true }), poolReader([]));
    if (plan.kind !== 'run') throw new Error('unreachable');
    expect(plan.target.vault.toBase58()).toBe(vaultAddress(FIXED_VAULT_INDEX).toBase58());
    expect(FIXED_VAULT_INDEX).toBe(POOL_SIZE);
  });

  it('打的是修复版程序, authority 依然是 ADMIN', async () => {
    const plan = await planChainRun(config({ isFixed: true }), poolReader([]));
    if (plan.kind !== 'run') throw new Error('unreachable');
    expect(plan.target.programId.toBase58()).toBe(FIXED_ID);
    expect(plan.target.authority.toBase58()).toBe(ADMIN);
  });

  it('根本不去扫池子 —— 它不需要 fresh vault', async () => {
    let reads = 0;
    const read = async () => {
      reads += 1;
      return null;
    };
    await planChainRun(config({ isFixed: true }), read);
    expect(reads).toBe(0);
  });

  it('池子空了也不影响修复版', async () => {
    const plan = await planChainRun(config({ isFixed: true }), poolReader([500, 500]));
    expect(plan.kind).toBe('run');
  });
});

describe('devnetRun — 配置还没填全时不得假装能跑', () => {
  it('选中的程序 id 是 PENDING 时不给出运行', async () => {
    expect(await planChainRun(config({ vulnerableProgramId: 'TBD' }), poolReader([]))).toEqual({
      kind: 'notDeployed',
    });
    expect(
      await planChainRun(config({ isFixed: true, fixedProgramId: 'TBD' }), poolReader([])),
    ).toEqual({ kind: 'notDeployed' });
  });

  it('ADMIN 公钥是 PENDING 时不给出运行, 也不去猜一个地址', async () => {
    expect(await planChainRun(config({ adminPubkey: 'TBD' }), poolReader([]))).toEqual({
      kind: 'notConfigured',
    });
    // ...and it must not have scanned the pool with a made-up authority either.
    let reads = 0;
    await planChainRun(config({ adminPubkey: 'TBD' }), async () => {
      reads += 1;
      return null;
    });
    expect(reads).toBe(0);
  });
});

describe('devnetRun — 一次运行的编排', () => {
  const target = config();

  function ports(outcome: 'ok' | 'err'): { ports: AttackPorts; sent: string[] } {
    const sent: string[] = [];
    return {
      sent,
      ports: {
        latestBlockhash: async () => 'BLOCKHASH',
        sendWithdraw: async (input) => {
          sent.push(input.vault);
          return 'SIG_A';
        },
        signatureStatus: async () => ({ err: outcome === 'ok' ? null : { InstructionError: [0, 'AccountNotSigner'] } }),
      },
    };
  }

  it('链上成功时把真实签名交回来', async () => {
    const { ports: p, sent } = ports('ok');
    const results: unknown[] = [];
    let planned: string | null = null;

    await executeChainRun(
      { config: target, read: poolReader([INITIAL_BALANCE]), portsFor: () => p },
      {
        onTarget: (t) => {
          planned = t.vault.toBase58();
        },
        onResult: (result) => results.push(result),
      },
    );

    expect(planned).toBe(vaultAddress(0).toBase58());
    expect(sent).toEqual([vaultAddress(0).toBase58()]);
    expect(results).toEqual([{ kind: 'success', signature: 'SIG_A' }]);
  });

  it('运行时拒绝时带回签名与被拒的理由', async () => {
    const results: unknown[] = [];
    await executeChainRun(
      { config: target, read: poolReader([INITIAL_BALANCE]), portsFor: () => ports('err').ports },
      { onTarget: () => {}, onResult: (result) => results.push(result) },
    );

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ kind: 'rejected', signature: 'SIG_A' });
  });

  it('池子用尽时一次交易都不发, 也不谎报结果', async () => {
    const { ports: p, sent } = ports('ok');
    const results: unknown[] = [];
    let planned = 0;

    await executeChainRun(
      { config: target, read: poolReader([500]), portsFor: () => p },
      {
        onTarget: () => {
          planned += 1;
        },
        onResult: (result) => results.push(result),
      },
    );

    expect(planned).toBe(0);
    expect(sent).toEqual([]);
    expect(results).toEqual([{ kind: 'exhausted' }]);
  });

  it('提交不出去时是 failed, 不是 rejected', async () => {
    const failing: AttackPorts = {
      latestBlockhash: async () => 'BLOCKHASH',
      sendWithdraw: async () => {
        throw new Error('wallet refused to sign');
      },
      signatureStatus: async () => null,
    };
    const results: { kind: string; reason?: string }[] = [];

    await executeChainRun(
      { config: target, read: poolReader([INITIAL_BALANCE]), portsFor: () => failing },
      { onTarget: () => {}, onResult: (result) => results.push(result) },
    );

    expect(results).toHaveLength(1);
    expect(results[0].kind).toBe('failed');
    expect(results[0].reason).toMatch(/wallet refused/);
    expect(results[0].kind).not.toBe('rejected');
  });

  it('配置没填全时报告 notConfigured, 而不是发一笔假交易', async () => {
    const { ports: p, sent } = ports('ok');
    const results: unknown[] = [];
    await executeChainRun(
      { config: config({ adminPubkey: 'TBD' }), read: poolReader([]), portsFor: () => p },
      { onTarget: () => {}, onResult: (result) => results.push(result) },
    );
    expect(sent).toEqual([]);
    expect(results).toEqual([{ kind: 'notConfigured' }]);
  });

  it('页面已经翻篇的那次运行不再发交易', async () => {
    // Pressing the animated Execute or Replay while a real run is still planning
    // must not send a transaction the page has stopped waiting for.
    const { ports: p, sent } = ports('ok');
    const results: unknown[] = [];
    let planned = 0;

    await executeChainRun(
      {
        config: target,
        read: poolReader([INITIAL_BALANCE]),
        portsFor: () => p,
        cancelled: () => true,
      },
      {
        onTarget: () => {
          planned += 1;
        },
        onResult: (result) => results.push(result),
      },
    );

    expect(planned).toBe(0);
    expect(sent).toEqual([]);
    expect(results).toEqual([]);
  });
});

describe('devnetRun — 结果到界面的映射', () => {
  it('成功: 成功结论 + 签名', () => {
    expect(verdictOf({ kind: 'success', signature: 'SIG_A' })).toEqual({
      verdict: 'success',
      signature: 'SIG_A',
      detail: undefined,
    });
  });

  it('运行时拒绝: 拒绝结论 + 签名 + 机器的原话', () => {
    expect(verdictOf({ kind: 'rejected', signature: 'SIG_B', reason: 'AccountNotSigner' })).toEqual({
      verdict: 'rejected',
      signature: 'SIG_B',
      detail: 'AccountNotSigner',
    });
  });

  it('提交失败: 是 failed, 且不带签名 —— 它不是一次运行时拒绝', () => {
    expect(verdictOf({ kind: 'failed', reason: 'wallet refused to sign' })).toEqual({
      verdict: 'failed',
      signature: undefined,
      detail: 'wallet refused to sign',
    });
  });

  it('没有结论可报时不编一个出来', () => {
    expect(verdictOf({ kind: 'exhausted' }).verdict).toBeNull();
    expect(verdictOf({ kind: 'notConfigured' }).verdict).toBe('failed');
    expect(verdictOf({ kind: 'notConfigured' }).detail).toBeUndefined();
  });
});

describe('devnetRun — 运行入口旁边的状态', () => {
  it('正在跑的时候就是正在跑', () => {
    expect(controlStatus(null, false, true)).toEqual({ kind: 'busy' });
    // ...even when a previous result is still lying around
    expect(controlStatus({ kind: 'exhausted' }, false, true)).toEqual({ kind: 'busy' });
  });

  it('什么都没发生时什么都不说', () => {
    expect(controlStatus(null, false, false)).toEqual({ kind: 'idle' });
  });

  it('池子用尽是它自己的状态', () => {
    expect(controlStatus({ kind: 'exhausted' }, false, false)).toEqual({ kind: 'exhausted' });
  });

  it('没能开始攻击时, 失败要说在入口旁边 —— 且带着它自己的理由', () => {
    // The pool scan can fail (an unreachable RPC, for one), and then there is no
    // payload and no animation to hang a result under.
    expect(controlStatus({ kind: 'failed', reason: 'rpc unreachable' }, false, false)).toEqual({
      kind: 'failed',
      detail: 'rpc unreachable',
    });
  });

  it('没有填 authority 时是它自己的状态, 不是一次失败的运行', () => {
    // Same condition the animated path reports as `demoNoTarget`: no address is
    // configured, so nothing was submitted and there is no failure to name.
    expect(controlStatus({ kind: 'notConfigured' }, false, false)).toEqual({
      kind: 'notConfigured',
    });
  });

  it('配置缺失优先于「归结果面板」—— 它本就没有结果面板', () => {
    // A notConfigured result never produced a transaction, so an `attacked` flag
    // (however it got set) must not swallow the state into an idle control.
    expect(controlStatus({ kind: 'notConfigured' }, true, false)).toEqual({
      kind: 'notConfigured',
    });
  });

  it('攻击已经打出去之后, 结论归结果面板, 入口不再重复一遍', () => {
    expect(controlStatus({ kind: 'success', signature: 'SIG' }, true, false)).toEqual({
      kind: 'idle',
    });
    expect(controlStatus({ kind: 'rejected', signature: 'SIG', reason: 'x' }, true, false)).toEqual({
      kind: 'idle',
    });
  });

  it('没有攻击却说出了结论时, 不借用失败的措辞', () => {
    // Unreachable through the UI, and the honest answer if it ever happens is to
    // say nothing rather than to claim an attempt failed.
    expect(controlStatus({ kind: 'success', signature: 'SIG' }, false, false)).toEqual({
      kind: 'idle',
    });
  });
});
