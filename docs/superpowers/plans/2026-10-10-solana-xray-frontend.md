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
| L1 逻辑 | `npm test`（Vitest） | geometry / steps / keyframes / highlight / verification 数值正确性 |
| L2 静态 | `npm run build`（`tsc -b && vite build`） | 类型错误、未用变量、构建可产出 |
| L3 观感 | `tools/shoot.mjs` 真实时间截图 + `npm run dev` 人工过一遍 | 动画时序、easing 一致、✗ 可见性、无 console 报错 |

**L3 为什么不用 `--virtual-time-budget`**: 实测该模式下 `setTimeout` 被快进到虚拟时间，而 CSS 动画仍走真实时钟，截到的帧与组件自认的状态不对应（表现为"步骤已到 2、代码卡片却全透明"）。`tools/shoot.mjs` 改用 CDP 真实等待 + 真实点击，每帧都是 Demo 的真实帧。
**运行**: `node tools/shoot.mjs http://localhost:5199/ .shots-real`（需 Node ≥ 22，用随包 Node 24 执行）。

L3 的"人眼"终审由你（用户）在 CHECKPOINT 2 执行；我提供可复现的本地 URL 与逐步截图，不代替你签字。

> **注意（评审 m6）**: `global.css` 含 `prefers-reduced-motion` 规则，会把动画压到 0.01ms。若验收环境报告 reduce，Demo 会变成静止画面。headless Chrome 默认不报告 reduce（已实测截图动画正常），但人工验收前请确认系统未开启"减少动态效果"。

---

## 1b. GAP-5 施工中新增的公开 API 与关键决议

> 主计划第 11 条要求"计划变更必须回来改文档"。以下符号不在主计划 D 节的原清单内，是施工中为解决动画断裂而新增的，此处补齐签名与语义，并纳入 CHECKPOINT 2 的验收范围。

| 符号 | 位置 | 语义 | 为什么必须有 |
|---|---|---|---|
| `stackedOffsetY(index, count)` | `lib/geometry.ts` | 层叠布局下，第 index 层中心相对容器中心的偏移 = `layerMidY(index) - stackHeight(count)/2` | 主计划 2.4 的 CSS 在散开态用 `position:absolute`、层叠态用 `position:relative`。切换 `position` 会改变包含块，卡片会从"容器中心 + 散布"瞬移到"流位置 + 散布"再飞入 —— 肉眼可见的弹跳。改为两种布局都是同一原点的纯 transform，CSS 才能插值 |
| `dropStartY()` | `lib/geometry.ts` | 圆点下落起点 = 栈顶上方一个层高（-64px） | 关键帧需要一个"从视野外进入"的起点；写在 keyframes.ts 里就是手写像素 |
| `blockedY(index)` / `BLOCK_CLEARANCE` | `lib/geometry.ts` | 被第 index 层拦停时圆点中心的 y = 层顶上方 8px | **修正主计划 2.7 的错误**：原文 `blockedY(2)+LAYER_HEIGHT` = 200，落在 L3 区间 [144,208] 内部 56px 处，视觉上等于"攻击穿过了安全层"，与修复路径要表达的意思相反。采用 `blockedY(2)` = 136 作为接触点，并由 `keyframes.test.ts` 断言"全程最深只到拦停位置，绝不进入安全层" |
| `AttackState` | `lib/steps.ts` | `'idle' \| 'showing-tx' \| 'running' \| 'done'` | 主计划 2.1 要求 App 持有该状态，类型需与状态机同处定义 |
| `lib/keyframes.ts` 整模块 | `lib/keyframes.ts` | 由 geometry + layers 生成两套圆点关键帧与两套层 pulse 关键帧 | 主计划 2.6 把关键帧内联在 `AttackDot.tsx`。抽出纯函数后，"禁止手写像素"才可被自动化测试守住：`keyframes.test.ts` 断言生成文本里每个 `translateY(Npx)` 的 N 都在 geometry 的输出集合内 |

