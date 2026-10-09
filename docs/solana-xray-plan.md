# Solana Contract X-Ray — Superpowers 实施计划 (v4 · 前端先行)

> **本文档遵循 Superpowers 工程方法论**: 隔离工作区 → 任务级计划(含完整代码与验证) → TDD(先红后绿) → 子代理派发 → 两段式评审 → 收尾。
>
> **v4 关键决策(已与用户确认)**:
> - **前端先行**: 前 10 小时零环境风险(纯 Node, Windows 原生), CHECKPOINT 2 时 Demo 已可独立提交
> - **链上程序为强制要求, 不可砍**, 但可降配: 保底只部署漏洞版一个合约
> - **TDD 范围**: 合约攻击测试 + geometry/steps 测试; 砍 layers 校验测试; CSS 动画不测(人眼 CHECKPOINT)
> - **交易卡片**(v4 新增, 修最大问题): 攻击动画前先展示交易负载 — 管理员地址在场、管理员签名缺席, 这是漏洞的本质一眼可见
>
> **给编排者(主代理)**: 每任务派全新上下文子代理, 附任务全文 + G 节评审要求; Phase 间 CHECKPOINT 不过不进下一步; 计划变更必须回来改文档。

---

## A. 设计文档(已确认规格)

**项目**: Solana Contract X-Ray — Apple 风格交互网页。把 Anchor 合约动画拆解为层级结构(TCP/IP 风格), 教学 Missing Signer Check, 再用 Devnet 真实交易验证。层级数据驱动。

**演示流程(6 步)**:
1. 标题「What is a smart contract?」淡入淡出 (3s, 自动)
2. 合约代码卡片, 手动语法高亮 (4s, 自动)
3. 代码拆解为 5 张卡片飞出散开 (5s, 自动)
4. 卡片重排为垂直层叠, 右侧层名标注, L3 红色虚线"裂缝" (5s, 自动)
5. 攻击演示(手动点 Execute):
   a. **先弹出交易卡片**(v4 新增, 停留 ~1.2s):
      ```
      ┌─ Transaction ─────────────┐
      │ accounts:                 │
      │   vault:     7xK…9mP      │
      │   authority: ADMIN_ADDR   │ ← 管理员地址在场
      │ signatures:               │
      │   ATTACKER ✓              │
      │   ADMIN    ✗              │ ← 管理员签名缺席 = 漏洞本质
      └───────────────────────────┘
      ```
   b. 圆点从卡片底部掉落下落; Vulnerable: 穿透 L3 → "Attack Successful"; Fixed: 被 L3 挡回 → "Transaction Rejected"
6. 链上验证面板(手动): 真实交易签名 + Solscan 链接 + 预录视频 fallback

**技术栈(不可更换)**: Vite + React 18 + TS / 纯 CSS + CSS 变量 / CSS transitions+keyframes / Vitest / Anchor(Rust) / Vercel。禁用: Tailwind, 动画库, UI 库, 状态管理库, 语法高亮库。

**铁律(评审 Critical 项)**:
- Step 3/4/5 共用 `ContractLayers` 同一批 DOM, 只切 className, 拆组件 = 打回
- 动画坐标只能来自 `geometry.ts`, CSS 手写像素 = 打回
- 层叠每层固定高 64px, gap 8px

---

## B. 执行策略: 前端先行

```
Phase 0  工作区(纯前端, Windows 原生)        0.5h
Phase 1  前端逻辑 TDD (geometry + steps)     1.5h
Phase 2  前端 UI (6 步全做完)                 8h
═══════ CHECKPOINT 2: Demo 完整, 此刻已可提交 ═══════
Phase 3  合约 TDD + Devnet 部署取证           5.5h (含 WSL2 环境 1h)
Phase 4  汇合: 填证据 + 部署 + 录屏 + 提交     2.5h
Buffer                                        1.5h
                                              ─────
                                              ~20h
```

