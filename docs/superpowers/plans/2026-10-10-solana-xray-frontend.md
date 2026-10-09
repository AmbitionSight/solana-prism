# Solana Contract X-Ray — 前端执行计划 (Phase 0-2)

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development 或 superpowers:executing-plans 逐任务实施。步骤用 `- [ ]` 复选框跟踪。

**Goal:** 在零环境风险的前提下，交付一个可独立提交的 6 步 Apple 风格交互动画 Demo（纯前端，无链上依赖），把 Anchor 合约拆解为 5 层并演示 Missing Signer Check 攻击。

**Architecture:** 单一 React 状态机 (`App.tsx`) 持有 `step` / `isFixed` / `attackState`；Step 3/4/5 共用同一批 `ContractLayers` DOM，仅切换容器 className 驱动 CSS transition。所有像素坐标来自 `lib/geometry.ts` 纯函数，keyframes 由 JS 生成注入，CSS 内不出现手写像素。层级内容由 `config/layers.ts` 数据驱动。

**Tech Stack:** Vite + React 18 + TypeScript / 纯 CSS + CSS 变量 / CSS transitions + keyframes / Vitest / Vercel。禁用 Tailwind、动画库、UI 库、状态管理库、语法高亮库。

**施工前提（已就位）:**
- 仓库根: `C:\Users\Ambit\Desktop\test\solana-xray`，分支 `feat/xray`
- git 身份(repo-local): `ambitionsight <ambitionsight@qq.com>`
- 规格书已入库: `docs/solana-xray-plan.md` (v4.1)

---

## 1. GAP 决议 — 原计划留白处的补充决策

原计划 v4.1 有四处未给出可直接施工的细节。本文件将其固定，避免施工中临时发明。

### GAP-1 设计令牌（原计划写"与 v3 相同"，但 v3 正文未随计划提供）

`frontend/src/styles/global.css` 写入以下令牌。取值原则：白底、单一强调色、克制的阴影，接近 Apple 官网的观感。

```css
:root {
  /* Typography */
  --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI',
               'Helvetica Neue', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: 'SF Mono', ui-monospace, 'JetBrains Mono', 'Cascadia Code',
               Consolas, 'Courier New', monospace;

  /* Surfaces & text */
  --color-bg: #FFFFFF;
  --color-bg-code: #FBFBFD;
  --color-border: #E5E5EA;
  --color-text: #1D1D1F;
  --color-text-secondary: #6E6E73;
  --color-text-tertiary: #A1A1A6;

  /* Syntax (手写高亮三色) */
  --color-syntax-keyword: #D70015;
  --color-syntax-type: #0071E3;
  --color-syntax-comment: #86868B;

  /* Semantic */
  --color-danger: #D1242F;
  --color-danger-bg: #FFF0F0;
  --color-success: #1D8348;
  --color-success-bg: #F0FFF4;

  /* Motion — 统一 Apple easing（铁律：全站唯一） */
  --ease-apple: cubic-bezier(0.25, 0.1, 0.25, 1.0);
  --duration-fast: 200ms;
  --duration-normal: 400ms;
  --duration-slow: 800ms;

  /* Elevation & shape */
  --shadow-card: 0 1px 2px rgba(0, 0, 0, 0.04), 0 8px 24px rgba(0, 0, 0, 0.06);
  --radius-card: 12px;
}
```

加基础 reset、`body` 白底与 `--font-sans`、`-webkit-font-smoothing: antialiased`。

### GAP-2 组件 DOM 契约（铁律落地：Step 3/4/5 共用同一批 DOM）

React 在同一位置渲染同一组件类型时不会重建 DOM。因此：

```tsx
// App.tsx —— ContractLayers 在 step>=3 期间持续挂载，中间不换 key、不换组件类型
{step >= 3 && (
  <ContractLayers mode={layersMode} isFixed={isFixed} attackState={attackState} />
)}
```