**其他施工决议:**
- **层叠改为 transform 实现**（见上表第一行），`.decomposed` / `.stacked` 只改变 `--x` / `--y` / `--scale` 三个输入，DOM 结构完全不变，符合铁律第 1 条。
- **散开态缩放 0.85**：480px 宽的卡片按原 scatter 坐标会互相压叠；缩到 0.85 后相邻卡片留出 32px 间隙且文字仍可读。
- **层名标签只在 stacked 显示**，L3 的红色虚线同样只在 stacked 出现 —— 让"裂缝"成为第 4 步收拢时落下的揭示，而不是第 3 步就已经摊在明面上。
- **`<style>` 注入位置**：由 `ContractLayers` 渲染在 `.layers-container` **之外**，避免关键帧 style 元素成为容器的子节点而干扰层叠布局。
- **stagger 用内联 `transitionDelay`** 而非 `:nth-child(n)`：nth-child 会被任何新增子节点（如注入的 style、attack dot）打乱。
- **Vite 锁 6.x**：本机 Node 20.10.0 低于 Vite 7 要求的 `^20.19.0`；`^6.3.5` 的 caret 上限为 <7.0.0，不会自行漂移。已写入 `package.json` 的 `engines` 与说明字段。

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

**实际提交序列（Phase 0-2 完成后回填）:**

```
chore: init repo, spec, gitignore
chore: scaffold vite react-ts + vitest baseline
feat(styles): design tokens and reset
feat(lib): geometry with tests                     <- RED 已见
feat(lib): steps state machine with tests          <- RED 已见
feat(config): vault layer data
feat(lib): stackedOffsetY so stacked layout is a pure transform   <- RED 已见
feat(app): step state machine, indicator, replay
feat(ui): title and code steps with hand-written highlighter      <- highlight RED 已见
feat(lib): keyframes generated from geometry, with tests          <- RED 已见
feat(ui): layer stack, attack paths, payload card, verify panel
feat(config): verification placeholders with tests                <- RED 已见
```

与原计划任务号的对应：2.1→`feat(app)`，2.2→`feat(ui): title and code`，2.3/2.4/2.5/2.6/2.7/2.8 合并为 `feat(ui): layer stack…` 一个提交。
**合并理由**：2.3 与 2.4 改的是同一个组件、同一批 DOM、同一组 CSS 类，按原计划拆成两个提交会出现"提交 A 的 CSS 描述一个尚不存在的布局"的中间态；2.5-2.8 又都挂在同一个 `attackState` 状态机上。验证点（每个任务的验证步骤）逐条照跑，只是落盘时机合并。

**降级顺序（时间不够时从 1 开始砍，与原计划一致）:** Step 6 面板 → Fixed 路径 → Step 3 散开 → Step 1 标题。
**保底不可砍:** 层叠 + 交易卡片 + 漏洞版攻击动画。

---

## 3. 门禁清单

### CHECKPOINT 1 — ✅ PASS
- [x] `npm test` 全绿（geometry + steps，且都见过 RED）
- [x] `npm run build` 无 TS 错误
- [x] 两段式评审通过（子代理独立复核，押 SHA `de7f590`）
- [x] 铁律自查：无 CSS 手写像素、无 DOM 拆分

评审给出 0 Critical、2 Major、7 Minor。Major 两条均为**文档/契约债**而非代码缺陷，已全部处理：
- **M1（拦停坐标矛盾）** → 见 GAP-5 的 `IMPACT_Y` 行；评审独立复核确认"计划公式 200 落在 L3 区间 [144,208] 内 56px，视觉上等于攻击穿过了安全层"，并实测实现版本圆点峰值恰好 136.0、从不触及 144。
- **M2（新增 API 未回写文档）** → 本文件新增 GAP-5 小节补齐签名与语义。
- Minor 中 `stackHeight(0)` 返回 -8、`blockedY` 的字面量 8、缺 `engines` 等已一并修掉并补测试。