**降级路径(时间不够时, 从 1 开始砍)**:
1. Step 6 面板 → Solscan 链接只进 README
2. Fixed UI 路径 → 只演示攻击成功
3. Step 3 散开 → 代码直接淡入层叠
4. Step 1 标题
- **保底不可砍**: 层叠 + 交易卡片 + 漏洞版攻击动画 + 漏洞版合约部署 + 攻击交易证据
- (注: "只部署漏洞版合约"在 v4.1 已转为默认方案, 不再是降级项)

---

## C. Phase 0 — 隔离工作区(纯前端, 0.5h)

### 任务 0.1: 仓库与隔离分支
- 执行:
  ```bash
  mkdir solana-xray && cd solana-xray
  git init && git checkout -b feat/xray
  ```
- **验证**: `git branch --show-current` 输出 `feat/xray`

### 任务 0.2: 前端脚手架 + Vitest 基线
- 执行:
  ```bash
  npm create vite@latest frontend -- --template react-ts
  cd frontend && npm install && npm install -D vitest
  ```
- `frontend/package.json` scripts 加 `"test": "vitest run"`
- 新建 `frontend/src/lib/__tests__/smoke.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  describe('baseline', () => {
    it('test runner works', () => { expect(1 + 1).toBe(2); });
  });
  ```
- **验证**: `npm test` 1 passed(基线绿); `git add -A && git commit -m "chore: scaffold"`

### 任务 0.3: 全局样式令牌
- **文件路径**: `frontend/src/styles/global.css`(新建), 写入完整设计令牌(与 v3 相同: font stacks, --color-*, --ease-apple, --duration-*, --shadow-card, --radius-card, reset, body 样式)
- `main.tsx` 顶部 `import './styles/global.css';`
- **验证**: `npm run dev` 无报错, 背景纯白; 提交

> **注意**: 本阶段不碰 WSL2/Anchor。前端全部工作在 Windows 原生 Node 完成。

---

## D. Phase 1 — 前端逻辑 TDD(1.5h)

### 任务 1.1(RED→GREEN): geometry 库
- **测试先行** `frontend/src/lib/__tests__/geometry.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { LAYER_HEIGHT, LAYER_GAP, layerMidY, layerTopY, stackHeight, blockedY } from '../geometry';

  describe('geometry', () => {
    it('常量', () => { expect(LAYER_HEIGHT).toBe(64); expect(LAYER_GAP).toBe(8); });
    it('layerTopY', () => { expect(layerTopY(0)).toBe(0); expect(layerTopY(2)).toBe(144); });
    it('layerMidY', () => {
      expect(layerMidY(0)).toBe(32); expect(layerMidY(1)).toBe(104);
      expect(layerMidY(2)).toBe(176); expect(layerMidY(4)).toBe(320);
    });
    it('stackHeight(5)', () => { expect(stackHeight(5)).toBe(352); });
    it('blockedY: 被第 i 层挡住时圆点停留 y(层顶上方 8px)', () => { expect(blockedY(2)).toBe(136); });
  });
  ```
- `npm test` → **RED**(模块不存在) → **实现** `frontend/src/lib/geometry.ts`:
  ```typescript
  export const LAYER_HEIGHT = 64;
  export const LAYER_GAP = 8;
  export function layerTopY(index: number): number {
    return index * (LAYER_HEIGHT + LAYER_GAP);
  }
  export function layerMidY(index: number): number {
    return layerTopY(index) + LAYER_HEIGHT / 2;
  }
  export function stackHeight(count: number): number {
    return count * LAYER_HEIGHT + (count - 1) * LAYER_GAP;
  }
  export function blockedY(index: number): number {
    return layerTopY(index) - 8;
  }
  ```
- **验证**: `npm test` 绿 → 提交