```tsx
// ContractLayers.tsx —— 容器 className 是唯一变化量；LayerCard 顺序与 key 恒定
export type LayersMode = 'hidden' | 'decomposed' | 'stacked';

<div className={`layers-container ${mode}${attackState === 'running' ? ' attacking' : ''}`}
     data-testid="layers-container">
  {VAULT_LAYERS.map((layer) => (
    <LayerCard key={layer.id} layer={layer} isFixed={isFixed} />
  ))}
  {attackState === 'running' && <AttackDot isFixed={isFixed} onDone={...} />}
</div>
```

**禁止**：把散开/层叠做成两个组件、用 `key={mode}` 强制重挂、按 step 条件渲染不同子树。以上任一都会重建 DOM 并打断 transition，属评审 Critical 打回项。

`--scatter-x/y` 通过 `LayerCard` 的内联 style 在挂载时一次性写入，之后不再变化：

```tsx
style={{ '--scatter-x': `${layer.scatter.x}px`, '--scatter-y': `${layer.scatter.y}px` } as CSSProperties}
```

### GAP-3 keyframes 注入（铁律落地：坐标只能来自 geometry.ts）

原计划把 keyframe 字符串内联在 `AttackDot.tsx`。为让"禁止手写像素"这条铁律**可被自动化测试守住**，抽出纯函数模块 `frontend/src/lib/keyframes.ts`：

```ts
import { layerMidY, layerTopY, stackHeight, LAYER_HEIGHT } from './geometry';
import { VAULT_LAYERS } from '../config/layers';

const COUNT = VAULT_LAYERS.length;            // 5
const BOTTOM = stackHeight(COUNT) + 8;        // 圆点穿过全部层后的终点

export function vulnerableKeyframes(): string { /* 0%→100%，逐层 translateY(layerMidY(i)) */ }
export function fixedKeyframes(): string {     /* 撞到 L3 顶 → 弹回 → 再撞 → opacity 0 */ }
```

`AttackDot` 渲染 `<style>{vulnerableKeyframes()}</style>` 并给圆点挂 `animation: attack-vulnerable ...`。

**可测断言**（补进 `keyframes.test.ts`）：生成的 CSS 中出现的每个 `translateY(Npx)` 的 N，必须能在 geometry 的输出集合中找到 —— 这条测试即为"无手写像素"的机器守卫。

### GAP-4 验证方式（原计划 UI 任务写"人眼"，需要可复现证据）

分三层，前两层在每次提交前跑，第三层交付时跑：

| 层 | 手段 | 覆盖 |
|---|---|---|
| L1 逻辑 | `npm test`（Vitest） | geometry / steps / keyframes 数值正确性 |
| L2 静态 | `npm run build`（`tsc -b && vite build`） | 类型错误、未用变量、构建可产出 |
| L3 观感 | 截图 + `npm run dev` 人工过一遍 | 动画时序、easing 一致、✗ 可见性、无 console 报错 |

L3 的"人眼"部分由你（用户）在 CHECKPOINT 2 执行；我负责提供可复现的本地 URL 与逐步截图，不代替你签字。

---

## 2. 任务顺序、产物与提交点

每个任务一个提交（conventional commits），提交信息即为可追溯的检查点。

