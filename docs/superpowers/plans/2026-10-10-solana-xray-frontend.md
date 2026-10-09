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

### CHECKPOINT 2 — ✅ PASS（首轮 FAIL，已修复后重验）
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

---

## 4. 风险

| 风险 | 处置 |
|---|---|
| Step 3→4 切换重建 DOM，动画断裂 | GAP-2 契约；调试时先查 DOM 是否重建，不在现象层打补丁 |
| 动画时序用 sleep 赌 | 条件等待 `onAnimationEnd`；仅 TxCard 的 1200ms 是编排节奏例外 |
| 令牌写错导致全站观感偏 | GAP-1 固定取值，CHECKPOINT 2 人眼验收 |
| Phase 3 环境风险 | 本阶段完全不碰 WSL2/Anchor，前端在 Windows 原生 Node 完成 |