### CHECKPOINT 2 — ✅ PASS（三轮：FAIL → FAIL → PASS，全部修复并逐条证伪）
- [x] 完整流程 1→6 无刷新跑通两遍（harness 第二遍与第一遍逐字节相同）
- [x] 交易卡片 ✗（ADMIN 签名缺席）一眼可见，且带 `aria-label="signature absent"`
- [x] 全站 easing 均为 `--ease-apple`（全库仅 1 处 `cubic-bezier`），console 干净
- [x] `npm test` 全绿（48 个）
- [x] 两段式评审通过（子代理押 SHA `851d563`，用 CDP 实测 + 变异测试）
- [x] 截图（`docs/screenshots/contact-sheet.png`）可交付给你做人眼验收

**首轮评审结论为 `FAIL (2 critical)`，两条都是"验证层"而非产品缺陷**，已全部修复：

| # | 问题 | 修复 |
|---|---|---|
| C1 | 控制台错误门禁**永远不会失败**：`window.__xrayErrors` 全库无人赋值，`connect()` 又丢弃所有事件消息。评审同时实测到真实报错（favicon 404）| harness 改为在 `connect()` 内收集 `Runtime.consoleAPICalled` / `Runtime.exceptionThrown` / `Log.entryAdded`；`index.html` 加内联空图标消除 404。**已用"故意 `console.error` → 门禁 FAIL → 撤回"证明该门禁确实会失败** |
| C2 | `'结束时淡出'` 是假绿：`toContain('opacity:0')` 被 0% 帧满足 | 改为解析关键帧、断言**最后一帧**；并新增 `opacityAt()`（含 CSS 插值语义）断言两次撞击时仍为 1 |
| M1 | 修复版两条弹跳是**幽灵**：opacity 从 6% 一路插值到 100%，实测第一次撞击时只有 0.207 | 在 88% 处重申 `opacity:1`，只在最后一次弹跳后淡出。**已用变异测试证明新断言会失败（算出 0.5106）** |
| M2 | `prefers-reduced-motion` 下第 1、2 步**整屏空白**（动画瞬间结束 + `fill-mode:both` 钉在 opacity:0 的末帧）| 在 reduced-motion 块内单独覆写这三个选择器为 `animation:none; opacity:1`（不能用一刀切 `animation:none`，否则 `.code-card__line` 基线 opacity:0 永远不可见）。**已用 `Emulation.setEmulatedMedia` 实测两步 opacity 均为 1** |
| M3 | harness 用绝对 sleep，违反本项目调试协议 §I，并制造了 2 次假失败 | 改为**全部条件等待**（`wait` 谓词 + `at` 仅作超时上限），每次截图记录实测到的 step/mode |
| M4 | 6 处装饰性手写像素位移（±10/-6/4/8/-1px）与铁律 2 字面冲突 | 全部提为 `--nudge-*` / `--scale-enter` 令牌 |
| M5 | Execute 在 `done` 后永久禁用，只能靠 Replay 逃出 | 改为 `attackState === 'showing-tx' \|\| 'running'` 时才禁用 |
| M6 | 铁律 2 **未被机器校验**（评审用变异测试证明：硬编码但数值正确可通过）| 新增 `no-hardcoded-pixels.test.ts`：读取 CSS 与 `keyframes.ts` 源码，transform 内出现 px 字面量即失败。该守卫当场抓出 `box-shadow` 的 `6px` 扩散半径 → 提为 `--ring-spread` |
| m1-m9 | 死类 `.attacking`/`.attack-dot--*`、死令牌 `--duration-slow`、死类 `.placeholder`、多余 export、`TOTAL_STEPS` 重复、footer 预留不足 19px、`{'\n'}` 冗余、`aria-controls` 缺失、无 favicon、对比度 | 逐条修掉；`--color-text-tertiary`(2.57:1) 只留给装饰性文字并在令牌处写明，`--color-syntax-comment` 提到 #6E6E73 (5.1:1) |

harness 自身的进程问题也修了：端口按 pid 偏移（避免两个 harness 互相劫持对方浏览器）、CDP 每条命令加超时。

