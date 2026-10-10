import { describe, it, expect } from 'vitest';
import { MESSAGES, bilingualName, formatCluster, type MessageKey } from '../messages';
import { clusterLabel } from '../../config/verification';

const LANGUAGES = ['en', 'zh'] as const;

/**
 * Values that are deliberately identical in both languages. Keep this empty if
 * at all possible — an entry here means a user sees English while reading Chinese.
 */
const INTENTIONALLY_UNTRANSLATED = new Set<MessageKey>([]);

const CJK = /[\u4e00-\u9fff]/;

describe('messages — 完整性', () => {
  it('两种语言的键集完全一致', () => {
    const en = Object.keys(MESSAGES.en).sort();
    const zh = Object.keys(MESSAGES.zh).sort();
    expect(zh).toEqual(en);
    expect(en.length).toBeGreaterThan(20);
  });

  it('没有空值', () => {
    const empty: string[] = [];
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(MESSAGES[language])) {
        if (value.trim().length === 0) empty.push(`${language}.${key}`);
      }
    }
    expect(empty).toEqual([]);
  });

  it('每一条中文都真的被翻译了(含中文字符且不等于英文)', () => {
    const untranslated: string[] = [];
    for (const key of Object.keys(MESSAGES.en) as MessageKey[]) {
      if (INTENTIONALLY_UNTRANSLATED.has(key)) continue;
      const zh = MESSAGES.zh[key];
      if (!CJK.test(zh)) untranslated.push(`${key}: 没有中文字符 -> ${JSON.stringify(zh)}`);
      if (zh === MESSAGES.en[key]) untranslated.push(`${key}: 与英文完全相同`);
    }
    expect(untranslated).toEqual([]);
  });

  it('英文里不夹带中文', () => {
    const leaking = (Object.keys(MESSAGES.en) as MessageKey[]).filter((key) =>
      CJK.test(MESSAGES.en[key]),
    );
    expect(leaking).toEqual([]);
  });
});

describe('messages — 层名中英对照', () => {
  it('英文模式只给主名', () => {
    expect(bilingualName('en', 'stageDeclaration')).toEqual({ primary: 'Account Declaration' });
  });

  it('中文模式给出中文主名 + 英文副名', () => {
    expect(bilingualName('zh', 'stageDeclaration')).toEqual({
      primary: '账户声明',
      secondary: 'Account Declaration',
    });
  });

  it('五个阶段都有中英两份', () => {
    const keys = [
      'stageInstruction',
      'stageAccounts',
      'stageDeclaration',
      'stageManualCheck',
      'stageStateChange',
    ] as const;
    for (const key of keys) {
      const zh = bilingualName('zh', key);
      expect(zh.secondary, `${key} 缺少英文副名`).toBe(MESSAGES.en[key]);
      expect(zh.primary).not.toBe(zh.secondary);
    }
  });
});

describe('messages — 关键文案锁定', () => {
  it('英文标题与主计划一致', () => {
    expect(MESSAGES.en.step1Title).toBe('What is a smart contract?');
  });

  it('攻击结果两套文案', () => {
    expect(MESSAGES.en.resultSuccessTitle).toBe('Attack Successful');
    expect(MESSAGES.en.resultRejectedTitle).toBe('Transaction Rejected');
  });

  it('中文标题不是英文', () => {
    expect(MESSAGES.zh.step1Title).not.toBe(MESSAGES.en.step1Title);
    expect(CJK.test(MESSAGES.zh.step1Title)).toBe(true);
  });
});

/**
 * The real-chain copy, pinned to the design spec's table (§5.5) word for word.
 *
 * It is pinned rather than merely present because every sentence here is a claim
 * about what the chain did or did not do, and the spec settled each one
 * deliberately. A paraphrase is a different claim, and this is the file where
 * that would otherwise go unnoticed.
 *
 * Three of them carry a `{cluster}` slot rather than naming the chain in
 * longhand — see the templating block at the end of this file for why, and for
 * the check that the slot is filled with the cluster the config actually names.
 */
