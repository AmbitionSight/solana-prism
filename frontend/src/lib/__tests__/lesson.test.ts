import { describe, it, expect } from 'vitest';
import {
  LessonError,
  parseContractLines,
  parseLesson,
  parseLessonIndex,
} from '../lesson';
import { isDeployed } from '../../config/verification';
import { shippedIndex, shippedLesson } from '../../__tests__/shipped';

/**
 * The lesson is fetched as JSON, and JSON cannot be type-checked against the
 * message catalogue. These tests are the substitute the loader provides: a
 * malformed lesson is rejected with a `LessonError` the shell reports, rather
 * than rendering a blank sentence or a white page. They also pin the shipped
 * lesson's own values, which used to live in `config/verification.ts`.
 */

/** A small but valid lesson, so a single mutation can be shown to fail. */
const CONTRACT = ['//! demo', 'declare_id!("PROG");', 'pub fn withdraw() {}'].join('\n');

function validRaw(): Record<string, unknown> {
  return {
    id: 'demo',
    layers: [
      {
        id: 'S0',
        nameKey: 'stageSetup',
        sayKey: 'sayCall',
        code: 'x',
        isSecurityLayer: false,
        broken: false,
        scatter: { x: 0, y: 0 },
      },
    ],
    contract: {
      regions: [{ stageId: 'S0', from: 2, to: 2 }],
      excerpt: [{ from: 2, to: 2 }],
      marginNotes: [{ line: 1, key: 'noteTheBug', match: 'declare_id!' }],
    },
    verification: {
      vulnerableProgramId: 'PROG',
      fixedProgramId: 'FPROG',
      attackTxSignature: 'SIG',
      attackTxError: 'ERR',
      adminPubkey: 'ADMIN',
      vaultBefore: 1000,
      vaultAfter: 500,
    },
  };
}

describe('lesson loader — 合同文本切行', () => {
  it('末尾换行不产生一个多的空行', () => {
    expect(parseContractLines('a\nb\n')).toEqual(['a', 'b']);
  });

  it('CRLF 归一为 LF', () => {
    expect(parseContractLines('a\r\nb')).toEqual(['a', 'b']);
  });

  it('没有末尾换行时原样返回', () => {
    expect(parseContractLines('a\nb')).toEqual(['a', 'b']);
  });
});

describe('lesson loader — 拒绝格式有误的课', () => {
  it('合法的一份通过, 且字段就位', () => {
    const lesson = parseLesson(validRaw(), CONTRACT);
    expect(lesson.id).toBe('demo');
    expect(lesson.layers).toHaveLength(1);
    expect(lesson.contract.lines).toEqual(['//! demo', 'declare_id!("PROG");', 'pub fn withdraw() {}']);
  });

  it('sayKey 不是目录里的键 → 拒绝, 而不是渲染一句空话', () => {
    const raw = validRaw();
    (raw.layers as Record<string, unknown>[])[0].sayKey = 'noSuchKey';
    expect(() => parseLesson(raw, CONTRACT)).toThrow(LessonError);
  });

  it('nameKey 不是阶段名 → 拒绝', () => {
    const raw = validRaw();
    (raw.layers as Record<string, unknown>[])[0].nameKey = 'sayCall';
    expect(() => parseLesson(raw, CONTRACT)).toThrow(/nameKey/);
  });

  it('区域越过合同末尾 → 拒绝', () => {
    const raw = validRaw();
    (raw.contract as Record<string, unknown>).regions = [{ stageId: 'S0', from: 0, to: 99 }];
    expect(() => parseLesson(raw, CONTRACT)).toThrow(/outside/);
  });

  it('区域指向一个不存在的阶段 → 拒绝', () => {
    const raw = validRaw();
    (raw.contract as Record<string, unknown>).regions = [{ stageId: 'S9', from: 2, to: 2 }];
    expect(() => parseLesson(raw, CONTRACT)).toThrow(/names no layer/);
  });

  it('旁注与它那一行的内容不符 → 拒绝, 而不是标注错行', () => {
    const raw = validRaw();
    (raw.contract as Record<string, unknown>).marginNotes = [
      { line: 1, key: 'noteTheBug', match: 'not on this line' },
    ];
    expect(() => parseLesson(raw, CONTRACT)).toThrow(/not on line/);
  });

  it('阶段 id 重复 → 拒绝', () => {
    const raw = validRaw();
    const layer = (raw.layers as Record<string, unknown>[])[0];
    (raw.layers as Record<string, unknown>[]).push({ ...layer });
    expect(() => parseLesson(raw, CONTRACT)).toThrow(/duplicated/);
  });

  it('id 带斜杠 → 拒绝 (它同时是一个路径)', () => {
    const raw = validRaw();
    raw.id = '../secret';
    expect(() => parseLesson(raw, CONTRACT)).toThrow(/slug/);
  });

  it('verification 缺一个字段 → 拒绝', () => {
    const raw = validRaw();
    delete (raw.verification as Record<string, unknown>).adminPubkey;
    expect(() => parseLesson(raw, CONTRACT)).toThrow(/adminPubkey/);
  });

  it('合同里没有 declare_id! → 拒绝', () => {
    expect(() => parseLesson(validRaw(), '//! nothing here')).toThrow(/declare_id!/);
  });
});

describe('lesson index loader — 拒绝格式有误的列表', () => {
  it('合法的一份通过', () => {
    expect(parseLessonIndex([{ id: 'a', title: 'homeTitle', blurb: 'homeLede' }])).toHaveLength(1);
  });

  it('不是数组 → 拒绝', () => {
    expect(() => parseLessonIndex({})).toThrow(/array/);
  });

  it('title 不是目录键 → 拒绝', () => {
    expect(() => parseLessonIndex([{ id: 'a', title: 'nope', blurb: 'homeLede' }])).toThrow(
      /catalogue key/,
    );
  });
});

describe('lesson — 本仓库随课发布的数据就是链上那份', () => {
  const lesson = shippedLesson();

  it('列表里有一课, 且它的 id 出现在 index.json', () => {
    expect(shippedIndex().map((entry) => entry.id)).toContain(lesson.id);
  });

  it('两把 program id 就是构建产出的那两把', () => {
    expect(lesson.verification.vulnerableProgramId).toBe(
      '7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2',
    );
    expect(lesson.verification.fixedProgramId).toBe(
      '9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq',
    );
  });

  it('ADMIN 公钥是建池时真正写进每个 vault 的那一个', () => {
    expect(lesson.verification.adminPubkey).toBe('DMkwnXZ6Gy7X8fkzSyBCdCuk3E2CFrwCmhV9A44qGU7T');
  });

  it('金库余额是漏洞版攻击搬动的两个数', () => {
    expect(lesson.verification.vaultBefore).toBe(1000);
    expect(lesson.verification.vaultAfter).toBe(500);
  });

  it('本仓库此刻已部署: program id、真实签名与拒绝错误都在', () => {
    expect(isDeployed(lesson.verification)).toBe(true);
    expect(lesson.verification.attackTxSignature.length).toBeGreaterThan(0);
    expect(lesson.verification.attackTxError.length).toBeGreaterThan(0);
  });

  it('六个阶段, 且声明阶段带缺陷', () => {
    expect(lesson.layers).toHaveLength(6);
    const security = lesson.layers.find((layer) => layer.isSecurityLayer && layer.broken);
    expect(security?.id).toBe('S3');
  });
});