> **更正（第二轮自查）**: 关于 profile 泄漏，第一版"修复"是**不成立的**。原写法只做 `chrome.kill()`（仅对根进程发信号，渲染子进程仍占着 profile 目录），`taskkill /T /F` 虽被调用却**没有 await** —— 删除循环在 2.5s 内重试 5 次全部失败后放弃，而 taskkill 要到 +4s 才真正杀掉进程树。因为时序相关，多数运行"看起来正常"，直到一次干净克隆验证时又漏出一个 `xray-shoot-*` 目录才暴露。
> 现改为：**先 await `taskkill /T /F` 杀整棵树 → 再等 exit → 再删除（10 次重试）**，失败时打印警告而不是静默吞掉。已连跑两次 harness，profiles 0 / chrome 进程 0。

**修复后的独立行为验证（CDP 实测，8/8 通过）** —— 前一轮评审只能靠读代码判断的几条，这里改成实测：

| 检查 | 实测结果 |
|---|---|
| Execute 在交易卡片停留期间禁用 | `disabled=true` ✅ |
| **M5** 攻击结束后 Execute 自动恢复（不切 toggle、不 Replay） | `disabled=false` ✅ |
| **m4** 结果与 Verify 按钮出现时层叠不位移 | `.layers-container` top **83 → 83** ✅（180px 预留修掉了原先的 19px 跳动） |
| 再次按 Execute 能真的发起第二次攻击 | 交易卡片重新出现 ✅ |
| **M2 回归** 降级动画下仍能走到第 5 步 | ✅ |
| **M2 回归** 降级动画下攻击仍会**结束**（0.01ms 时 `onAnimationEnd` 是否还触发） | 点击后 **1235ms** 出结果（1200ms 停留 + 瞬时动画），未卡死 ✅ |
| **M2 回归** 降级动画下结论文案正确 | "Attack Successful" ✅ |
| **M2 回归** 降级动画下圆点被清理 | ✅ |

**对修复本身的证伪（防止"修了个假绿"）:**

| 守卫 | 证伪手段 | 结果 |
|---|---|---|
| 控制台错误门禁 (C1) | 故意 `console.error` 后再跑 harness | 门禁 FAIL，退出码 1 ✅ |
| 淡出断言 (C2) | 删掉 88% 帧的 `;opacity:1` | 断言 FAIL，算出 0.5106 ✅ |
| 源码级坐标守卫 (M6) | 往 CSS / `keyframes.ts` 写死 `translateY(40px)` 类数值 | 当场抓出（真实抓到 `box-shadow` 的 `6px`）✅ |
| harness 的 `expect` 机制 | 把期望串改成 `'Attack SuccessfuX'` | FAIL 并打印实际文本，退出码 1 ✅ |
| 铁律 1 探针 | 用 `cloneNode` 替换一个层卡片节点 | 探针报 `REMOUNTED` ✅ |
| 视频空盒不变量 | **`vite preview` 对缺失的 .mp4 返回 `200 text/html`（SPA fallback）** | 仅用 `response.ok` 会误判为"文件存在"，故加 `content-type: video/*` 判定 ✅ |

生产构建（`vite preview`，带 SPA fallback 的静态托管）与 dev server 均跑通全流程：选择器零缺失、console 干净、铁律 1 全部成立。

**交付完整性**: 从零克隆（`git clone` → `npm ci` → `npm test` → `npm run build` → 跑 harness）43 个文件、48 测试、25 步全流程通过，证明交付物自包含、不依赖任何未提交状态。

**人眼验收材料（提前为 Phase 4 备好）**: `docs/screenshots/walkthrough.mp4` —— 28.6s / 1920×1080 / 30fps / 0.64MB，覆盖漏洞版攻击、修复版拒绝、证据面板全流程。由 `tools/record.mjs` 生成：走 CDP `Page.startScreencast` 抓页面自身的合成输出（无窗口边框、无桌面干扰），并用与 harness 相同的状态谓词驱动流程（视频不会与真实状态脱节），帧按到达时间戳重采样成恒定帧率（screencast 只在重绘时出帧，直接回放会忽快忽慢）。