### 任务 1.2(RED→GREEN): steps 状态机
- **测试先行** `frontend/src/lib/__tests__/steps.test.ts`:
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { AUTO_ADVANCE_MS, nextStep, attackOutcome, TX_CARD_MS } from '../steps';

  describe('steps', () => {
    it('nextStep 推进, 5 后 null', () => {
      expect(nextStep(1)).toBe(2); expect(nextStep(4)).toBe(5); expect(nextStep(5)).toBeNull();
    });
    it('Step1-4 自动推进, Step5 手动', () => {
      expect(AUTO_ADVANCE_MS[1]).toBe(3000); expect(AUTO_ADVANCE_MS[4]).toBe(5000);
      expect(AUTO_ADVANCE_MS[5]).toBeUndefined();
    });
    it('attackOutcome', () => {
      expect(attackOutcome(false)).toBe('success'); expect(attackOutcome(true)).toBe('rejected');
    });
    it('交易卡片停留时长', () => { expect(TX_CARD_MS).toBe(1200); });
  });
  ```
- **RED** → **实现** `frontend/src/lib/steps.ts`:
  ```typescript
  export type Step = 1 | 2 | 3 | 4 | 5;
  export type AttackOutcome = 'success' | 'rejected';
  export const TX_CARD_MS = 1200; // 交易卡片停留时长(v4 新增)
  export const AUTO_ADVANCE_MS: Partial<Record<Step, number>> = { 1: 3000, 2: 4000, 3: 5000, 4: 5000 };
  export function nextStep(step: Step): Step | null {
    return step < 5 ? ((step + 1) as Step) : null;
  }
  export function attackOutcome(isFixed: boolean): AttackOutcome {
    return isFixed ? 'rejected' : 'success';
  }
  ```
- **验证**: `npm test` 绿 → 提交

### 任务 1.3: layers 配置(纯数据, 不写测试 — YAGNI)
- **文件路径**: `frontend/src/config/layers.ts`, 写入:
  ```typescript
  export interface ContractLayer {
    id: string; name: string; code: string;
    isSecurityLayer: boolean; broken: boolean;
    scatter: { x: number; y: number };
  }
  export const VAULT_LAYERS: ContractLayer[] = [
    { id: 'L5', name: 'Instruction',    code: 'pub fn withdraw(ctx, amount) -> Result<()>',   isSecurityLayer: false, broken: false, scatter: { x: -220, y: -110 } },
    { id: 'L4', name: 'Account State',  code: 'struct Vault { authority, balance }',          isSecurityLayer: false, broken: false, scatter: { x: 220, y: -90 } },
    { id: 'L3', name: 'Access Control', code: 'require!(vault.authority == authority.key())', isSecurityLayer: true,  broken: true,  scatter: { x: -200, y: 70 } },
    { id: 'L2', name: 'Business Logic', code: 'vault.balance -= amount',                      isSecurityLayer: false, broken: false, scatter: { x: 210, y: 90 } },
    { id: 'L1', name: 'Runtime',        code: '#[derive(Accounts)] struct Withdraw',          isSecurityLayer: false, broken: false, scatter: { x: 0, y: 160 } },
  ];
  ```
- **验证**: `npm test` 仍绿; `npm run build` 无 TS 错误 → 提交

### ✅ CHECKPOINT 1
- [ ] `npm test` 全绿(geometry + steps)
- [ ] G 节评审通过

---

## E. Phase 2 — 前端 UI(8h)

### 任务 2.1: App 状态机骨架
- **文件路径**: `frontend/src/App.tsx`
- 状态: `step`(1-5), `isFixed`, `attackState: 'idle' | 'showing-tx' | 'running' | 'done'`
- `useEffect` 按 `AUTO_ADVANCE_MS[step]` 自动推进 1→5; 页面渲染 `data-testid="step-indicator"`
- **验证**: dev 页面数字 1→5 自动变化停在 5 → 提交

### 任务 2.2: Step1Title + Step2Code
- **文件路径**: `frontend/src/components/Step1Title.tsx`, `Step2Code.tsx`
- Step1: 48px/600 居中, opacity 0.8s 淡入; Step2: 代码卡片(背景 `--color-bg-code`, radius 12px, padding 24px, max-width 720px), 手写 token 高亮(关键字红 `--color-syntax-keyword` / 类型蓝 `--color-syntax-type` / 注释灰 `--color-syntax-comment`), 展示精简版 withdraw 代码:
  ```rust
  #[program]
  pub mod xray_vault {
      pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
          let vault = &mut ctx.accounts.vault;
          // 检查 authority 地址是否匹配
          require!(vault.authority == ctx.accounts.authority.key());
          // 但... 没有检查签名!
          vault.balance -= amount;
          Ok(())
      }
  }
  ```
- **验证(人眼)**: 标题 → 代码切换流畅, 三色高亮正确 → 提交

### 任务 2.3: ContractLayers 散开模式(Step 3)
- **文件路径**: `frontend/src/components/ContractLayers.tsx`, `LayerCard.tsx`, `frontend/src/styles/animations.css`
- `ContractLayers` 接 `mode: 'hidden'|'decomposed'|'stacked'`(step3→decomposed, step4/5→stacked); 每卡片内联注入 `--scatter-x/y`; CSS:
  ```css
  .layer-card { background:#fff; border:1px solid var(--color-border); border-radius:var(--radius-card);
    padding:12px 20px; box-shadow:var(--shadow-card); font-family:var(--font-mono); font-size:14px;
    transition:all var(--duration-normal) var(--ease-apple); }
  .layers-container.decomposed .layer-card { position:absolute; left:50%; top:50%;
    transform:translate(calc(-50% + var(--scatter-x)), calc(-50% + var(--scatter-y))); }
  .layers-container.decomposed .layer-card:nth-child(n) { transition-delay: calc((n - 1) * 150ms); }
  /* n=1..5 逐条写死 delay: 0/150/300/450/600ms */
  ```
- **验证(人眼)**: Step3 五卡依次飞散到配置坐标 → 提交

### 任务 2.4: 层叠模式 + L3 裂缝(Step 4)
- 追加 CSS: `.stacked .layer-card { position:relative; transform:none; width:480px; height:64px; margin:0 auto; transition-delay:0ms; }`, 容器 flex column gap 8px 居中; 层名标注绝对定位 `right:-130px`, opacity delay 0.4s 淡入; L3 由 `isSecurityLayer && broken && !isFixed` 推导加 `.security-broken`(红虚线 + `#FFF0F0` + ⚠️ Missing Signer Check)
- **验证(人眼)**: 收拢层叠 + 层名 + L3 裂缝 → 提交

