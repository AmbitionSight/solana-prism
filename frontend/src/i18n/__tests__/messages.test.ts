import { describe, it, expect } from 'vitest';
import { MESSAGES, bilingualName, type MessageKey } from '../messages';

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
    expect(bilingualName('en', 'layerAccessControl')).toEqual({ primary: 'Access Control' });
  });

  it('中文模式给出中文主名 + 英文副名', () => {
    expect(bilingualName('zh', 'layerAccessControl')).toEqual({
      primary: '访问控制',
      secondary: 'Access Control',
    });
  });

  it('五个层名都有中英两份', () => {
    const keys = [
      'layerInstruction',
      'layerAccountState',
      'layerAccessControl',
      'layerBusinessLogic',
      'layerRuntime',
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