> 这同时解决了两件事：CHECKPOINT 2 要求的"人眼验收"不再需要你本地起服务；Phase 4 的 `demo.mp4` / `demo-verify.mp4` 有了可重复执行的录制工具（本机已有 ffmpeg），而不是手工录屏。注意 `walkthrough.mp4` **不是**提交用的最终 `demo.mp4` —— 后者按计划还要包含 Phase 3 的 Devnet 真实交易证据。

### CHECKPOINT 2 复审(first FAIL)与二次复审(仍 FAIL 1 条，已修)

第一次复审 `FAIL (2 critical)` —— C1/C2/M1/M2 修复后，第二次复审确认 **C1、C2、M1、M2、M3、M4、M5 全部 VERIFIED**（并用 CDP 实测：修复版两次撞击点 opacity 均为 **1.0000**，此前是 0.207；降级动画下 11 行代码全部 opacity 1；不可满足的谓词会 53s 内失败而非挂死）。

但第二次复审抓到**一个我自己引入的 Critical**，且正是本次评审存在的意义：

| 问题 | 真相 | 修复 |
|---|---|---|
| **M6 的 CSS 一半是"不可能失败"的检查** | Vitest 默认 `css: false` 会把 `import.meta.glob('*.css', {query:'?raw'})` 解析成**空字符串**。守卫拿到了 3 个 key、内容全是空的，于是读了个寂寞还照样通过——把 `translateY(40px)` 写进样式表也 PASS。而"非空转"断言只数 key 个数，同样被骗过 | `vite.config.ts` 加 `test: { css: true }`；并把断言从"数 key"改成**校验内容**（每个文件长度 > 0、总长 > 1000、必须含 `.layer-card`、生成器必须含 `@keyframes`）。**已证伪：注入 `translateY(40px)` → 守卫 FAIL 并打印 `"../animations.css -> transform(… 40px …)"`；撤回后 48 绿** |
| verify-panel 不变量靠 sleep 成立 | 点击后约 20ms 内面板存在但两个子元素都没有——正是它该拒绝的状态，却因为它有 600ms 的 `after` 而通过 | 把"或"条件本身写成 `wait` 谓词，`after` 只作为截图前的稳定延时 |
| 降级动画仍保留 `transition-delay` | 只覆盖了 duration，150ms×index 的散开仍逐个显形（300ms 时 3/5 可见） | 补 `transition-delay: 0ms !important`。**实测 120ms 时 5 张卡 opacity 全为 1.00** |
| `node tools/shoot.mjs` 在 PATH Node 20.10 上崩 | 全局 `WebSocket` 需要 Node ≥ 22；`engines` 允许 20.10，README 只写了 harness 要 22 | 脚本开头显式检测并打印可操作提示（应用只要 20.10，只有该 harness 要 22） |
| 门禁会把 harness 自己注入的 helper 异常当成应用错误 | `Runtime.exceptionThrown` 无法区分来源 | `PAGE_HELPERS` 整体包 try/catch，helper 自己永不抛出（helper 缺失时下面的 wait 会大声失败，而不是伪装成应用报错） |

同时更正了 `opacityAt()` 注释里的过度声明：它只理解 `at()` 产出的 `N%{prop:value}` 形状，**不是** CSS 语义模型（看不见 `to{}` 关键字帧、忽略 `opacity: 0` 带空格/`.5`、且假定首帧前 opacity 为 1）。渲染结果的把关交给 harness 的浏览器实测，而不是这个纯函数。

**教训（值得记住）**: 这轮里"加一个守卫"本身引入了两次假绿——先是一个永远为真的断言，后是一个读空文件的守卫。**新增任何检查后，必须先让它失败一次**，否则不知道它是否真的在检查。

### 第三次检查：守卫是否真的会失败 —— ✅ PASS

复审的唯一问题是"这个守卫能不能失败"，答案是可以，且证据齐全：