### 任务 2.5: TxCard 交易卡片(v4 新增, 修最大问题)
- **文件路径**: `frontend/src/components/TxCard.tsx`
- 行为: Step 5 点 Execute → `setAttackState('showing-tx')` → TxCard 淡入(0.4s)居中显示于层叠上方 → `TX_CARD_MS`(1200ms)后 `setAttackState('running')`(圆点出现)
- 卡片内容(演示用假地址即可):
  ```
  Transaction
  accounts:   vault  7xKm…9mPQ
              authority  ADMiN…x7wQ   ← 高亮(管理员地址)
  signatures: ATTACKER ✓
              ADMIN    ✗              ← 红色加粗(签名缺席)
  ```
- 样式: 白底卡片, radius 10px, 等宽字体, ✗ 用 `--color-danger`, 卡片整体轻微 box-shadow
- **验证(人眼)**: Execute → 卡片先出, ✗ 一眼可见, 1.2s 后进入下落 → 提交
- 说明: 这里的 1200ms 是**编排节奏**不是竞态规避, 用 setTimeout 合理(对应调试协议第 4 条的适用范围)

### 任务 2.6: AttackDot 漏洞版路径
- **文件路径**: `frontend/src/components/AttackDot.tsx`
- **keyframes 由 geometry.ts 生成注入, 禁止手写像素**:
  ```tsx
  import { layerMidY, stackHeight } from '../lib/geometry';
  import { VAULT_LAYERS } from '../config/layers';
  const bottom = stackHeight(VAULT_LAYERS.length) + 8;
  const css = `@keyframes attack-vulnerable {
    0%{transform:translateY(-60px);opacity:0} 5%{opacity:1}
    15%{transform:translateY(${layerMidY(0)}px)} 30%{transform:translateY(${layerMidY(1)}px)}
    45%{transform:translateY(${layerMidY(2)}px)} 60%{transform:translateY(${layerMidY(3)}px)}
    75%{transform:translateY(${layerMidY(4)}px)}
    85%{transform:translateY(${bottom}px) scale(1.5)} 100%{transform:translateY(${bottom}px) scale(3)}
  }`;
  ```