| # | 任务 | 主要产物 | 验证 | 提交 |
|---|---|---|---|---|
| 0.1 | 仓库与分支 | `.gitignore`、`docs/solana-xray-plan.md` | `git branch --show-current` → `feat/xray` | `chore: init repo, spec, gitignore` |
| 0.2 | 脚手架 + Vitest 基线 | `frontend/**`、`smoke.test.ts` | `npm test` 1 passed | `chore: scaffold vite react-ts + vitest` |
| 0.3 | 设计令牌 | `src/styles/global.css` | `npm run build` 通过 | `feat(styles): design tokens` |
| 1.1 | geometry **RED→GREEN** | `lib/geometry.ts` + 测试 | 先见红(模块不存在)，后全绿 | `feat(lib): geometry with tests` |
| 1.2 | steps **RED→GREEN** | `lib/steps.ts` + 测试 | 先见红，后全绿 | `feat(lib): steps state machine with tests` |
| 1.3 | layers 配置 | `config/layers.ts` | `npm test` 仍绿 + build 无 TS 错 | `feat(config): vault layer data` |
| — | **CHECKPOINT 1** | — | 测试全绿 + 评审通过 | — |
| 2.1 | App 状态机骨架 | `App.tsx` | dev 页面 1→5 自动推进停在 5 | `feat(app): step state machine` |
| 2.2 | Step1 标题 + Step2 代码 | `Step1Title.tsx`、`Step2Code.tsx` | 三色高亮正确、切换流畅 | `feat(ui): title and code steps` |
| 2.3 | 散开模式 (Step 3) | `ContractLayers.tsx`、`LayerCard.tsx`、`animations.css` | 五卡依次飞散到配置坐标 | `feat(ui): decomposed layer mode` |
| 2.4 | 层叠 + L3 裂缝 (Step 4) | 追加 CSS | 收拢层叠 + 层名 + 红虚线 | `feat(ui): stacked mode with L3 crack` |
| 2.5 | TxCard (Step 5a) | `TxCard.tsx` | ✗ 一眼可见，1.2s 后进入下落 | `feat(ui): transaction payload card` |
| 2.6 | AttackDot 漏洞版 (Step 5b) | `AttackDot.tsx`、`lib/keyframes.ts`、`keyframes.test.ts` | 穿透 5 层底部放大 | `feat(ui): vulnerable attack path` |
| 2.7 | FixToggle + 修复版 | `FixToggle.tsx` | L3 顶两撞两弹后消失 | `feat(ui): fixed path and toggle` |
| 2.8 | 结果 + 验证面板 | `AttackResult.tsx`、`VerifyPanel.tsx`、`config/verification.ts` | 两路径文案正确、面板结构正确 | `feat(ui): result and verify panel shell` |
| — | **CHECKPOINT 2** | — | 全流程两遍 + 测试全绿 + 评审 | tag `frontend-demo` |

**降级顺序（时间不够时从 1 开始砍，与原计划一致）:** Step 6 面板 → Fixed 路径 → Step 3 散开 → Step 1 标题。
**保底不可砍:** 层叠 + 交易卡片 + 漏洞版攻击动画。

---

## 3. 门禁清单

### CHECKPOINT 1
- [ ] `npm test` 全绿（geometry + steps，且都见过 RED）
- [ ] `npm run build` 无 TS 错误
- [ ] 两段式评审通过（规格符合度 / 代码质量）
- [ ] 铁律自查：无 CSS 手写像素、无 DOM 拆分

### CHECKPOINT 2
- [ ] 完整流程 1→6 无刷新跑通两遍
- [ ] 交易卡片 ✗（ADMIN 签名缺席）一眼可见
- [ ] 全站 easing 均为 `--ease-apple`，无 console 报错
- [ ] `npm test` 全绿
- [ ] 两段式评审通过
- [ ] 截图或本地 URL 可交付给你做人眼验收

---

## 4. 风险

| 风险 | 处置 |
|---|---|
| Step 3→4 切换重建 DOM，动画断裂 | GAP-2 契约；调试时先查 DOM 是否重建，不在现象层打补丁 |
| 动画时序用 sleep 赌 | 条件等待 `onAnimationEnd`；仅 TxCard 的 1200ms 是编排节奏例外 |
| 令牌写错导致全站观感偏 | GAP-1 固定取值，CHECKPOINT 2 人眼验收 |
| Phase 3 环境风险 | 本阶段完全不碰 WSL2/Anchor，前端在 Windows 原生 Node 完成 |