| 变异 | 结果 |
|---|---|
| 往样式表写 `transform: translateY(40px)` | **FAIL** 并指名文件 |
| 往 `keyframes.ts` 写 `'40px'` | **FAIL** |
| **撤掉 `css: true`**（即上一版假绿的确切状态） | **FAIL**：`expected [ '../animations.css', …(2) ] to deeply equal []` |
| glob 匹配不到任何文件 | **FAIL**：`expected 0 to be greater than or equal to 3` |

同时确认五项跟进项全部 VERIFIED（含：降级动画下 5 张卡在 **15ms** 内全部 opacity 1，而对照组确实逐个显形；harness 跑完 0 个残留 profile、0 个残留 chrome 进程）。

**但它同时演示了四个仍然逃逸的形状**（48/48 依然全绿）：`translate3d`（regex 没覆盖 3D/matrix）、非 `transform` 属性（`top/left`）、以及自定义属性间接引用（`--shift: translateY(40px)` + `transform: var(--shift)`）。这四条已修：

- 变换函数表补齐 `translate3d` / `matrix` / `matrix3d` / `perspective` / `rotate3d` / `scale3d` 等
- 扫描范围从"只看 `transform:` 声明"改为**扫描所有声明**，间接引用因此可见
- 新增**检测器自测**（4 条）：把上述逃逸形状逐个喂给匹配器，断言它抓得到；同时断言纯令牌值（`--nudge-enter: 10px`）不会被误判
- **已证伪**：把 `translate3d(0, 40px, 0)` 与 `--xray-escape-x: translateY(40px)` 同时注入样式表 → 两条都被抓出（`transform(… 0, 40px, 0 …)`、`transform(… 40px …)`），退出码 1

未覆盖范围已写进代码注释与 README（非 transform 属性上的静态 chrome 像素、TSX 内联 style），并说明为何这个scope足够：层级与攻击坐标系**完全**基于 transform。

### 顺带验证：Phase 4 的链接分支（此前从未被执行过）

复审曾指出 `TBD` 值下渲染出的 `<a>` 数量为 0，即"有值 → 渲染 Solscan 链接"这条分支从未被跑过。临时填入看起来真实的 Devnet 值后实测：3 条链接全部正确渲染，href 为 `https://solscan.io/account/<id>?cluster=devnet` 与 `https://solscan.io/tx/<sig>?cluster=devnet`，且带 `target="_blank"` 与 `rel="noreferrer"`；5 行全部显示真实值，仅剩 1 个 `.verify__pending`（视频占位）。随后已还原为 `TBD` 占位。**Phase 4 的接线是通的。**

---

## 5b. 结构重构：从"抽象五层"改为"一条指令的执行顺序"

**触发**: 用户质疑"这个五层结构是不是没那么好"。复查后确认不是"不够好"，而是**把漏洞画错了地方**。

### 原五层的四个硬伤

1. **五个层不是同一类东西。** Instruction 是代码结构、Account State 是数据、Access Control 与 Business Logic 是**关注点**、Runtime 是平台。TCP/IP 成立是因为每层都是同一类对象；这里是五个范畴被并排摞起来。
2. **顺序不对应执行顺序。** `ctx.accounts.vault` 是入参、先进来；`require!` 再查；然后才改余额。但圆点按 L5→L4→L3→L2→L1 掉，而 L1（Runtime）根本不是被穿透的东西，它是容器。
3. **最严重：裂缝画在 L3，修的地方在 L1。** 主计划 3.4 的修复是 `Withdraw.authority: Signer<'info>` —— 改的是**账户声明**，也就是旧模型里的 L1。模型说"错在检查"，实际"错在声明"。在 Solana 上 `Signer<'info>` vs `AccountInfo<'info>` 就是漏洞本身。
4. **TxCard 已经用了对的模型。** 那张 accounts/signatures 表里 `ADMIN ✗` 是真实字段；页面上同时存在两套互相打架的说法。

### 参考的主流做法