- 圆点: 20px, `radial-gradient(#FF6B6B,#D1242F)`, 红光 shadow; `attackState==='running'` 时挂载, `onAnimationEnd` → `setAttackState('done')`; 穿 L3 瞬间该层红 pulse(`.attacking .security-broken` 触发 0.4s pulse keyframe)
- **验证(人眼)**: 红点匀速穿透 5 层底部放大 → 提交

### 任务 2.7: FixToggle + 修复路径
- **文件路径**: `frontend/src/components/FixToggle.tsx`, 追加 AttackDot fixed keyframes
- toggle [Vulnerable]/[Fixed]; 切 Fixed: L3 换 `.security-fixed`(绿实线+`#F0FFF4`+🔒 Signer Verified), 重置 `attackState='idle'`; fixed keyframes 同样由 geometry 生成: 到 `blockedY(2)+LAYER_HEIGHT` 停 → 弹回 16px → 再撞 → 弹回 → opacity 0, 撞时绿 pulse
- **验证(人眼)**: Fixed 圆点 L3 顶两撞两弹消失 → 提交

### 任务 2.8: AttackResult + VerifyPanel 壳
- **文件路径**: `frontend/src/components/AttackResult.tsx`, `VerifyPanel.tsx`, `frontend/src/config/verification.ts`
- AttackResult: `done` 后按 `attackOutcome(isFixed)` 渲染: success→红 "Attack Successful"/"Vault drained. The attacker never signed."; rejected→绿 "Transaction Rejected"/"Missing signer. Access denied."; 0.5s 淡入
- verification.ts 先写**占位**(Phase 4 填真值):
  ```typescript
  export const VERIFICATION = {
    vulnerableProgramId: 'TBD', fixedProgramId: 'TBD',
    attackTxSignature: 'TBD', attackTxUrl: '', fixedTxError: 'TBD',
    vaultBefore: 1000, vaultAfter: 500,
  };
  ```
- VerifyPanel: done 后底部 "Verify on-chain →" 按钮, 展开两笔交易对比 + Solscan 外链 + `<video src="/demo-verify.mp4" controls />` + "This is not an animation. The exploit is real, deployed, and reproducible on Devnet."
- **验证(人眼)**: 两条路径文案正确; 面板展开结构正确(数据 TBD 可接受) → 提交

### ✅✅ CHECKPOINT 2(里程碑: Demo 已可独立提交)
- [ ] 完整流程 1→6 无刷新跑通两遍
- [ ] 交易卡片 ✗ 一眼可见
- [ ] 动画 easing 一致, 无 console 报错
- [ ] `npm test` 全绿
- [ ] G 节评审通过
- [ ] **若此刻时间耗尽: 砍掉 Phase 3/4, 用模拟数据填 verification.ts 直接提交(降级为纯前端项目) — 但注意用户已确认链上程序是强制要求, 此降级仅在"提交与零分之间"时启用**

---

## F. Phase 3 — 合约 TDD + Devnet 取证(5.5h)

