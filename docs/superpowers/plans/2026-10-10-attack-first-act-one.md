# 先攻破，再揭晓 —— 第一幕 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把「观看的演示」改成「先下注、再被自己的答案打脸」的审计练习，且开场与交易卡片全部锚定在真实部署上。

**Architecture:** 代码显示从「手写节选」换成「链上那份的逐字全文」，加中文旁注栏；交易卡片在无钱包时也读链拿真实地址；新增「攻击计划」步骤（两个问题），执行后复用现有拆解/层叠/穿透动画作为**揭晓**，并把观众的答案与真实交易并列。

**Tech Stack:** Vite 6 · React 18 · TypeScript 5.8 · Vitest 3.2 · `@solana/web3.js` · 纯 CSS。禁用：动画库、UI 库、语法高亮库、状态管理库。

**规格：** `docs/superpowers/specs/2026-10-10-attack-first-redesign-design.md`

**范围：** 仅第一幕（§4–§6）。第二幕（§7）明确推迟，本计划不涉及。

---

## 文件结构

**新建**

| 文件 | 职责 |
|---|---|
| `frontend/src/lib/contractSource.ts` | 链上合约的逐字全文、阶段区域行号、中文旁注行号。**唯一的显示真相** |
| `frontend/src/lib/__tests__/contractSource.test.ts` | 守着全文与 `contract/` 逐字节一致 |
| `frontend/src/lib/demoTarget.ts` | 无钱包时的真实目标（池中下一个新鲜 vault），含离线回退 |
| `frontend/src/lib/__tests__/demoTarget.test.ts` | 回退行为、地址来自真实推导 |
| `frontend/src/components/AttackPlan.tsx` | 两个问题 + 执行按钮（受控） |
| `frontend/src/components/__tests__/attackPlan.test.tsx` | 禁用条件、选中态、中英文案 |
| `frontend/src/components/TxCardTable.tsx` | 账号/签名表格。`TxCard` 与 `Reveal` **共用**，不复制 markup |
| `frontend/src/components/Reveal.tsx` | 揭晓：摊开真实交易 + 对照观众答案 |

**修改**

| 文件 | 改动 |
|---|---|
| `frontend/src/lib/code.ts` | 不再持有代码文本，只保留区域切分逻辑，改读 `contractSource.ts` |
| `frontend/src/components/Step2Code.tsx` | 渲染真实全文 + 状态栏 + 旁注栏 |
| `frontend/src/components/TxCard.tsx` | 无 payload 时也用真实地址（来自 `demoTarget`） |
| `frontend/src/lib/steps.ts` | 步骤序列改为 `intro → contract → plan → reveal → evidence`；`attackOutcome` 改由攻击计划推导 |
| `frontend/src/App.tsx` | 接线：攻击计划状态、执行分发、揭晓 |
| `frontend/src/i18n/messages.ts` | 新增旁注、计划问题、揭晓对照的文案键（中英各一份） |
| `frontend/src/components/FixToggle.tsx` | **删除**（规格 §5.4） |

**删除**

- `frontend/src/components/FixToggle.tsx`
- （已核：`components/__tests__/` 下**没有** `fixToggle.test.tsx`；它的行为是在 `devnetRun.test.tsx` 与 `app-default-path.test.tsx` 里被间接覆盖的，那两处需要相应调整）

---

## Phase A — 真实化（开场与交易卡片）

> 这一 Phase 结束时，演示**看到的一切**都指向真实部署：合约是链上那份、交易卡片是池里的真 vault。动画逻辑一行未动，所以风险低、可独立验收。

### Task A1: 合约全文成为单一真相

**Files:**
- Create: `frontend/src/lib/contractSource.ts`
- Test: `frontend/src/lib/__tests__/contractSource.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// frontend/src/lib/__tests__/contractSource.test.ts
import { describe, it, expect } from 'vitest';
import { CONTRACT_LINES } from '../contractSource';

/**
 * The listing is the deployed contract, not a paraphrase of it. The copy in
 * public/source is already guarded byte-for-byte against contract/ by
 * source-assets.test.ts, so pinning the listing to *it* puts the displayed text
 * on the same chain of custody as the file the closing note links to.
 */
const SOURCES = import.meta.glob('/public/source/prism_vulnerable.rs.txt', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

describe('contractSource — 显示的就是链上那份', () => {
  it('真的读到了对照文件', () => {
    const files = Object.values(SOURCES);
    expect(files.length).toBe(1);
    expect(files[0].length).toBeGreaterThan(500);
  });

  it('逐行等于 public/source 里那份', () => {
    const original = Object.values(SOURCES)[0].replace(/\r\n/g, '\n').split('\n');
    // The file ends with a trailing newline, which split() turns into a final
    // empty string; the listing does not carry it.
    if (original[original.length - 1] === '') original.pop();
    expect(CONTRACT_LINES).toEqual(original);
  });
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `cd frontend && npx vitest run src/lib/__tests__/contractSource.test.ts`
Expected: FAIL — `Failed to resolve import "../contractSource"`

- [ ] **Step 3: 建文件，内容逐字誊自 `contract/programs/prism_vulnerable/src/lib.rs`**

```ts
// frontend/src/lib/contractSource.ts
/**
 * contractSource.ts — the deployed contract, verbatim.
 *
 * Not a paraphrase and not a excerpt: this is the file `anchor build` compiled
 * and `solana program deploy` put on testnet. `contractSource.test.ts` pins it
 * line for line to `public/source/prism_vulnerable.rs.txt`, which is itself
 * guarded byte-for-byte against `contract/` — so the text on screen and the
 * text the closing note links to cannot drift apart from what was deployed.
 *
 * Because it is verbatim, its comments are English: they are the file's own.
 * Chinese explanation lives in MARGIN_NOTES, beside the code rather than inside
 * it, so that "this is the real file" and "a Chinese reader can follow it" are
 * both true.
 */

/** The file, line for line, with no trailing newline entry. */
export const CONTRACT_LINES: string[] = [
  '//! prism_vulnerable — the build the demo attacks.',
  '//!',
  "//! The `Withdraw` accounts struct declares `authority` as `AccountInfo<'info>`,",
  '//! which asks the runtime for nothing at all. The handler then checks the',
  "//! *address* by hand with `require!`, so anyone who knows the admin's address can",
  '//! hand it over and sign the transaction themselves.',
  '//!',
  '//! This is the whole bug, and it is one line: the declaration at stage 3, not',
  '//! the `require!` further down. Compare with programs/prism_fixed/src/lib.rs,',
  '//! which differs only in that declaration.',
  '',
  'use anchor_lang::prelude::*;',
  '',
  '// The real address, written by `anchor keys sync` from',
  "// target/deploy/prism_vulnerable-keypair.json. Anchor derives `#[account]`'s",
  '// Owner from this, so it has to match the keypair the program is built with.',
  'declare_id!("7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2");',
  '',
  '#[program]',
  'pub mod prism_vulnerable {',
  '    use super::*;',
  '',
  '    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {',
  '        let vault = &mut ctx.accounts.vault;',
  '        vault.authority = ctx.accounts.authority.key();',
  '        vault.balance = 1000;',
  '        Ok(())',
  '    }',
  '',
  '    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {',
  '        let vault = &mut ctx.accounts.vault;',
  '        // The address matches, so this passes — nobody ever checked who signed.',
  '        require!(',
  '            vault.authority == ctx.accounts.authority.key(),',
  '            ErrorCode::RequireViolated',
  '        );',
  '        vault.balance -= amount;',
  '        Ok(())',
  '    }',
  '}',
  '',
  '#[derive(Accounts)]',
  "pub struct Initialize<'info> {",
  '    #[account(init, payer = authority, space = 8 + 32 + 8)]',
  "    pub vault: Account<'info, Vault>,",
  '    #[account(mut)]',
  "    pub authority: Signer<'info>,",
  "    pub system_program: Program<'info, System>,",
  '}',
  '',
  '/// The listing shown in step 2 of the demo is this struct verbatim.',
  '#[derive(Accounts)]',
  "pub struct Withdraw<'info> {",
  '    #[account(mut)]',
  "    pub vault: Account<'info, Vault>,",
  '    /// CHECK: address only — no signature required. This is the bug.',
  "    pub authority: AccountInfo<'info>,",
  '}',
  '',
  '#[account]',
  'pub struct Vault {',
  '    pub authority: Pubkey,',
  '    pub balance: u64,',
  '}',
];
```

- [ ] **Step 4: 跑测试确认它通过**

Run: `cd frontend && npx vitest run src/lib/__tests__/contractSource.test.ts`
Expected: PASS（2 项）

> **若失败**：说明誊写有出入。用 `diff` 逐行核对，**不要**为了让测试变绿而改测试 —— 这份清单的整个价值就在于它是真的。

- [ ] **Step 5: 提交**

```bash
git add frontend/src/lib/contractSource.ts frontend/src/lib/__tests__/contractSource.test.ts
git commit -m "feat(contract): the displayed listing is the deployed file, guarded"
```

---

### Task A2: 阶段区域按真实行号重映射

**Files:**
- Modify: `frontend/src/lib/contractSource.ts`
- Test: `frontend/src/lib/__tests__/contractSource.test.ts`

- [ ] **Step 1: 追加失败的测试**

```ts
// 追加到 contractSource.test.ts
import { CONTRACT_LINES, CONTRACT_REGIONS } from '../contractSource';