- [Surya / Slither / sol2uml](https://tryethernal.com/blog/smart-contract-visualization-tools-audit)：调用图、继承图、状态变量图——画的是**真实拓扑**。原文："the bug does not live in any single line. It lives in the topology."
- [Tenderly](https://docs.tenderly.co/debugger/execution-overview)：执行概览/调用树，**按执行顺序**。
- [sec3 X-Ray](https://github.com/sec3-product/x-ray)：Solana 静态分析，输出账户与约束。
- **Solana Explorer / SolanaFM**：一个 instruction 的展示就是"指令 + 账户表"，`signer?` / `writable?` 是**列**。

结论：Solana 生态最通用的可视化本身就是"带 signer 列的表"，不是层叠。

### 新结构（用户选择"A+B 融合"）

| id | 名称 | 代码（漏洞版） | 角色 |
|---|---|---|---|
| S1 | Instruction / 指令 | `withdraw(ctx, amount: 500)` | 调了什么 |
| S2 | Accounts / 账户 | `vault · authority` | 交给了谁 |
| S3 | **Account Declaration / 账户声明** | `authority: AccountInfo<'info>` | 声明要求什么 ★漏洞 |
| S4 | Manual Check / 手工校验 | `require!(vault.authority == authority.key())` | 代码自己查什么 |
| S5 | State Change / 状态变更 | `vault.balance -= amount` | 写了什么 |

- **裂缝从 S4 移到 S3**：修复版 `S3` 的代码行变成 `authority: Signer<'info>`，badge 由 `⚠️ 未要求签名` 变 `🔒 要求签名`（新增 `codeWhenFixed` 字段支持同一张卡按版本换代码）。
- **修复版在 S3 就被拦下**，S4/S5 根本不执行 —— 这正是 Anchor 的真实行为：账户校验发生在 handler 之前。
- **S3 与 S4 构成"声明式 vs 命令式"的对照**，这是 Solana 最该教也最容易讲错的一点。
- **step 2 代码列表补上 `#[derive(Accounts)]`**（18 行）。原列表只有 handler body，**把漏洞所在的那一行藏起来了**。新增回归测试断言列表必须包含账户声明且位于 `#[program]` 之前。
- `SECURITY_INDEX` 仍为 2，`geometry.ts` 与动画管线完全未改（仍是 5 张等高卡、同一套散开/层叠/关键帧）。

### 顺带修掉的 harness 缺陷

重构后 harness 报 `IRON RULE 1 VIOLATED ... REMOUNTED`，实为**误报**，暴露了两个真问题：

1. 我在第 2 步的等待谓词里写死了**旧的英文注释文本**；文本改了之后该 wait 超时 20s，而超时后会 `continue` 跳过动作——于是 `tagCards` 从未执行。
2. `checkCards` 在 `window.__xrayCards` 未定义时，把"从未打过标记"误报成"节点被重建"。**两者含义完全不同**：前者证明不了任何事。

已修：`checkCards` 先判断基线是否存在，缺失时单独报 `NO TAG -- tagCards never ran`，harness 把它归为"基线缺失"而非"铁律违反"。另更新了所有写死的旧文案断言。

### 尚未覆盖

- 中英对照的层名断言已更新为 `账户声明 Account Declaration`，但**中文模式下 step 1 标题**仍无端到端断言（终态时该屏已卸载）。
- 录屏脚本的语法段仍以英文注释文案为等待条件，已同步更新为 `This is the bug`。

---

## 5. 追加需求：中英双语（原计划未包含）

**需求（用户 2026-10-10 追加）**: 初始英语；右上角可切换中英；英语版英文注释、中文版中文注释；层名中英对照；链上标识符保持英文原样；**并删除 `01 / 05` 步进指示器**。

### 架构

| 单元 | 职责 |
|---|---|
| `src/i18n/messages.ts` | `Language`、`Messages` 接口、`MESSAGES: Record<Language, Messages>`、`bilingualName()`、`LANGUAGES` |
| `src/i18n/language.ts` | Context 对象 + `useLanguage()`（无 JSX，避开 react-refresh 的 only-export-components 规则）|
| `src/i18n/LanguageProvider.tsx` | 持有当前语言；同步 `<html lang>`；**不做持久化** |
| `src/components/LanguageToggle.tsx` | 右上角 `EN │ 中文` 分段控件 |

**核心保证**: 两种语言实现同一个 `Messages` 接口，因此**漏翻一条 = 编译错误**（`tsc -b` 直接失败）。类型管不到的部分（空值、值其实还是英文）由 `messages.test.ts` 兜。

**不翻译的**: `vault` / `authority` / `ATTACKER` / `ADMIN` / `accounts:` / `signatures:` —— 这些是真实交易里的字段名与标识符，翻掉会让 Demo 与 Solscan 上看到的东西对不上。只翻旁边的旁注。

### 关键决策

- **不持久化**（用户选择）: 每次打开都是英语，舞台上不会出现上次遗留的语言。
- **层名中英对照**（用户选择）: 英文模式只显示 `Access Control`；中文模式显示 `访问控制 Access Control`，英文部分用 `--color-text-tertiary` 弱化。由 `bilingualName()` 返回 `{primary, secondary}`，中文副名直接取英文词条，**不重复写一遍英文**（英文改了中文会自动跟上）。标签列由 180px 放宽到 210px，否则 `业务逻辑 Business Logic` 会被 `nowrap` 截断。
- **代码列表抽到 `src/lib/code.ts`**: `CodeLine = {code} | {comment, indent}`，`codeLines(language)` 是纯函数。这样"代码本身与语言无关、只有注释变"成为结构上的事实，而不是约定。
- **删除步进指示器**: 原任务 2.1 要求渲染 `data-testid="step-indicator"`。指示器被移除后，当前步骤改由 `.app` 上的 `data-step` 暴露（机器可读，且不占用视觉）。harness 的 `__xray.step()` 随之改为读 `data-step`。
- **`config/layers.ts` 形状变更**: `name: string` → `nameKey: LayerNameKey`。这是对主计划"层级由数据驱动"那份配置的改动，已在此记录。

### 三层验证（重点是"有没有漏翻"）

1. **编译期**: 接口保证两语言键集一致
2. **源码守卫** `no-hardcoded-copy.test.ts`: 扫描 `components/*.tsx` 与 `App.tsx`，发现写死的 JSX 文本或 `aria-label="..."` 即失败。允许清单只有 `→` 与两个链上字段名。**已证伪**: 往 `FixToggle.tsx` 注入 `<span>Forgot To Translate</span>` → FAIL 并指名道姓。
   - 该守卫第一版有 3 个假阳性——`useState<Step>(1)` 这类 TS 泛型会在两个 `<`/`>` 之间圈出整段代码。已加"含代码字符即不算文案"的过滤，并补了检测器自测。
3. **端到端** `tools/shoot.mjs`: 在第 2 步切中文并断言代码卡片出现中文注释；在终态切中文并断言 13 个英文串**全部消失**、9 个中文串**全部出现**、且层名保持 `运行时 Runtime` 中英对照；再切回英文并断言没有中文残留、英文完全恢复。

### 尚未覆盖（诚实记录）

- 中文模式下第 1 步标题（`什么是智能合约？`）没有单独的浏览器断言 —— 该状态在终态断言时已被卸载。它由源码守卫 + 单元测试覆盖，但没有端到端断言。
- 源码守卫只看 JSX 文本节点与 `aria-label`；写在 TS 常量里的用户可见字符串（如 `LANGUAGES` 的 `EN`/`中文`，属**故意**用母语标注）不在扫描范围。

---

## 4. 风险

| 风险 | 处置 |
|---|---|
| Step 3→4 切换重建 DOM，动画断裂 | GAP-2 契约；调试时先查 DOM 是否重建，不在现象层打补丁 |
| 动画时序用 sleep 赌 | 条件等待 `onAnimationEnd`；仅 TxCard 的 1200ms 是编排节奏例外 |
| 令牌写错导致全站观感偏 | GAP-1 固定取值，CHECKPOINT 2 人眼验收 |
| Phase 3 环境风险 | 本阶段完全不碰 WSL2/Anchor，前端在 Windows 原生 Node 完成 |