describe('messages — 真实链条文案与规格逐字一致 (spec §5.5)', () => {
  const SPEC: [MessageKey, string, string][] = [
    ['walletConnect', 'Connect wallet', '连接钱包'],
    ['walletDisconnect', 'Disconnect', '断开'],
    ['walletConnected', 'Connected', '已连接'],
    ['walletMissing', 'No Solana wallet detected in this browser.', '此浏览器未检测到 Solana 钱包。'],
    ['executeOnDevnet', 'Execute on {cluster}', '在 {cluster} 上执行'],
    ['chainRunning', 'Sending the transaction…', '正在发送交易…'],
    ['chainNeedSol', 'This needs a little {cluster} SOL for fees.', '这需要一点 {cluster} SOL 付手续费。'],
    [
      'chainExhausted',
      'The prepared vault pool is used up. Re-run the pool script to refill it.',
      '预备的 vault 池已用尽。重跑建池脚本即可补充。',
    ],
    [
      'chainFixedNotDeployed',
      'The repaired build is not deployed, so this refusal is the animation.',
      '修复版未部署，因此这里的拒绝来自动画。',
    ],
    ['chainTxFailed', 'The transaction was rejected by the runtime.', '交易被运行时拒绝。'],
    ["chainRealSignature", "this run's signature", '本次运行的签名'],
    [
      'chainNotLamports',
      "The vault's balance is a number in its account, not lamports moved.",
      'vault 的余额是账户里的一个数字，并不涉及 lamport 转移。',
    ],
    ['ariaWallet', 'Wallet', '钱包'],
  ];

  it('每一条都与规格逐字相同', () => {
    const drift: string[] = [];
    for (const [key, en, zh] of SPEC) {
      if (MESSAGES.en[key] !== en) drift.push(`en.${key} = ${JSON.stringify(MESSAGES.en[key])}`);
      if (MESSAGES.zh[key] !== zh) drift.push(`zh.${key} = ${JSON.stringify(MESSAGES.zh[key])}`);
    }
    expect(drift).toEqual([]);
  });

  it('规格里的键一个都不少', () => {
    // Anti-vacuous: the loop above would pass over an empty table.
    expect(SPEC.length).toBe(13);
    for (const [key] of SPEC) {
      expect(Object.keys(MESSAGES.en)).toContain(key);
    }
  });

  it('"尝试没能完成"有自己的一句话, 不借用"被运行时拒绝"', () => {
    // The one key not in the spec's table, and the reason it exists: a run that
    // never reached the chain may not be described as one the runtime refused.
    expect(MESSAGES.en.chainAttemptFailed).not.toBe(MESSAGES.en.chainTxFailed);
    expect(MESSAGES.zh.chainAttemptFailed).not.toBe(MESSAGES.zh.chainTxFailed);
    expect(MESSAGES.en.chainAttemptFailed.trim().length).toBeGreaterThan(0);
    expect(CJK.test(MESSAGES.zh.chainAttemptFailed)).toBe(true);
  });
});

/**
 * The three sentences that name the chain take `{cluster}` rather than spelling
 * it out.
 *
 * This was not a hypothetical: the demo moved from devnet to testnet, the config
 * moved with it, and the button kept saying "Execute on Devnet". A name written
 * into copy by hand is a name that goes stale in silence, which for the claim
 * sentence — "the exploit is real, deployed and reproducible on …" — is the one
 * mistake this demo cannot afford.
 */
describe('messages — 链名来自配置, 不是写死的', () => {
  it('模板里真的还有那个槽位', () => {
    // Anti-vacuous: filling a template with no slot would pass trivially.
    for (const template of [
      MESSAGES.en.executeOnDevnet,
      MESSAGES.zh.executeOnDevnet,
      MESSAGES.en.chainNeedSol,
      MESSAGES.zh.chainNeedSol,
      MESSAGES.en.verifyClaimDeployed,
      MESSAGES.zh.verifyClaimDeployed,
      MESSAGES.en.contractLive,
      MESSAGES.zh.contractLive,
    ]) {
      expect(template).toContain('{cluster}');
    }
  });

  it('填出来的就是配置里那一条链', () => {
    expect(clusterLabel()).toBe('Testnet');
    expect(formatCluster(MESSAGES.en.executeOnDevnet)).toBe('Execute on Testnet');
    expect(formatCluster(MESSAGES.zh.executeOnDevnet)).toBe('在 Testnet 上执行');
    expect(formatCluster(MESSAGES.en.verifyClaimDeployed)).toContain('Testnet');
    expect(formatCluster(MESSAGES.zh.verifyClaimDeployed)).toContain('Testnet');
  });

  it('重新指向别的链时文案跟着走', () => {
    expect(formatCluster(MESSAGES.en.executeOnDevnet, 'devnet')).toBe('Execute on Devnet');
  });

  it('没有残留的未填槽位', () => {
    const unfilled: string[] = [];
    for (const language of LANGUAGES) {
      for (const [key, value] of Object.entries(MESSAGES[language])) {
        if (value.includes('{') && !value.includes('{cluster}')) unfilled.push(`${language}.${key}`);
      }
    }
    expect(unfilled).toEqual([]);
  });
});
