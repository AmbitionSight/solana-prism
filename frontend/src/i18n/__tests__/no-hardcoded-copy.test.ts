import { describe, it, expect } from 'vitest';

/**
 * The failure mode of any translation is not a wrong word — it is a string
 * somebody forgot. Types cannot catch it (a hardcoded literal still compiles)
 * and a screenshot only covers what happens to be visible, so this scans the
 * source: after the i18n pass, components must contain no user-visible literal
 * text of their own.
 *
 * Modelled on the same idea as no-hardcoded-pixels.test.ts.
 */

const SOURCES = import.meta.glob(['../../components/*.tsx', '../../App.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * Literal text that is deliberately the same in both languages.
 *
 * `accounts:` / `signatures:` are field names from a real transaction — they are
 * English on Solscan too, so translating them would make the demo disagree with
 * the chain. `prism_vulnerable` is likewise an identifier, not copy: it is the
 * crate name the deployed program declares (`pub mod prism_vulnerable`), so it
 * reads the same in both languages and naming it any other way would put the
 * status bar out of step with the file below it. Everything else must come from
 * the catalogue.
 */
const ALLOWED_JSX_TEXT = new Set(['→', 'accounts:', 'signatures:', 'prism_vulnerable']);

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Characters that mean we are looking at code, not copy. TypeScript generics
 * (`useState<Step>(1)`) put a `>` and a later `<` around ordinary statements, so
 * without this the scanner reports whole expressions as if they were text.
 */
const LOOKS_LIKE_CODE = /[;=()[\]{}\n\r]/;

/** Literal text sitting between a `>` and a `<` — i.e. rendered JSX copy. */
function jsxTextNodes(source: string): string[] {
  const found: string[] = [];
  for (const match of stripComments(source).matchAll(/>([^<>{}]+)</g)) {
    const text = match[1].trim();
    if (text.length === 0) continue;
    if (LOOKS_LIKE_CODE.test(text)) continue;
    // Only care about things a reader would read as words.
    if (!/[A-Za-z\u4e00-\u9fff]/.test(text)) continue;
    found.push(text);
  }
  return found;
}

describe('i18n — 组件里不得残留硬编码文案', () => {
  it('确实读到了组件源码', () => {
    const files = Object.entries(SOURCES);
    expect(files.length).toBeGreaterThanOrEqual(11);
    const empty = files.filter(([, source]) => source.length === 0).map(([path]) => path);
    expect(empty).toEqual([]);
  });

  it('没有写死的 JSX 文本', () => {
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(SOURCES)) {
      for (const text of jsxTextNodes(source)) {
        if (!ALLOWED_JSX_TEXT.has(text)) offenders.push(`${path}: ${JSON.stringify(text)}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('没有写死的 aria-label', () => {
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(SOURCES)) {
      for (const match of stripComments(source).matchAll(/aria-label="([^"]*)"/g)) {
        offenders.push(`${path}: aria-label="${match[1]}"`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('i18n — 检测器自身的覆盖范围', () => {
  // A guard is only as good as its matcher; these are the shapes it must catch.
  it('能认出普通的 JSX 文本', () => {
    expect(jsxTextNodes('<h1 className="x">What is a contract?</h1>')).toEqual([
      'What is a contract?',
    ]);
  });

  it('能认出中文 JSX 文本', () => {
    expect(jsxTextNodes('<span>攻击成功</span>')).toEqual(['攻击成功']);
  });

  it('不把表达式或箭头函数当作文本', () => {
    expect(jsxTextNodes('<h1>{t.step1Title}</h1>')).toEqual([]);
    expect(jsxTextNodes('const f = () => { return 1; };')).toEqual([]);
  });

  it('不把 TS 泛型之间的代码当作文本', () => {
    // `useState<Step>(1)` puts a `>` and a later `<` around a real statement —
    // these were false positives before the code-character filter went in.
    const snippet = [
      "const [step, setStep] = useState<Step>(1);",
      "const [isFixed, setIsFixed] = useState<boolean>(false);",
      "const mode = step >= 4 ? 'stacked' : 'hidden';",
    ].join('\n');
    expect(jsxTextNodes(snippet)).toEqual([]);
  });
});