> **v4.1 调整(用户确认): 全程 Devnet, 不跑本地 validator**。
> - 测试靶子即 Devnet: 所有 `anchor test` 替换为 `anchor test --skip-local-validator --provider.cluster devnet`。测试文件与 RED→GREEN 流程不变
> - **先囤水**: 本 Phase 第一件事 — 分多次 `solana airdrop 2` + faucet.solana.com, 囤够 5-8 SOL(部署租金 + 反复测试手续费)
> - **默认只部署漏洞版**(原降级项 1 转正): 省一半租金与水; 修复版"拒绝"证据以日志/截图呈现, UI 动画本来就是模拟
> - **Plan C**: 仅当 Devnet 挂死时, 回退本地 validator 跑 `anchor test` 保进度 — 备胎非常规流程
>
> **环境(1h, 最大风险)**: Anchor 在原生 Windows 不可靠, 两条路:
> - **主路**: WSL2(Ubuntu) 内安装 Rust + Solana CLI + Anchor CLI, 四命令版本号齐全
> - **Plan B(若 WSL2 卡超过 45 分钟)**: 转 Solana Playground(beta.solpg.io), 浏览器内编译部署, 开 project 放漏洞版。测试改为 Playground 内置 test 或降级为"部署后脚本验证"
> - 纪律: 一次只排一个环境的坑, 不双线作战

### 任务 3.1: Anchor 工作区(双 program)
- 执行: `anchor init contract --no-git && cd contract && anchor new xray_fixed`, 把默认 program 重命名 `xray_vulnerable`(同步改 Anchor.toml/Cargo.toml)
- **验证**: `anchor build` 编译出两个 `.so`

### 任务 3.2(RED): 攻击测试
- **文件路径**: `contract/tests/xray.ts` — 两个用例:
  1. `vulnerable: 非签名者冒充 authority 提款 — 成功(记录漏洞)`: authority 传 admin 地址但由 attacker 签名, 断言 vault.balance 从 1000 变 500
  2. `fixed: 非签名者冒充 — 被拒绝`: 同调用对 fixed, 断言抛错匹配 `/signature|Signer/i`
- **验证(RED)**: `anchor test` 两用例失败, 失败原因为程序未实现而非测试语法错 → 提交 `test: attack tests (RED)`

### 任务 3.3(GREEN-1): 漏洞版
- **文件路径**: `contract/programs/xray_vulnerable/src/lib.rs`:
  ```rust
  use anchor_lang::prelude::*;
  declare_id!("VuLnXR1ayVuLnXR1ayVuLnXR1ayVuLnXR1ay111111111");

  #[program]
  pub mod xray_vulnerable {
      use super::*;
      pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
          let vault = &mut ctx.accounts.vault;
          vault.authority = ctx.accounts.authority.key();
          vault.balance = 1000;
          Ok(())
      }
      pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
          let vault = &mut ctx.accounts.vault;
          // BUG: 只验证地址匹配, 缺少 is_signer 检查
          require!(vault.authority == ctx.accounts.authority.key());
          vault.balance -= amount;
          Ok(())
      }
  }
  #[derive(Accounts)]
  pub struct Initialize<'info> {
      #[account(init, payer = authority, space = 8 + 32 + 8)]
      pub vault: Account<'info, Vault>,
      #[account(mut)]
      pub authority: Signer<'info>,
      pub system_program: Program<'info, System>,
  }
  #[derive(Accounts)]
  pub struct Withdraw<'info> {
      #[account(mut)]
      pub vault: Account<'info, Vault>,
      /// CHECK: 故意只查地址不查签名 — 教学用漏洞
      pub authority: AccountInfo<'info>,
  }
  #[account]
  pub struct Vault { pub authority: Pubkey, pub balance: u64 }
  ```
- **验证**: `anchor test` 用例 1 绿, 用例 2 仍红 → 提交