describe('contractSource — 阶段区域落在正确的行上', () => {
  const textOf = (from: number, to: number) => CONTRACT_LINES.slice(from, to + 1).join('\n');

  it('五个区域，按源码顺序排列', () => {
    expect(CONTRACT_REGIONS.map((r) => r.stageId)).toEqual(['S2', 'S3', 'S1', 'S4', 'S5']);
  });

  it('每个区域框住的确实是那一阶段的代码', () => {
    const byId = Object.fromEntries(CONTRACT_REGIONS.map((r) => [r.stageId, r]));
    expect(textOf(byId.S1.from, byId.S1.to)).toContain('pub fn withdraw(ctx: Context<Withdraw>');
    expect(textOf(byId.S2.from, byId.S2.to)).toContain("pub struct Withdraw<'info> {");
    expect(textOf(byId.S2.from, byId.S2.to)).toContain("pub vault: Account<'info, Vault>,");
    expect(textOf(byId.S3.from, byId.S3.to)).toContain("pub authority: AccountInfo<'info>,");
    expect(textOf(byId.S4.from, byId.S4.to)).toContain('require!(');
    expect(textOf(byId.S5.from, byId.S5.to)).toContain('vault.balance -= amount;');
  });

  it('区域之间不重叠，且都在文件范围内', () => {
    const spans = [...CONTRACT_REGIONS].sort((a, b) => a.from - b.from);
    for (let i = 1; i < spans.length; i += 1) {
      expect(spans[i].from).toBeGreaterThan(spans[i - 1].to);
    }
    for (const region of CONTRACT_REGIONS) {
      expect(region.from).toBeGreaterThanOrEqual(0);
      expect(region.to).toBeLessThan(CONTRACT_LINES.length);
    }
  });
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `cd frontend && npx vitest run src/lib/__tests__/contractSource.test.ts`
Expected: FAIL — `CONTRACT_REGIONS` is not exported

- [ ] **Step 3: 追加实现**

```ts
// 追加到 contractSource.ts
/**
 * Which lines become which stage, in SOURCE order — the boxes sweep down the
 * listing the way you read it, and the stage numbers on the labels are what
 * shows the reordering (2, 3, 1, 4, 5).
 *
 * Indices are into CONTRACT_LINES and were taken from the real file, not
 * adjusted to fit: the previous listing was an excerpt, so every one of these
 * numbers moved when the excerpt became the whole file.
 */
export const CONTRACT_REGIONS: { stageId: string; from: number; to: number }[] = [
  { stageId: 'S2', from: 51, to: 54 },
  { stageId: 'S3', from: 55, to: 56 },
  { stageId: 'S1', from: 29, to: 29 },
  { stageId: 'S4', from: 31, to: 35 },
  { stageId: 'S5', from: 36, to: 36 },
];
```

- [ ] **Step 4: 跑测试确认它通过**

Run: `cd frontend && npx vitest run src/lib/__tests__/contractSource.test.ts`
Expected: PASS（5 项）

- [ ] **Step 5: 提交**

```bash
git add frontend/src/lib/contractSource.ts frontend/src/lib/__tests__/contractSource.test.ts
git commit -m "feat(contract): remap the stage regions onto the real file's lines"
```

---

### Task A3: 中文旁注

**Files:**
- Modify: `frontend/src/lib/contractSource.ts`, `frontend/src/i18n/messages.ts`
- Test: `frontend/src/lib/__tests__/contractSource.test.ts`, `frontend/src/i18n/__tests__/messages.test.ts`

- [ ] **Step 1: 在 `messages.ts` 的 `Messages` 接口里加键**

```ts
  /* Step 2 — margin notes beside the real listing. The listing itself is
     verbatim and therefore English; these carry the Chinese. */
  noteDeclareId: string;
  noteStructNotSigner: string;
  noteHandlerRequires: string;
  noteTheBug: string;
  noteStateChange: string;
```

英文侧：

```ts
    noteDeclareId: 'The address this build was compiled with — the one on chain.',
    noteStructNotSigner: "The account list. `authority` is declared here.",
    noteHandlerRequires: 'The handler. It runs only after the runtime is satisfied.',
    noteTheBug:
      "`AccountInfo` asks the runtime for nothing — not even a signature. " +
      'This line is the whole bug.',
    noteStateChange: 'Where the damage lands: a u64 inside the vault account.',
```

中文侧：

```ts
    noteDeclareId: '这个构建编译进去的地址 —— 链上跑的就是它。',
    noteStructNotSigner: '账户清单。`authority` 在这一段被声明。',
    noteHandlerRequires: '处理函数。它只在运行时满意之后才会执行。',
    noteTheBug:
      '`AccountInfo` 向运行时什么都没要 —— 连签名都没要。' + '这一行就是全部的漏洞。',
    noteStateChange: '伤害落点：vault 账户里的一个 u64。',
```

- [ ] **Step 2: 跑 i18n 测试确认它失败**

Run: `cd frontend && npx vitest run src/i18n/__tests__/messages.test.ts`
Expected: FAIL — 键集不一致（`zh` 缺键）或英文侧缺键。**先只加英文侧**，看它红，再加中文侧 —— 这样能确认这条守卫真的在守。

- [ ] **Step 3: 在 `contractSource.ts` 加旁注结构**

```ts
import type { MessageKey } from '../i18n/messages';

/**
 * Chinese explanation, keyed to a line of the listing.
 *
 * Beside the code rather than inside it: the listing has to stay byte-identical
 * to the deployed file, and a Chinese comment inside it would end that the
 * moment the file was rebuilt.
 */
export const MARGIN_NOTES: { line: number; key: MessageKey }[] = [
  { line: 16, key: 'noteDeclareId' },
  { line: 51, key: 'noteStructNotSigner' },
  { line: 29, key: 'noteHandlerRequires' },
  { line: 56, key: 'noteTheBug' },
  { line: 36, key: 'noteStateChange' },
];
```

- [ ] **Step 4: 加守卫 —— 每条旁注都指向真实存在的一行**

```ts
// 追加到 contractSource.test.ts
import { MARGIN_NOTES } from '../contractSource';
import { MESSAGES } from '../../i18n/messages';

describe('contractSource — 中文旁注', () => {
  it('每条旁注都指向文件里真实存在的一行', () => {
    for (const note of MARGIN_NOTES) {
      expect(note.line, `line ${note.line} 越界`).toBeLessThan(CONTRACT_LINES.length);
      expect(CONTRACT_LINES[note.line].trim().length, `line ${note.line} 是空行`).toBeGreaterThan(0);
    }
  });

  it('行号不重复', () => {
    const lines = MARGIN_NOTES.map((n) => n.line);
    expect(new Set(lines).size).toBe(lines.length);
  });

  it('每条旁注两种语言都有内容', () => {
    for (const note of MARGIN_NOTES) {
      expect(MESSAGES.en[note.key].trim().length).toBeGreaterThan(0);
      expect(MESSAGES.zh[note.key].trim().length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd frontend && npx vitest run src/i18n/__tests__/messages.test.ts src/lib/__tests__/contractSource.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add frontend/src/lib/contractSource.ts frontend/src/lib/__tests__/contractSource.test.ts frontend/src/i18n/messages.ts
git commit -m "feat(i18n): the Chinese explanation moves beside the code, not inside it"
```

---

### Task A4: `Step2Code` 渲染真实全文 + 状态栏

**Files:**
- Modify: `frontend/src/lib/code.ts`, `frontend/src/components/Step2Code.tsx`, `frontend/src/styles/app.css`
- Modify: `frontend/src/lib/__tests__/code.test.ts`

- [ ] **Step 1: 改 `lib/code.ts` —— 它不再持有代码文本**

`CODE_LINES` 与 `codeLines()` 删除；`codeBlocks` 改从 `CONTRACT_LINES` 切，保留 `CodeBlock` 形状：

```ts
import { CONTRACT_LINES, CONTRACT_REGIONS } from './contractSource';

/** The listing split into boxed stage regions and the plain runs between them. */
export function codeBlocks(): CodeBlock[] {
  const lines = CONTRACT_LINES;
  const blocks: CodeBlock[] = [];
  let cursor = 0;

  CONTRACT_REGIONS.forEach((region, index) => {
    if (region.from > cursor) {
      blocks.push({ stageId: null, from: cursor, lines: lines.slice(cursor, region.from) });
    }
    blocks.push({
      stageId: region.stageId,
      from: region.from,
      lines: lines.slice(region.from, region.to + 1),
      revealAt: REVEAL_START + index * REVEAL_STEP,
    });
    cursor = region.to + 1;
  });

  if (cursor < lines.length) {
    blocks.push({ stageId: null, from: cursor, lines: lines.slice(cursor) });
  }

  return blocks;
}
```

- [ ] **Step 2: 更新 `code.test.ts`**

删掉所有断言「两种语言的代码行一致」的用例（代码行不再有语言之分）。保留并补上：

```ts
it('区块拼起来就是整份文件，一行不漏', () => {
  const blocks = codeBlocks();
  expect(blocks.flatMap((b) => b.lines)).toEqual(CONTRACT_LINES);
});

it('五个阶段各有一个区块，按源码顺序', () => {
  const mapped = codeBlocks().filter((b) => b.stageId);
  expect(mapped.map((b) => b.stageId)).toEqual(['S2', 'S3', 'S1', 'S4', 'S5']);
});
```

- [ ] **Step 3: 跑测试**

Run: `cd frontend && npx vitest run src/lib/__tests__/code.test.ts`
Expected: PASS

- [ ] **Step 4: 改 `Step2Code.tsx` —— 去掉 language 依赖，加状态栏与旁注栏**

```tsx
import { useLayoutEffect, type CSSProperties } from 'react';
import { AUTO_ADVANCE_MS } from '../lib/steps';
import { useLanguage } from '../i18n/language';
import { bilingualName } from '../i18n/messages';
import { highlightRust } from '../lib/highlight';
import { codeBlocks } from '../lib/code';
import { MARGIN_NOTES } from '../lib/contractSource';
import { VAULT_LAYERS } from '../config/layers';
import { VERIFICATION } from '../config/verification';

const LINE_STAGGER_MS = 60;

export default function Step2Code({ onRegionRects }: Step2CodeProps) {
  const { language, t } = useLanguage();
  const blocks = codeBlocks();
  const duration = AUTO_ADVANCE_MS[2] ?? 0;
  const notesByLine = new Map(MARGIN_NOTES.map((n) => [n.line, n.key]));

  useLayoutEffect(() => {
    if (!onRegionRects) return;
    const rects: Record<string, DOMRect> = {};
    for (const element of document.querySelectorAll<HTMLElement>('.code-block--mapped')) {
      const id = element.dataset.stage;
      if (id) rects[id] = element.getBoundingClientRect();
    }
    onRegionRects(rects);
  });

  const style = { '--step-duration': `${duration}ms` } as CSSProperties;

  return (
    <section className="step2" style={style} data-testid="step2-code">
      <header className="contract-status" data-testid="contract-status">
        <span className="contract-status__name">prism_vulnerable</span>
        <code className="contract-status__id">{VERIFICATION.vulnerableProgramId}</code>
        <span className="contract-status__live">{t.contractLive}</span>
      </header>

      <pre className="code-card">
        <code>
          {blocks.map((block) => {
            const stage = block.stageId
              ? VAULT_LAYERS.find((layer) => layer.id === block.stageId)
              : undefined;
            const name = stage ? bilingualName(language, stage.nameKey) : undefined;
            const blockStyle = { '--reveal-at': block.revealAt ?? 0 } as CSSProperties;

            return (
              <span
                className={`code-block${stage ? ' code-block--mapped' : ''}`}
                key={block.from}
                data-stage={block.stageId ?? undefined}
                style={blockStyle}
              >
                {block.lines.map((line, offset) => {
                  const index = block.from + offset;
                  const noteKey = notesByLine.get(index);
                  return (
                    <span
                      className="code-card__line"
                      key={index}
                      style={{ animationDelay: `${index * LINE_STAGGER_MS}ms` }}
                    >
                      {highlightRust(line).map((token, tokenIndex) => (
                        <span className={`tok tok--${token.kind}`} key={tokenIndex}>
                          {token.text}
                        </span>
                      ))}
                      {noteKey && (
                        <span className="code-card__note" data-testid={`code-note-${index}`}>
                          {t[noteKey]}
                        </span>
                      )}
                    </span>
                  );
                })}

                {stage && name && (
                  <span className="code-block__label" data-testid={`code-label-${stage.id}`}>
                    <span className="code-block__id">{stage.id}</span>
                    <span className="code-block__name">
                      {name.primary}
                      {name.secondary && (
                        <span className="code-block__name-latin"> {name.secondary}</span>
                      )}
                    </span>
                  </span>
                )}
              </span>
            );
          })}
        </code>
      </pre>
    </section>
  );
}
```

- [ ] **Step 5: 加 `contractLive` 文案键**

```ts
// messages.ts 接口
  contractLive: string;
// en
    contractLive: 'running on testnet',
// zh
    contractLive: '正在 testnet 上运行',
```

用 Task A3 建立的 `{cluster}` 模板机制？**不** —— 这一处直接复用 `formatCluster`：

```ts
// en
    contractLive: 'running on {cluster}',
// zh
    contractLive: '正在 {cluster} 上运行',
```

并在 `Step2Code.tsx` 用 `formatCluster(t.contractLive)`。

- [ ] **Step 6: 加 CSS（`app.css`）**

```css
/* The status bar above the listing. It is the first thing that says the code
   below is not a mock-up. */
.contract-status {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin: 0 0 12px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-muted);
}
.contract-status__name { font-weight: 600; color: var(--color-text); }
.contract-status__live::before { content: '● '; color: #1a7f37; }

/* Margin notes: beside the line, never inside it. The listing is verbatim. */
.code-card__note {
  display: block;
  margin-left: 24px;
  color: var(--color-text-muted);
  font-style: italic;
  opacity: 0.85;
}
.code-card__note::before { content: '↳ '; }
```

> **注意**：`--color-text-muted` 若在 `global.css` 的令牌里不存在，改用已有的令牌名。**不允许**在这里写死颜色字面量 —— 仓库有守卫禁止手写像素/颜色散落。

- [ ] **Step 7: 跑全量测试与构建**

Run: `cd frontend && npm test && npm run build`
Expected: 全绿；构建通过。若有测试断言旧的 `step2` 结构或 `codeBlocks(language)` 调用，一并更新它们。

- [ ] **Step 8: 提交**

```bash
git add frontend/src/lib/code.ts frontend/src/components/Step2Code.tsx frontend/src/styles/app.css frontend/src/i18n/messages.ts frontend/src/lib/__tests__/code.test.ts
git commit -m "feat(step2): show the deployed contract verbatim, with a status bar and margin notes"
```

---

### Task A5: 无钱包也拿到真实目标

**Files:**
- Create: `frontend/src/lib/demoTarget.ts`
- Test: `frontend/src/lib/__tests__/demoTarget.test.ts`

- [ ] **Step 1: 写失败的测试**

```ts
// frontend/src/lib/__tests__/demoTarget.test.ts
import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import { resolveDemoTarget, FALLBACK_VAULT_INDEX } from '../demoTarget';
import { POOL_SIZE, VAULT_DISCRIMINATOR, VAULT_SPACE, vaultAddress } from '../devnet';
import { VERIFICATION } from '../../config/verification';

describe('demoTarget — 没有钱包时的真实目标', () => {
  it('读不到链时回退到池里一个真实地址，而不是占位符', async () => {
    const target = await resolveDemoTarget(null);
    expect(target.vault).toBe(vaultAddress(FALLBACK_VAULT_INDEX).toBase58());
    // The fallback is a real address in the pool, derived exactly as the pool
    // script derived it — it can go stale, but it is never fake.
    expect(target.vault).not.toContain('…');
  });

  it('永远使用配置里的真实 program id 与管理员地址', async () => {
    const target = await resolveDemoTarget(null);
    expect(target.programId).toBe(VERIFICATION.vulnerableProgramId);
    expect(target.authority).toBe(VERIFICATION.adminPubkey);
  });

  it('读链成功时命名的是下一个新鲜 vault', async () => {
    const admin = VERIFICATION.adminPubkey;
    const account = (balance: number) => {
      const data = new Uint8Array(VAULT_SPACE);
      data.set(VAULT_DISCRIMINATOR, 0);
      data.set(new PublicKey(admin).toBytes(), 8);
      new DataView(data.buffer).setBigUint64(40, BigInt(balance), true);
      return data;
    };
    const read = async (address: PublicKey) => {
      const index = [...Array(POOL_SIZE).keys()].find((i) => vaultAddress(i).equals(address));
      if (index === undefined) return null;
      return account(index === 0 ? 500 : 1000); // index 0 已被之前的访客打掉
    };
    const target = await resolveDemoTarget(read);
    expect(target.vault).toBe(vaultAddress(1).toBase58());
  });
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `cd frontend && npx vitest run src/lib/__tests__/demoTarget.test.ts`
Expected: FAIL — 模块不存在

- [ ] **Step 3: 写实现**

```ts
// frontend/src/lib/demoTarget.ts
/**
 * demoTarget.ts — what the animated path shows without a wallet.
 *
 * The card used to name `7xKm…9mPQ` and `ADMiN…x7wQ`: a transaction that does
 * not exist, illustrating the demo's one genuinely load-bearing sentence. Now
 * the animated path names the same things a real run would — the deployed
 * program, the real ADMIN address, and an address that really is in the pool.
 *
 * The vault address is derived locally (`vaultAddress`), so it needs no network
 * to be real. Only *which* index is still fresh needs the chain, and that is the
 * one thing that degrades gracefully: with no reader we name index 0, which is
 * a real pool vault even if a previous visitor has already drained it.
 */

import { vaultAddress, nextFreshVault, type VaultReader } from './devnet';
import { VERIFICATION } from '../config/verification';

/** Which pool vault the animated path names when the chain cannot be read. */
export const FALLBACK_VAULT_INDEX = 0;

export interface DemoTarget {
  programId: string;
  vault: string;
  authority: string;
}

export async function resolveDemoTarget(read: VaultReader | null): Promise<DemoTarget> {
  const authority = VERIFICATION.adminPubkey;
  const base = {
    programId: VERIFICATION.vulnerableProgramId,
    authority,
  };

  if (!read || !isFilled(authority)) {
    return { ...base, vault: vaultAddress(FALLBACK_VAULT_INDEX).toBase58() };
  }

  try {
    const index = await nextFreshVault(read, new PublicKey(authority), VERIFICATION.poolSize);
    return { ...base, vault: vaultAddress(index ?? FALLBACK_VAULT_INDEX).toBase58() };
  } catch {
    // An unreachable RPC is the ordinary case, not an error worth surfacing:
    // the fallback address is real, and the card's job is to name real things.
    return { ...base, vault: vaultAddress(FALLBACK_VAULT_INDEX).toBase58() };
  }
}
```

补齐 imports：

```ts
import { PublicKey } from '@solana/web3.js';
import { isFilled } from '../config/verification';
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd frontend && npx vitest run src/lib/__tests__/demoTarget.test.ts`
Expected: PASS（3 项）

- [ ] **Step 5: 提交**

```bash
git add frontend/src/lib/demoTarget.ts frontend/src/lib/__tests__/demoTarget.test.ts
git commit -m "feat: the animated card names a real vault, not a placeholder"
```

---

### Task A6: 交易卡片用真实地址

**Files:**
- Modify: `frontend/src/App.tsx`, `frontend/src/components/TxCard.tsx`
- Test: `frontend/src/components/__tests__/txCard.test.tsx`

- [ ] **Step 1: 在 `App.tsx` 里接上 `resolveDemoTarget`**

在组件内加状态与 effect：

```tsx
import { resolveDemoTarget, type DemoTarget } from './lib/demoTarget';
import { createVaultReader } from './lib/solanaChain';

/**
 * The target the animated path names. Read once, when the page opens, so that
 * what step 5 shows is a real account rather than a placeholder — with no
 * wallet involved, because reading a chain has never needed one.
 */
const [demoTargetState, setDemoTargetState] = useState<DemoTarget | null>(null);

useEffect(() => {
  let cancelled = false;
  const connection = new Connection(VERIFICATION.rpcEndpoint, 'confirmed');
  resolveDemoTarget(createVaultReader(connection)).then((target) => {
    if (!cancelled) setDemoTargetState(target);
  });
  return () => {
    cancelled = true;
  };
}, []);
```

- [ ] **Step 2: 传给 `TxCard`**

```tsx
{attackState === 'showing-tx' && (
  <TxCard payload={payload ?? undefined} demoTarget={demoTargetState ?? undefined} />
)}
```

- [ ] **Step 3: `TxCard` 接受 `demoTarget`，并**彻底删掉假占位符**

```tsx
export default function TxCard({
  payload,
  demoTarget,
}: {
  payload?: TxPayload;
  demoTarget?: DemoTarget;
}) {
```

```tsx
/**
 * The account rows. Three sources, in order of how much they know:
 *
 * - `payload` — a real run in flight, with this run's own accounts.
 * - `demoTarget` — no wallet, but the chain was read: the pool's next fresh
 *   vault, the deployed program, the real ADMIN address.
 * - neither — a page that has not resolved the target yet, or an unreachable
 *   RPC. Even here the values are derived locally (`vaultAddress`, the config's
 *   program id and admin), so there is no state in which this card names an
 *   address that does not exist. The old `7xKm…9mPQ` / `ADMiN…x7wQ` are gone
 *   for good: an illustration of the demo's one load-bearing sentence must not
 *   itself be an illustration.
 */
function accountsFor(payload?: TxPayload, demoTarget?: DemoTarget): AccountRow[] {
  const source = payload ?? demoTarget ?? localTarget();
  return [
    { field: 'vault', value: elide(source.vault), noteKey: 'txNoteAttackerOwned' },
    {
      field: 'authority',
      value: elide(source.authority),
      noteKey: 'txNoteAdminPresent',
      emphasis: true,
    },
  ];
}

/** Derived without a network: the config's ids and a deterministic pool address. */
function localTarget(): DemoTarget {
  return {
    programId: VERIFICATION.vulnerableProgramId,
    authority: VERIFICATION.adminPubkey,
    vault: vaultAddress(FALLBACK_VAULT_INDEX).toBase58(),
  };
}
```

`ANIMATED_ACCOUNTS` 与 `ANIMATED_SIGNATURES` 两个常量**删除**。签名行保留现有形状：无 `payload` 时 `ATTACKER` 一行不带地址（动画路径里确实没有真实签名者，**这是诚实的**），`ADMIN` 一行的 ✗ 不变。

- [ ] **Step 4: 更新被钉住的旧断言**

`txCard.test.tsx:27-28` 现在断言基线里**含有**那两串假地址 —— 它们的存在是被测试钉住的。改掉：

```tsx
  it('默认渲染里没有任何编造的地址', () => {
    const html = render(<TxCard />);
    expect(html).not.toContain('…9mPQ');
    expect(html).not.toContain('ADMiN');
    expect(html).toContain(elide(VERIFICATION.adminPubkey)); // 真实的管理员地址
  });

  it('有真实目标时用的是那一份地址', () => {
    const html = render(
      <TxCard
        demoTarget={{
          programId: VERIFICATION.vulnerableProgramId,
          vault: vaultAddress(1).toBase58(),
          authority: VERIFICATION.adminPubkey,
        }}
      />,
    );
    expect(html).toContain(elide(vaultAddress(1).toBase58()));
  });
```

- [ ] **Step 5: 有意识地重建基线 fixture**

`render(<TxCard />)` 的默认输出**这次是真的变了**（这正是本任务的目的），所以 `components/__tests__/fixtures/default-renders.json` 里的 `txCard` 必须重建。**只重建这一个键**，`attackResultVulnerable` / `attackResultFixed` / `verifyPanel` 一个都不许动 —— 动了就说明你改到了不该改的地方。

```bash
cd frontend
node -e "
const { execSync } = require('child_process');
" # 见下方说明
```

实际做法：临时写一个 `surrogate.test.tsx` 打印 `render(<TxCard />)`，把它粘进 fixture 的 `txCard` 键，然后删掉临时文件。**不要**重新生成整个 fixture 文件。

在该键旁边加一行说明：

```jsonc
// txCard was re-captured on 2026-10-10, deliberately: the card no longer shows
// placeholder addresses. The other three are unchanged from before the feature.
```

> JSON 不支持注释。把这句话放进 `harness.tsx` 里 `baselines()` 的文档注释中，不要放进 `.json`。

- [ ] **Step 6: 跑测试与构建**

Run: `cd frontend && npm test && npm run build`
Expected: 全绿。**若 `attackResult*` 或 `verifyPanel` 的基线断言变红，说明改动溢出到了不该碰的地方 —— 回去查，不要重建它们的基线。**

- [ ] **Step 7: 提交**

```bash
git add frontend/src/App.tsx frontend/src/components/TxCard.tsx frontend/src/components/__tests__/txCard.test.tsx frontend/src/components/__tests__/fixtures/default-renders.json frontend/src/components/__tests__/harness.tsx
git commit -m "feat(txcard): real addresses even without a wallet"
```

---

### ✅ CHECKPOINT A

- [ ] `npm test` 全绿
- [ ] `npm run build` 通过
- [ ] `tools/shoot.mjs` 无钱包状态全绿（**实测**，不假设）—— 若因读链变慢/抖动，确认回退路径确实生效
- [ ] 人眼：开场显示状态栏 + 真实全文 + 中文旁注；第 5 步卡片显示真实地址
- [ ] 人眼：阶段框仍落在正确的行上（2、3、1、4、5 的扫过顺序不变）

---

## Phase B — 攻击计划与揭晓

> 这一 Phase 结束时，观众**先下注、再被自己的答案打脸**。动画从「教材」变成「答案」。

### Task B1: 步骤机改造

**Files:**
- Modify: `frontend/src/lib/steps.ts`
- Test: `frontend/src/lib/__tests__/steps.test.ts`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: 写失败的测试**

```ts
it('新序列：intro → contract → plan → reveal → evidence', () => {
  expect(nextStep('intro')).toBe('contract');
  expect(nextStep('contract')).toBe('plan');
  expect(nextStep('plan')).toBeNull();   // 等观众作答
  expect(nextStep('reveal')).toBe('evidence');
  expect(nextStep('evidence')).toBeNull();
});

it('只有 intro 与 contract 自动推进', () => {
  expect(AUTO_ADVANCE_MS.intro).toBe(3000);
  expect(AUTO_ADVANCE_MS.contract).toBe(9000);
  expect(AUTO_ADVANCE_MS.plan).toBeUndefined();
  expect(AUTO_ADVANCE_MS.reveal).toBeUndefined();
  expect(AUTO_ADVANCE_MS.evidence).toBeUndefined();
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `cd frontend && npx vitest run src/lib/__tests__/steps.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现**

```ts
export type Step = 'intro' | 'contract' | 'plan' | 'reveal' | 'evidence';

const ORDER: Step[] = ['intro', 'contract', 'plan', 'reveal', 'evidence'];

export const AUTO_ADVANCE_MS: Partial<Record<Step, number>> = {
  intro: 3000,
  contract: 9000,
};

export function nextStep(step: Step): Step | null {
  const index = ORDER.indexOf(step);
  return index >= 0 && index < ORDER.length - 1 ? ORDER[index + 1] : null;
}
```

- [ ] **Step 4: `App.tsx` 全量改名 `step === 1|2|3|4|5` → 新字面量**

用 `step === 'intro'` 等替换。`data-step` 属性改为渲染字符串（走查脚本读它）。

> **注意**：`data-step` 的值变了，`tools/shoot.mjs` 里若按数字断言，一并改。**先跑走查看它红**，这是确认走查真的在看这个属性。

- [ ] **Step 5: 跑全量测试**

Run: `cd frontend && npm test`
Expected: 全绿

- [ ] **Step 6: 提交**

```bash
git add frontend/src/lib/steps.ts frontend/src/App.tsx frontend/src/lib/__tests__/steps.test.ts
git commit -m "refactor(steps): the sequence now ends in a reveal, not an attack"
```

---

### Task B2: 攻击计划的词汇与判决

**Files:**
- Create: `frontend/src/lib/plan.ts`
- Modify: `frontend/src/lib/steps.ts`
- Test: `frontend/src/lib/__tests__/plan.test.ts`, `frontend/src/lib/__tests__/steps.test.ts`

> **为什么单独一个模块**：这个仓库没有 `@testing-library/react`，`render()`
> 是 `renderToStaticMarkup`，**做不了交互测试**。所以「观众选了什么」这件事必须
> 能在组件之外被测试 —— 它得是一个纯值，不是一个 React state。

- [ ] **Step 1: 写失败的测试**

```ts
// frontend/src/lib/__tests__/plan.test.ts
import { describe, it, expect } from 'vitest';
import { isPlanComplete, authorityKey, signatureKey, type PlanAnswers } from '../plan';

describe('plan — 观众的攻击计划', () => {
  it('两个问题都答了才算完整', () => {
    expect(isPlanComplete({ authority: 'admin' })).toBe(false);
    expect(isPlanComplete({ signature: 'mine' })).toBe(false);
    expect(isPlanComplete({ authority: 'admin', signature: 'mine' })).toBe(true);
  });

  it('每个选项映射到一个文案键，中英共用一个', () => {
    expect(authorityKey('admin')).toBe('planAuthorityAdmin');
    expect(authorityKey('self')).toBe('planAuthoritySelf');
    expect(authorityKey('vault')).toBe('planAuthorityVault');
    expect(signatureKey('mine')).toBe('planSignatureMine');
    expect(signatureKey('admin')).toBe('planSignatureAdmin');
    expect(signatureKey('both')).toBe('planSignatureBoth');
  });
});
```

```ts
// 追加到 steps.test.ts
it('只有把管理员的地址填进去，才打得进去', () => {
  expect(attackOutcome('admin')).toBe('success');
  expect(attackOutcome('self')).toBe('rejected');
  expect(attackOutcome('vault')).toBe('rejected');
});
```

- [ ] **Step 2: 跑测试确认它失败**

Run: `cd frontend && npx vitest run src/lib/__tests__/plan.test.ts src/lib/__tests__/steps.test.ts`
Expected: FAIL — `../plan` 不存在；`attackOutcome` 仍收 `isFixed`

- [ ] **Step 3: 建 `lib/plan.ts`**

```ts
/**
 * plan.ts — what the visitor says they are going to do, before anything runs.
 *
 * A plain value rather than component state, for one practical reason: this
 * repository renders components to static markup in tests, so anything that
 * lives only inside a `useState` cannot be asserted on. The plan is the input
 * to the verdict and to the reveal, so it has to be a value both of those can
 * be handed.
 */

import type { MessageKey } from '../i18n/messages';

/** Whose address the visitor chose to put in `authority`. */
export type AuthorityChoice = 'admin' | 'self' | 'vault';

/** Whose signature the visitor believes the transaction must carry. */
export type SignatureChoice = 'mine' | 'admin' | 'both';

export interface PlanAnswers {
  authority: AuthorityChoice;
  signature: SignatureChoice;
}

/** The two questions are answered independently, so either can be missing. */
export type PartialPlan = Partial<PlanAnswers>;

export function isPlanComplete(plan: PartialPlan): plan is PlanAnswers {
  return plan.authority !== undefined && plan.signature !== undefined;
}

export function authorityKey(choice: AuthorityChoice): MessageKey {
  return { admin: 'planAuthorityAdmin', self: 'planAuthoritySelf', vault: 'planAuthorityVault' }[
    choice
  ] as MessageKey;
}

export function signatureKey(choice: SignatureChoice): MessageKey {
  return { mine: 'planSignatureMine', admin: 'planSignatureAdmin', both: 'planSignatureBoth' }[
    choice
  ] as MessageKey;
}
```

- [ ] **Step 4: 改 `steps.ts` 的 `attackOutcome`**

```ts
import type { AuthorityChoice } from './plan';

/**
 * Whether the attack gets through, given the plan.
 *
 * The old signature took `isFixed`, because the only thing that could vary was
 * which build you aimed at. Now the visitor's own choice is the input: filling
 * in the admin's address is what walks the `require!` — and the address check
 * being real is precisely what makes the missing *signature* check so easy to
 * miss.
 */
export function attackOutcome(choice: AuthorityChoice): AttackOutcome {
  return choice === 'admin' ? 'success' : 'rejected';
}
```

- [ ] **Step 5: 跑测试确认通过**

Run: `cd frontend && npx vitest run src/lib/__tests__/plan.test.ts src/lib/__tests__/steps.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add frontend/src/lib/plan.ts frontend/src/lib/__tests__/plan.test.ts frontend/src/lib/steps.ts frontend/src/lib/__tests__/steps.test.ts
git commit -m "feat(plan): the verdict follows the visitor's plan, not a build flag"
```

---

### Task B3: 攻击计划表单

**Files:**
- Create: `frontend/src/components/AttackPlan.tsx`
- Modify: `frontend/src/i18n/messages.ts`
- Test: `frontend/src/components/__tests__/attackPlan.test.tsx`

- [ ] **Step 1: 加文案键（中英各一份，接口先加）**

```ts
  /* Step 3 — the visitor commits to a plan before anything runs. */
  planTitle: string;
  planAuthorityQuestion: string;
  planAuthorityAdmin: string;
  planAuthoritySelf: string;
  planAuthorityVault: string;
  planSignatureQuestion: string;
  planSignatureMine: string;
  planSignatureAdmin: string;
  planSignatureBoth: string;
  planExecute: string;
  planNeedBoth: string;
```

```ts
// en
    planTitle: 'Your plan',
    planAuthorityQuestion: 'Whose address will you put in `authority`?',
    planAuthorityAdmin: "The admin's address",
    planAuthoritySelf: 'My own address',
    planAuthorityVault: "The vault's address",
    planSignatureQuestion: 'Whose signature must this transaction carry?',
    planSignatureMine: 'Only mine',
    planSignatureAdmin: "The admin's — it cannot go through without it",
    planSignatureBoth: 'Both',
    planExecute: 'Execute the plan',
    planNeedBoth: 'Answer both questions first.',
// zh
    planTitle: '你的攻击计划',
    planAuthorityQuestion: '你要把**谁**的地址填进 `authority`？',
    planAuthorityAdmin: '管理员的地址',
    planAuthoritySelf: '我自己的地址',
    planAuthorityVault: 'vault 的地址',
    planSignatureQuestion: '这笔交易上**必须**有谁的签名？',
    planSignatureMine: '只要我自己的',
    planSignatureAdmin: '必须有管理员的 —— 没有它就该过不去',
    planSignatureBoth: '两个都要',
    planExecute: '执行这个计划',
    planNeedBoth: '两个问题都要先回答。',
```

- [ ] **Step 2: 写组件测试（受控 + 静态 markup）**

```tsx
// frontend/src/components/__tests__/attackPlan.test.tsx
import { describe, it, expect } from 'vitest';
import AttackPlan from '../AttackPlan';
import { MESSAGES } from '../../i18n/messages';
import { render } from './harness';

const noop = () => {};

describe('AttackPlan — 两个问题', () => {
  it('两个都没答时：执行按钮禁用，并给出提示', () => {
    const html = render(<AttackPlan answers={{}} onChange={noop} onExecute={noop} />);
    expect(html).toContain(MESSAGES.en.planTitle);
    expect(html).toContain(MESSAGES.en.planAuthorityQuestion);
    expect(html).toContain(MESSAGES.en.planSignatureQuestion);
    expect(html).toContain(MESSAGES.en.planNeedBoth);
    expect(html).toContain('disabled');
  });

  it('只答了一个：仍然禁用', () => {
    const html = render(
      <AttackPlan answers={{ authority: 'admin' }} onChange={noop} onExecute={noop} />,
    );
    expect(html).toContain('disabled');
  });

  it('两个都答了：按钮可用，且没有提示', () => {
    const html = render(
      <AttackPlan answers={{ authority: 'admin', signature: 'mine' }} onChange={noop} onExecute={noop} />,
    );
    expect(html).not.toContain('disabled');
    expect(html).not.toContain(MESSAGES.en.planNeedBoth);
  });

  it('已选项被标为选中 —— 观众能看到自己下过的注', () => {
    const html = render(
      <AttackPlan answers={{ authority: 'self', signature: 'admin' }} onChange={noop} onExecute={noop} />,
    );
    expect(html).toMatch(/value="self"[^>]*checked/);
    expect(html).toMatch(/value="admin"[^>]*checked/);
  });

  it('中文模式下全是中文', () => {
    const html = render(<AttackPlan answers={{}} onChange={noop} onExecute={noop} />, 'zh');
    expect(html).toContain(MESSAGES.zh.planTitle);
    expect(html).not.toContain(MESSAGES.en.planTitle);
  });
});
```

- [ ] **Step 3: 实现组件 —— 受控，不持有状态**

```tsx
import { useLanguage } from '../i18n/language';
import {
  authorityKey,
  isPlanComplete,
  signatureKey,
  type AuthorityChoice,
  type PartialPlan,
  type SignatureChoice,
  type PlanAnswers,
} from '../lib/plan';

const AUTHORITY_CHOICES: AuthorityChoice[] = ['admin', 'self', 'vault'];
const SIGNATURE_CHOICES: SignatureChoice[] = ['mine', 'admin', 'both'];

interface AttackPlanProps {
  /** What the visitor has answered so far. Held by App, so it can be a value. */
  answers: PartialPlan;
  onChange: (choice: { authority?: AuthorityChoice; signature?: SignatureChoice }) => void;
  onExecute: (answers: PlanAnswers) => void;
}

/**
 * Step 3 — the visitor commits to a plan before anything runs.
 *
 * Controlled on purpose. The repository renders components to static markup in
 * tests, so a plan held in a `useState` here would be unreachable from a test
 * and, worse, invisible to the reveal — which has to hold the visitor's own
 * words next to the transaction. The answers live above; this only draws them.
 */
export default function AttackPlan({ answers, onChange, onExecute }: AttackPlanProps) {
  const { t } = useLanguage();
  const ready = isPlanComplete(answers);

  return (
    <section className="plan" data-testid="attack-plan">
      <h2 className="plan__title">{t.planTitle}</h2>

      <fieldset className="plan__group" data-testid="plan-authority">
        <legend>{t.planAuthorityQuestion}</legend>
        {AUTHORITY_CHOICES.map((choice) => (
          <label key={choice} className="plan__option">
            <input
              type="radio"
              name="authority"
              value={choice}
              checked={answers.authority === choice}
              onChange={() => onChange({ authority: choice })}
            />
            {t[authorityKey(choice)]}
          </label>
        ))}
      </fieldset>

      <fieldset className="plan__group" data-testid="plan-signature">
        <legend>{t.planSignatureQuestion}</legend>
        {SIGNATURE_CHOICES.map((choice) => (
          <label key={choice} className="plan__option">
            <input
              type="radio"
              name="signature"
              value={choice}
              checked={answers.signature === choice}
              onChange={() => onChange({ signature: choice })}
            />
            {t[signatureKey(choice)]}
          </label>
        ))}
      </fieldset>

      <button
        type="button"
        className="execute-btn"
        data-testid="plan-execute"
        disabled={!ready}
        onClick={() => ready && onExecute(answers)}
      >
        {t.planExecute}
      </button>
      {!ready && <p className="plan__hint">{t.planNeedBoth}</p>}
    </section>
  );
}
```

> `onExecute(answers)` 里 `answers` 已被 `isPlanComplete` 收窄成 `PlanAnswers`，无需断言。

- [ ] **Step 4: 加 CSS（`app.css`）**

```css
/* The plan form. Radios rather than buttons: the visitor is committing to a
   belief, and a belief you can see yourself having picked is the point. */
.plan { display: flex; flex-direction: column; gap: 16px; max-width: 560px; margin: 0 auto; }
.plan__title { font-size: 20px; font-weight: 600; }
.plan__group { border: 1px solid var(--color-border); border-radius: var(--radius-card); padding: 12px 16px; }
.plan__option { display: block; padding: 6px 0; font-family: var(--font-mono); font-size: 14px; }
.plan__hint { color: var(--color-text-muted); font-size: 13px; }
```

- [ ] **Step 5: 跑测试**

Run: `cd frontend && npx vitest run src/components/__tests__/attackPlan.test.tsx`
Expected: PASS（5 项）

- [ ] **Step 6: 提交**

```bash
git add frontend/src/components/AttackPlan.tsx frontend/src/components/__tests__/attackPlan.test.tsx frontend/src/i18n/messages.ts frontend/src/styles/app.css
git commit -m "feat(plan): the visitor states an attack plan before anything runs"
```

---

### Task B4: 执行 —— 无钱包放动画，有钱包真发

**Files:**
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/__tests__/app-default-path.test.tsx`

- [ ] **Step 1: `App.tsx` 接线**

```tsx
const [answers, setAnswers] = useState<PlanAnswers | null>(null);

/**
 * Executing the plan. With a wallet the transaction is real and the verdict is
 * the chain's; without one the verdict is the animation's — but it is derived
 * from the same plan, so a plan that names the wrong address is refused in both
 * worlds.
 */
const handlePlanExecute = useCallback(
  (next: PlanAnswers) => {
    setAnswers(next);
    setStep('reveal');
    clearRealRun();
    setAttackState('showing-tx');
  },
  [clearRealRun],
);
```

- [ ] **Step 2：`reveal` 步骤的渲染**

```tsx
{step === 'reveal' && (
  <>
    <div className="layers-wrap">
      <ContractLayers
        mode={layersMode}
        isFixed={false}
        attackState={attackState}
        onAttackEnd={handleAttackEnd}
        originRects={regionRects.current}
      />
      {attackState === 'showing-tx' && (
        <TxCard payload={payload ?? undefined} demoTarget={demoTargetState ?? undefined} />
      )}
    </div>
    <div className="footer-slot">
      {attackState === 'done' && (
        <>
          <Reveal answers={answers!} payload={payload} demoTarget={demoTargetState} signature={chainVerdict?.signature} />
          <VerifyPanel runSignature={chainVerdict?.signature} />
        </>
      )}
    </div>
  </>
)}
```

`layersMode` 改为按 `attackState` 推导（`showing-tx` → `decomposed`，之后 → `stacked`），因为它不再由 `step` 驱动。

- [ ] **Step 3: 无钱包时的判决改由计划推导**

```tsx
const animatedOutcome = answers ? attackOutcome(answers.authority) : 'success';
```

`AttackResult` 的 `outcome` 传入 `chainVerdict?.verdict ?? animatedOutcome`。

- [ ] **Step 4: 跑测试与构建**

Run: `cd frontend && npm test && npm run build`
Expected: 全绿

- [ ] **Step 5: 提交**

```bash
git add frontend/src/App.tsx
git commit -m "feat(reveal): executing the plan drives the animation, from the same answers"
```

---

### Task B5: 揭晓 —— 摊开交易，对照答案

**Files:**
- Create: `frontend/src/components/Reveal.tsx`
- Modify: `frontend/src/i18n/messages.ts`
- Test: `frontend/src/components/__tests__/reveal.test.tsx`

- [ ] **Step 1: 文案键**

```ts
  revealTitle: string;
  revealYourPlan: string;
  revealReality: string;
  revealSignedMine: string;
  revealSignatureAbsent: string;
  revealAddressWasPublic: string;
  revealContradiction: string;
  revealAddressCheckIsReal: string;
  revealWhyItWorks: string;
  revealPunchline: string;
```

```ts
// en
    revealTitle: 'How it worked',
    revealYourPlan: 'What you said',
    revealReality: 'What the transaction shows',
    revealSignedMine: 'The only signature on it is yours.',
    revealSignatureAbsent: "There is no ADMIN signature. There never was one.",
    revealAddressWasPublic: "The admin's address is public. Anyone can type it.",
    revealContradiction: 'You said this transaction needed the admin\'s signature. Look at the list above.',
    revealAddressCheckIsReal: 'The address check is real — that is what makes this so easy to misread.',
    revealWhyItWorks: 'Why it still got through',
    revealPunchline:
      'Stage 4 compares two public values. It never asks who signed. Had stage 3 declared Signer, the runtime would have refused this transaction before it reached stage 4.',
// zh
    revealTitle: '它是怎么被攻破的',
    revealYourPlan: '你说的',
    revealReality: '交易显示的',
    revealSignedMine: '上面唯一的签名，是你的。',
    revealSignatureAbsent: '没有管理员的签名。从来就没有过。',
    revealAddressWasPublic: '管理员的地址是公开信息，谁都能填。',
    revealContradiction: '你说这笔交易必须有管理员的签名。看看上面那份清单。',
    revealAddressCheckIsReal: '地址检查是真的存在的 —— 这正是它这么容易被误读的原因。',
    revealWhyItWorks: '那它为什么还是进去了',
    revealPunchline:
      '阶段 4 比的是两个公开的值。它从来没有问过「谁签了名」。如果阶段 3 写的是 `Signer`，运行时会在你的交易走到阶段 4 之前就把它拒之门外。',
```

- [ ] **Step 2: 写测试**

```tsx
// frontend/src/components/__tests__/reveal.test.tsx
import { describe, it, expect } from 'vitest';
import { PublicKey } from '@solana/web3.js';
import Reveal from '../Reveal';
import { MESSAGES } from '../../i18n/messages';
import { VERIFICATION } from '../../config/verification';
import { vaultAddress } from '../../lib/devnet';
import { render } from './harness';

const TARGET = {
  programId: VERIFICATION.vulnerableProgramId,
  vault: vaultAddress(1).toBase58(),
  authority: VERIFICATION.adminPubkey,
};

describe('Reveal — 观众的答案，对上交易的真身', () => {
  it('把「你说的」和「交易显示的」并排摆出来', () => {
    const html = render(
      <Reveal answers={{ authority: 'admin', signature: 'admin' }} demoTarget={TARGET} />,
    );
    expect(html).toContain(MESSAGES.en.revealYourPlan);
    expect(html).toContain(MESSAGES.en.revealReality);
    expect(html).toContain(MESSAGES.en.planAuthorityAdmin);
    expect(html).toContain(MESSAGES.en.planSignatureAdmin);
  });

  it('拿管理员地址下注、却说必须有管理员签名 —— 打脸那一句出现', () => {
    const html = render(
      <Reveal answers={{ authority: 'admin', signature: 'admin' }} demoTarget={TARGET} />,
    );
    expect(html).toContain(MESSAGES.en.revealContradiction);
    expect(html).not.toContain(MESSAGES.en.revealAddressCheckIsReal);
  });

  it('地址填错时，给的是「地址检查是真的」那一句', () => {
    const html = render(
      <Reveal answers={{ authority: 'self', signature: 'mine' }} demoTarget={TARGET} />,
    );
    expect(html).toContain(MESSAGES.en.revealAddressCheckIsReal);
    expect(html).not.toContain(MESSAGES.en.revealContradiction);
  });

  it('交易那一栏是真的地址，不是省略号', () => {
    const html = render(
      <Reveal answers={{ authority: 'admin', signature: 'mine' }} demoTarget={TARGET} />,
    );
    expect(html).not.toContain('7xKm');
    expect(html).not.toContain('ADMiN');
    expect(html).toContain(new PublicKey(TARGET.vault).toBase58().slice(0, 4));
  });

  it('有真实签名时把它显示出来', () => {
    const html = render(
      <Reveal
        answers={{ authority: 'admin', signature: 'mine' }}
        demoTarget={TARGET}
        signature="2d4hd6SnxtriuegGRGRgM542Cr4qsGbkYQUgx3shR3fxdFSmUFRrGvM7L9zwK2CFBe1KTRafeyqD66nj2Mm4tEEW"
      />,
    );
    expect(html).toContain('2d4hd6Sn');
  });
});
```

- [ ] **Step 3: 实现组件**

```tsx
import { useLanguage } from '../i18n/language';
import { authorityKey, signatureKey, type PlanAnswers } from '../lib/plan';
import TxCardTable from './TxCardTable';
import type { DemoTarget } from '../lib/demoTarget';
import type { TxPayload } from './TxCard';

interface RevealProps {
  /** What the visitor answered before anything ran. */
  answers: PlanAnswers;
  /** This run's accounts, when a real run went out. */
  payload?: TxPayload | null;
  /** The real target, when the page could resolve one. */
  demoTarget?: DemoTarget | null;
  /** The chain's signature, when there was a real transaction. */
  signature?: string;
}
```

结构（三段）：

```tsx
export default function Reveal({ answers, payload, demoTarget, signature }: RevealProps) {
  const { t } = useLanguage();
  return (
    <section className="reveal" data-testid="reveal">
      <h2 className="reveal__title">{t.revealTitle}</h2>

      {/* ① 你说的 —— 观众自己下过的注，原样摆出来 */}
      <div className="reveal__said">
        <h3>{t.revealYourPlan}</h3>
        <p>{t[authorityKey(answers.authority)]}</p>
        <p>{t[signatureKey(answers.signature)]}</p>
      </div>

      {/* ② 交易显示的 —— 与 TxCard 共用同一份表格渲染，不复制 markup */}
      <div className="reveal__actual">
        <h3>{t.revealReality}</h3>
        <TxCardTable payload={payload} demoTarget={demoTarget} />
        {signature && (
          <p className="reveal__signature">
            <code>{elide(signature)}</code>
          </p>
        )}
        <p className="reveal__note">{t.revealSignedMine}</p>
        <p className="reveal__note reveal__note--missing">{t.revealSignatureAbsent}</p>
      </div>

      {/* ③ 对照 —— 这一个三元是整个演示的支点 */}
      <p className="reveal__verdict">
        {answers.authority === 'admin' ? t.revealContradiction : t.revealAddressCheckIsReal}
      </p>

      <h3>{t.revealWhyItWorks}</h3>
      <p className="reveal__punchline">{t.revealPunchline}</p>
    </section>
  );
}
```

补齐 imports（`elide` 已存在于 `lib/elide.ts`）：

```ts
import { elide } from '../lib/elide';
```

> **重构要求**：`TxCard` 里的账号/签名表格抽成 `TxCardTable`（无 overlay、无定时），`TxCard` 与 `Reveal` 共用。**不允许复制一份 markup** —— 两份会漂移。

- [ ] **Step 4: 跑测试**

Run: `cd frontend && npx vitest run src/components/__tests__/reveal.test.tsx`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add frontend/src/components/Reveal.tsx frontend/src/components/TxCard.tsx frontend/src/i18n/messages.ts frontend/src/components/__tests__/reveal.test.tsx
git commit -m "feat(reveal): the visitor's own answer, held against the transaction"
```

---

### Task B6: 移除 Vulnerable / Fixed 开关

**Files:**
- Delete: `frontend/src/components/FixToggle.tsx`（及其测试）
- Modify: `frontend/src/App.tsx`, `frontend/src/components/ContractLayers.tsx`, `frontend/src/components/AttackResult.tsx`
- Test: 所有引用 `isFixed` 的用例

- [ ] **Step 1: 先跑一次全量测试，记录当前绿的基线**

Run: `cd frontend && npm test`
Expected: 全绿。记下项数。

- [ ] **Step 2: 删组件、删引用**

`App.tsx`：删 `FixToggle` 的 import、`isFixed` state、`handleFixChange`。所有 `isFixed` 传 `false` 并加一行注释：

```tsx
// The demo attacks one build. The repaired build's refusal is not gone — it is
// the claim VerifyPanel checks, from the real transaction that was rejected.
```

- [ ] **Step 3: 跑测试，逐个修掉因删除而红的用例**

Run: `cd frontend && npm test`
Expected: 只有与 `FixToggle` / `isFixed` 相关的用例红。**不要**为了让它们变绿而把开关加回来 —— 删掉那些用例，并在提交信息里说明。

- [ ] **Step 4: 跑构建**

Run: `cd frontend && npm run build`
Expected: 通过（`isFixed` 若变成未使用的 prop，TS 会报；一并清理签名）

- [ ] **Step 5: 提交**

```bash
git add -A frontend/src
git commit -m "refactor: the build toggle leaves act one; the refusal moves to the evidence"
```

---

### Task B7: 走查复绿

**Files:**
- Modify: `tools/shoot.mjs`（如断言了旧的 `data-step` 数字或第 5 步结构）

- [ ] **Step 1: 跑走查，看它红在哪**

Run: `node tools/shoot.mjs`（需 Node ≥ 22）
Expected: FAIL —— `data-step` 现在是字符串，且第 5 步的控件已换成攻击计划

- [ ] **Step 2: 按新结构更新断言**

- `data-step` 断言改为 `intro` / `contract` / `plan` / `reveal` / `evidence`
- 第 5 步的 `execute-btn` 断言改为 `plan-execute`（先选两个答案再点）
- 结果串断言不变（`Attack Successful` / `Transaction Rejected`）
- 新增：`contract-status` 存在的断言

- [ ] **Step 3: 跑走查确认全绿**

Run: `node tools/shoot.mjs`
Expected: 全绿、无 console 错误、无层卡片重挂

- [ ] **Step 4: 提交**

```bash
git add tools/shoot.mjs
git commit -m "test(harness): the walkthrough follows the new sequence"
```

---

### ✅ CHECKPOINT B

- [ ] `npm test` 全绿
- [ ] `npm run build` 通过
- [ ] `tools/shoot.mjs` 全绿
- [ ] 人眼：完整走一遍 —— 合约 → 计划 → 执行 → 揭晓，两条分支（选对 / 选错地址）都试
- [ ] 人眼：连钱包真发一笔，链上余额 1000 → 500，签名出现在揭晓里
- [ ] 人眼：中文模式下旁注、计划问题、揭晓对照全是中文

---

## 交付清单

- [ ] 开场展示链上合约逐字全文，带状态栏与中文旁注
- [ ] 交易卡片在任何情况下都显示真实地址
- [ ] 攻击计划两个问题，两个分支各有揭晓
- [ ] 拆解/层叠/穿透动画移到执行之后，作为揭晓
- [ ] `FixToggle` 已移除
- [ ] 走查与全部测试全绿
- [ ] 规格 §4–§6 全部落地；§7（第二幕）未动
