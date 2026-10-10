# 层叠 → 流程：九页重排 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把演示从「五张卡片垂直层叠」改成「九页叙事，第四页把合约拆成一条从上到下的流程」，并让「缺失的那一格」成为看得见的缺口。

**Architecture:** 复用现有的几何 / 关键帧 / 圆点机制（它们本来就不依赖「层」这个隐喻，只依赖**一串有序的 y 坐标**）。真正替换的只有布局 CSS 与页面序列。第四页的拆解动画沿用现有的散开→收拢时序，只是排布从「层叠」改为「流程」。

**Tech Stack:** Vite 6 · React 18 · TypeScript 5.8 · Vitest 3.2 · 纯 CSS（无动画库、无 UI 库）。

**设计稿（已获批准）：** `docs/mockup/prism-flow.html` —— 九页的静态样子，实现时以它为准。

**盘点的关键结论（来自对现有代码的实测，不是假设）：**
- `lib/geometry.ts` 只有**固定间距**是「层叠专属」的；其余函数换成「每格高度不同」只是一行改写。
- `lib/keyframes.ts` 的圆点路径由 `VAULT_LAYERS.map((_, i) => layerMidY(i))` 生成——**是一串 y 坐标，不是层的语义**。喂节点坐标即可，√距离采样与单调下降不变量都不用动。
- 「第 3–5 步共用同一批 DOM」由三处结构性保证（`App.tsx` 的 `step >= 3` 单次挂载、`ContractLayers.tsx` 的稳定 keyed 列表、`LayerCard.tsx` 的注释）。**流程布局能保住**：连线是新增兄弟元素。
- `AttackState`（`idle|showing-tx|running|done`）与页码正交，**原样存活**。

---

## 文件结构

**新建**

| 文件 | 职责 |
|---|---|
| `frontend/src/components/FlowNode.tsx` | 流程里的一格。从 `LayerCard.tsx` 改写 |
| `frontend/src/components/VaultIntro.tsx` | 第 3 页：「这是金库」+ 一次正常取钱 |
| `frontend/src/components/FillAddress.tsx` | 第 5 页：把管理员地址填进 authority |
| `frontend/src/components/WhyItHappens.tsx` | 第 7 页：以太坊 vs Solana |
| `frontend/src/components/TheFix.tsx` | 第 8 页：改一行（diff） |
| `frontend/src/components/RetryRefused.tsx` | 第 9 页：同一笔再打一次，被拒 + 两版并排 |

**修改**

| 文件 | 改动 |
|---|---|
| `frontend/src/lib/steps.ts` | 页码 `1..5` → `1..9`；新的 `AUTO_ADVANCE_MS` |
| `frontend/src/lib/geometry.ts` | 固定间距 → 每格高度可变；新增连线高度 |
| `frontend/src/config/layers.ts` | `scatter{x,y}` 换成流程需要的字段；新增每格的「谁执行」标签（`你`/`运行时`/`代码`） |
| `frontend/src/components/ContractLayers.tsx` | 层叠 → 流程；新增连线元素；改名 `ContractFlow` |
| `frontend/src/styles/animations.css` | 层叠布局换成流程布局；保留 `.attack-dot` |
| `frontend/src/App.tsx` | 九页门控；`layersMode` 的页码耦合 |
| `frontend/src/i18n/messages.ts` | 新页面的中英文案 |

**删除**

- `frontend/src/components/LayerCard.tsx`（被 `FlowNode.tsx` 取代）
- `frontend/src/components/FixToggle.tsx` —— 新流程里漏洞/修复由**页序**表达（第 8 页是修复），不再需要开关

---

## Phase A — 骨架（页面序列 + 流程布局）

### Task A1: 页码 1–5 → 1–9

**Files:** `lib/steps.ts`, `App.tsx`, `lib/__tests__/steps.test.ts`

- [ ] 把 `Step` 联合类型 `1|2|3|4|5` 扩到 `1..9`；`FINAL_STEP = 9`。
- [ ] `AUTO_ADVANCE_MS` 只覆盖**自动播放的页**：1(标题)、2(合约)、3(金库介绍)、4(拆解)。第 5 页起全部手动。
- [ ] `App.tsx` 里两处页码耦合改成新页码：`layersMode` 的推导（原 `step >= 4 / step === 3`）与控件门控（原 `step === 5`）。
- [ ] **`AttackState`、`AttackOutcome`、`attackOutcome`、`TX_CARD_MS` 一律不动** —— 它们与页码正交。
- [ ] 测试：`nextStep` 走到 9 停；`AUTO_ADVANCE_MS` 里 5–9 是 `undefined`。
- [ ] 提交。

### Task A2: 几何 —— 固定间距 → 每格可变

**Files:** `lib/geometry.ts`, `lib/__tests__/geometry.test.ts`

- [ ] 现状：`layerTopY(i) = i * (LAYER_HEIGHT + LAYER_GAP)`，间距固定 72。
- [ ] 改成：从 `config/layers.ts` 读每格高度（也许还有额外留白），逐格累加。
- [ ] **保留所有函数名与签名**（`layerTopY` / `layerMidY` / `stackHeight` / `blockedY` / `dropStartY`）—— 圆点的关键帧只认这些，不改名就没有连锁改动。
- [ ] 测试：固定数值断言要按新高度重算。**先跑一次看它红**，再改数——这是确认测试真的在测几何。
- [ ] 提交。

### Task A3: 布局 —— 层叠 → 流程