### 任务 3.4(GREEN-2): 修复版
- 同 3.3, 差异: `declare_id!` 换值, `pub mod xray_fixed`, `Withdraw.authority: Signer<'info>`(强制签名)
- 若部署报 program id 不一致: `anchor keys list` 查真实 id 回填 declare_id! 与 Anchor.toml(一次只改一个变量)
- **验证**: `anchor test` **全绿** → 提交

### 任务 3.5: 取证(部署与测试已合并, 此任务只做收口)
- 记录: 漏洞版 Program ID + 攻击成功交易签名 SIG_A(任务 3.3 测试运行时产生) + 修复版拒绝日志/截图 ERR_B
- 录 30s 屏(攻击交易在 Solscan 上的 Success 页面 + 终端日志)存 `frontend/public/demo-verify.mp4`
- **验证**: SIG_A 在 `https://solscan.io/tx/<SIG_A>?cluster=devnet` 状态 Success → 提交

### ✅ CHECKPOINT 3
- [ ] Devnet 上攻击测试全绿(漏洞被记录 + 修复被拒绝, 或默认方案: 仅漏洞版攻击成功)
- [ ] 漏洞版 Program ID 可查, SIG_A Solscan 可见

---

## G. Phase 4 — 汇合与收尾(2.5h)

### 任务 4.1: 填证据
- 把 Program ID / SIG_A / ERR_B 填入 `frontend/src/config/verification.ts`
- **验证**: VerifyPanel 显示真实数据, Solscan 链接可点

### 任务 4.2: 完整验证(verification-before-completion)
- `npm test` 绿 + `anchor test` 绿 + 全流程人眼两遍 + VerifyPanel 真数据 — **四项证据齐全才算完成**

### 任务 4.3: 部署 + 录屏 + 提交
- `npm run build && npx vercel --prod`; 录 60s 全流程 `demo.mp4`; README(项目名/Pitch/200字描述/截图/Program IDs/Solscan/运行与测试步骤)
- 商业叙事(三段式, 评委问答用):
  > 今天: 免费交互安全教育, Solana 开发者的"安全第一课"(Public Good)。
  > 明天: 同一台"合约→层级安全模型"拆解引擎两个出口 — 审计报告增强(每个审计发现渲染成可交互攻击动画, 审计所按席位付费做交付差异化) + CI 安全卡口(PR 删掉签名检查, CI 评论贴出攻击路径动画)。
  > 底层资产是拆解引擎, 不是动画。我们不假装教育本身赚钱——教育是入口, 引擎是资产, 审计与开发工具是出口。
- 分支收尾: 合并 main + tag `hackathon-submit`(或用户选择开 PR/保留)

---

## H. 评审协议(每任务后, 两段式)

1. **规格符合度**: 文件路径/代码完整性/验证步骤执行了? RED 任务真见过红?
2. **代码质量**: 可读性/DRY/YAGNI/命名/无多余复杂度

严重度: **Critical**(不符合规格 / DOM 拆断动画 / CSS 手写像素 / 测试假绿 → 阻断打回) / **Major**(质量债, 当场修) / **Minor**(风格, 记录)。打回后子代理不辩解, 修完回到该任务验证步骤确认仍绿。

## I. 调试协议

复现 → 根因追踪(不在现象层打补丁; 动画断裂先查 DOM 是否重建) → 纵深防御 → 条件等待(`onAnimationEnd`, 禁止睡 N 秒赌时序; TxCard 的 1200ms 是编排节奏例外)。一次只改一个变量。

## J. 交付清单

- [ ] `npm test` 绿 + `anchor test` 绿 + 流程两遍跑通
- [ ] Vercel URL 可演示
- [ ] Devnet Program ID(至少漏洞版) + SIG_A Solscan 链接
- [ ] demo.mp4(60s) + demo-verify.mp4(30s)
- [ ] README + 平台提交(赛道 Public Goods / Infrastructure)
- [ ] 分支合并 + tag
