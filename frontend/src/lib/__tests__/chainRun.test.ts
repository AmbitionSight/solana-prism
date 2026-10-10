import { describe, it, expect } from 'vitest';
import { runAttack, type AttackPorts } from '../chainRun';

const PARAMS = {
  vault: '7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2',
  authority: 'ECnXMpRNVhdxbDHTSpjGxEboNUbcipydCBsw6xRjN4VU',
  amount: 500,
};

/** Ports that behave, with the two interesting behaviours switchable. */
function ports(overrides: Partial<AttackPorts> = {}) {
  const sent: { blockhash: string }[] = [];
  const base: AttackPorts = {
    latestBlockhash: async () => 'BLOCKHASH',
    sendWithdraw: async (input) => {
      sent.push({ blockhash: input.blockhash });
      return 'SIG_A';
    },
    signatureStatus: async () => ({ err: null }),
    ...overrides,
  };
  return { ports: base, sent };
}

describe('chainRun — 攻击结果', () => {
  it('链上成功时给出成功与签名', async () => {
    const { ports: p } = ports();
    expect(await runAttack(p, PARAMS)).toEqual({ kind: 'success', signature: 'SIG_A' });
  });

  it('用最新 blockhash 构交易', async () => {
    const { ports: p, sent } = ports();
    await runAttack(p, PARAMS);
    expect(sent).toEqual([{ blockhash: 'BLOCKHASH' }]);
  });

  it('链上被拒时仍带回签名 —— 失败的交易也有签名，那正是修复版的证据', async () => {
    // sendAndConfirmTransaction would have thrown here and lost the signature.
    const { ports: p } = ports({
      signatureStatus: async () => ({ err: { InstructionError: [0, 'AccountNotSigner'] } }),
    });

    const result = await runAttack(p, PARAMS);
    expect(result.kind).toBe('rejected');
    if (result.kind !== 'rejected') throw new Error('unreachable');
    expect(result.signature).toBe('SIG_A');
    expect(result.reason).toMatch(/AccountNotSigner/);
  });

  it('发不出去时是 failed，而不是假装被运行时拒绝', async () => {
    const { ports: p } = ports({
      sendWithdraw: async () => {
        throw new Error('network down');
      },
    });

    const result = await runAttack(p, PARAMS);
    expect(result.kind).toBe('failed');
    if (result.kind !== 'failed') throw new Error('unreachable');
    expect(result.reason).toMatch(/network down/);
  });

  it('取 blockhash 失败时也是 failed', async () => {
    const { ports: p } = ports({
      latestBlockhash: async () => {
        throw new Error('rpc unreachable');
      },
    });
    expect((await runAttack(p, PARAMS)).kind).toBe('failed');
  });
});

describe('chainRun — 确认轮询', () => {
  it('先返回 pending 再返回结果时会一直等到结果', async () => {
    let call = 0;
    const { ports: p } = ports({
      signatureStatus: async () => {
        call += 1;
        return call < 3 ? null : { err: null };
      },
    });

    expect(await runAttack(p, PARAMS, { attempts: 5, delayMs: 0 })).toEqual({
      kind: 'success',
      signature: 'SIG_A',
    });
    expect(call).toBe(3);
  });

  it('始终确认不了时以 failed 收场，不谎报成功', async () => {
    const { ports: p } = ports({ signatureStatus: async () => null });
    const result = await runAttack(p, PARAMS, { attempts: 3, delayMs: 0 });
    expect(result.kind).toBe('failed');
    if (result.kind !== 'failed') throw new Error('unreachable');
    expect(result.reason).toMatch(/not confirmed/i);
  });

  it('查询状态时的瞬时错误不会中断轮询', async () => {
    let call = 0;
    const { ports: p } = ports({
      signatureStatus: async () => {
        call += 1;
        if (call === 1) throw new Error('transient rpc error');
        return { err: null };
      },
    });

    expect((await runAttack(p, PARAMS, { attempts: 3, delayMs: 0 })).kind).toBe('success');
  });
});