**Files:** `components/ContractLayers.tsx` → `ContractFlow.tsx`，`components/LayerCard.tsx` → `FlowNode.tsx`，`styles/animations.css`

- [ ] 卡片之间插入**连线元素**（新兄弟节点，不碰卡片本身）。
- [ ] `FlowNode` 增加一行「谁执行」标签：`你` / `运行时` / `代码`。数据来自 `config/layers.ts` 的新字段。
- [ ] **保住 DOM 铁律**：同一个组件实例横跨第 4–9 页；列表 keyed by `layer.id`；`mode` 只换 className 与 `--x/--y`。
- [ ] `animations.css`：删掉 `.layers-container` / `.stacked` / `.layer-card` 那套布局；**保留 `.attack-dot`（约 210–232 行）**；`crack-draw` 的思路保留但改成「空框」（虚线、无填充）。
- [ ] 遵守 `styles/__tests__/no-hardcoded-pixels.test.ts`：transform 参数里不许出现 px 字面量。
- [ ] 提交。

### Task A4: 走查跟上

**Files:** `tools/shoot.mjs`

- [ ] 探针选择器 `.layer-card` → 新的节点类名。
- [ ] 页码断言跟上九页。
- [ ] **实测跑绿**，不假设。

### ✅ CHECKPOINT A
- [ ] `npm test` 绿 · `npm run build` 过 · `tools/shoot.mjs` 绿
- [ ] 人眼：第 4 页是**流程**而不是层叠，连线在，圆点沿流程走

---

## Phase B — 九页内容

### Task B1: 第 3 页 —— 这个合约是干什么的

**Files:** 新建 `components/VaultIntro.tsx`，`i18n/messages.ts`

- [ ] 先用大白话讲：**这是一个金库。有人把钱放进去，只有他能取出来。**
- [ ] 然后演一次**正常取钱**：管理员签名 → 运行时检查 → 代码比对 → 成功。
- [ ] 复用 `ContractFlow` 的节点渲染（同一种视觉语言），但数据是「正常一次」而非「攻击」。
- [ ] 文案中英各一份（`messages.test.ts` 会强制键集一致、中文含中文）。
- [ ] 提交。

### Task B2: 第 5 页 —— 填地址

**Files:** 新建 `components/FillAddress.tsx`，`i18n/messages.ts`

- [ ] 核心画面：`authority: [？？？]` → **填上 `DMkwnXZ6…GU7T`**。
- [ ] 一句关键话：**这个地址在链上人人可见。公钥从来不是秘密。**
- [ ] 对照：平时需要管理员的**私钥**；现在只需要他的**地址**。
- [ ] **用词纪律**：这不是「篡改」，是「填上」。攻击者没有伪造任何东西。
- [ ] 提交。

### Task B3: 第 4 页的拆解动画

**Files:** `components/Step2Code.tsx`, `components/ContractFlow.tsx`, `styles/animations.css`

- [ ] 用户的明确要求：「拆解代码的时候来个动画」。
- [ ] 从第 3 页**过渡**到第 4 页：合约代码里的区域被框出 → **飞向流程节点的位置** → 落成节点。
- [ ] 沿用现有的散开/收拢时序（`REVEAL_START`/`REVEAL_STEP`、`--reveal-at`），只是目标位置从「层叠」改成「流程」。
- [ ] 动画在**第 4 页中途**发生，拆到第 2 格（运行时验证）时**停一下**并把这一格讲清楚。
- [ ] 提交。

### Task B4: 第 7、8、9 页

**Files:** 新建 `WhyItHappens.tsx` / `TheFix.tsx` / `RetryRefused.tsx`，`i18n/messages.ts`

- [ ] **第 7 页**：Solidity 的 `require(msg.sender == owner)` vs Rust 的 `require!(...)`，并排。结论句照设计稿：
      > 以太坊里，「你是谁」是协议告诉你的。Solana 里，「你是谁」得你自己要求。
- [ ] **第 8 页**：一行 diff —— `AccountInfo<'info>` → `Signer<'info>`。点明：**漏洞不在那行 `require!`，在那行声明。**
- [ ] **第 9 页**：同一笔攻击打修复版 → 圆点撞在第 2 格 → 交易被拒 → 两版并排表。
- [ ] 三页都复用 `ContractFlow` 的节点视觉，保证同一种语言。
- [ ] 提交。

### ✅ CHECKPOINT B
- [ ] `npm test` 绿 · `npm run build` 过 · `tools/shoot.mjs` 绿
- [ ] 人眼：九页从头走到尾，节奏不断
- [ ] 人眼：第 6 页真的发出一笔链上交易；第 9 页真的被拒

---

## 测试与守卫

- `lib/__tests__/geometry.test.ts` —— 数值断言要按新高度重算
- `lib/__tests__/keyframes.test.ts` —— 锚点必须出现、单调下降；**不许为了让测试变绿而放松它**
- `styles/__tests__/no-hardcoded-pixels.test.ts` —— transform 里不许有 px 字面量
- `i18n/__tests__/messages.test.ts` —— 键集一致、中文含中文、`{cluster}` 模板
- `components/__tests__/no-hardcoded-copy.test.ts` —— 组件里不许有硬编码文案
- `tools/shoot.mjs` —— 铁律、选择器、console 无错

## 不做

- 不改合约、不重新部署
- 不改 `lib/devnet.ts` / `lib/demoAttack.ts` / `lib/solanaChain.ts`（真实攻击那套原样不动）
- 不改 `TxCard` / `VerifyPanel` / `ClosingNote`
- 不做移动端适配
