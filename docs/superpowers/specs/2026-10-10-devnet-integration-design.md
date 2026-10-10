# Solana Prism — 真实链上对接（设计规格）

> 状态：已与用户逐项确认，待复核后转实施计划。
> 日期：2026-10-10
> 适用仓库：`solana-prism`（分支 `feat/prism`）
>
> 本规格的每一项决定都在对话中单独取得用户确认，确认记录见 §11。

## 1. 问题

前端功能完整、97 项测试全绿，但**链上那一半从未存在**，因此三处是空的：

1. **没有对端。** `contract/` 下两个 Anchor 程序从未部署，`config/verification.ts` 的五个字段全是 `TBD`，`isDeployed()` 恒为 false。README 的 Status 段如实写着 "The front end is finished. The contract is written but has never been built or deployed."
2. **没有钱包接入层。** `frontend/package.json` 只有 `react` 与 `react-dom`；全仓库搜不到 `@solana/web3.js`、钱包适配器或任何 RPC 连接。step 5 的 Execute 按钮只做 `setAttackState('showing-tx')`，由 CSS keyframes 播一段动画。
3. **交易卡是戏剧。** `TxCard.tsx:32-45` 的 `vault` / `authority` 地址是硬编码的省略占位（`7xKm…9mPQ`、`ADMiN…x7wQ`），签名行是常量数组，与任何真实交易无关。

本设计补上这三件事，且**默认路径一行不改**。

## 2. 范围

### 做

- 在 Linux 构建机上编译两个 program（真实 `declare_id!`），经 `https://devnet.rpcpool.com` 部署到 Devnet。
- 建立 **vault 池**：由一把专用 ADMIN 密钥创建 N 个 vault（`authority = ADMIN`、`balance = 1000`），供前端反复演示真实攻击。
- 采集真实证据：两个 program id、攻击成功交易签名 SIG_A、（修复版）拒绝交易签名 SIG_B，填入 `config/verification.ts`。
- 前端新增**可选**的真实链层：未连钱包时一切照旧；连钱包且选中漏洞版时，多出一个 "Execute on Devnet" 按钮发真实交易。
- 新增依赖：**仅 `@solana/web3.js`**。钱包连接手写在 `window.solana` 之上，不引入 wallet-adapter。
- 新增 i18n 文案键（中英各一份，经 `Messages` 接口强制）。
- README、`contract/README.md` 更新为实际部署状态。

### 不做（明确排除）

- **不替换**现有 Execute 按钮与其动画路径。真实模式是**新增的第二个按钮**，默认路径行为、确定性、`tools/shoot.mjs` 的断言面、已录的 `walkthrough.mp4` 全部不受影响。
- **不引入 `@coral-xyz/anchor`**。`withdraw` 的指令数据手工构造（见 §5.1），避免为 16 字节付一个重依赖。
- 不引入 wallet-adapter、状态管理库、UI 库。
- 不改 `steps.ts` 的步骤机、`lib/code.ts` 的 step 2 列表、`lib/geometry.ts`、`lib/keyframes.ts`、层叠/攻击坐标系。
- 不重录 `walkthrough.mp4` 与 `contact-sheet.png`。
- 不做移动端适配。
- 不修改两个 program 的**指令语义**。`initialize` 强制 `vault.authority = payer` 这一点被**利用**而非改动（见 §4），因此 `contract/` 的合约逻辑零改动；只写入了真实 `declare_id!`。

## 3. 环境事实（实测，不是假设）

这些是本规格据以成立的前提，全部实测过：

| 事实 | 证据 |
|---|---|
| 构建机 `192.168.250.130`（Rocky Linux 10.1）可用 | TCP 22 通；`root` 可登录 |
| 工具链与仓库钉版吻合 | `anchor-cli 0.30.1`（= `contract/Anchor.toml:2` 的钉版）、`cargo-build-sbf 4.4.0`、`platform-tools v1.57`、`rustc 1.95.0` |
| 字节码满足 Devnet 要求 | 两个 `.so` 均为 `readelf -h` → `Flags: 0x3`（SBPFv3），满足 `contract/README.md:44-53` 的 ≥1.56 / ≥4.2.0 门槛 |
| 源码一致性 | 9 个关键文件与本仓库 `contract/` 逐一 `sha256` 比对，全部 SAME |
| **`solana.com` 系域名与 `solscan.io` 在本网络不可达** | `api.devnet.solana.com` 被 DNS 污染为 `103.42.176.244`、TCP 443 不通；`faucet.solana.com` / `solscan.io` 超时 |
| **`https://devnet.rpcpool.com` 可用且无需 API key** | `getVersion` → `{"feature-set":1855282951,"solana-core":"4.4.0-beta.0"}` |
| 该 RPC 的 airdrop 不可用 | `requestAirdrop` → 429 "reached your airdrop limit today or the airdrop faucet has run dry" |
| 视觉验证在本机可做 | DSH 自带 Node **v24.21.0**（`tools/shoot.mjs` 需 ≥22），Chrome 在 `C:\Program Files\Google\Chrome\Application\chrome.exe` |
| 测试基线 | `npm test` → **97/97 全绿**（含单独复跑） |

> **RPC 端点来源**：`solana.com` 被封是本网络特有问题，`devnet.rpcpool.com` 是绕开它的可用通道。端点写成配置项而非硬编码散落各处。

## 4. 链上侧

### 4.1 已完成的构建步骤

1. `declare_id!` 与 `Anchor.toml` 的占位符 `1111…` 替换为真实地址。**这一步是必须的，不是整洁问题**：Anchor 的 `#[account]` 派生把 `Owner` 实现为 `crate::ID`，而 `Account<'info, Vault>` 会校验账户 owner 等于 `crate::ID`。占位 id 会让运行期 owner 校验失败。
2. 上传 `contract/`（跳过 `target/`，**program keypair 就住在 `target/deploy/`，丢了地址就变**）。
3. `anchor build` → 退出码 0；IDL 中的 `address` 与 keypair 派生地址一致。

| program | 地址 | programdata 租金 |
|---|---|---|
| `prism_vulnerable` | `7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2` | 0.8615934 SOL |
| `prism_fixed` | `9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq` | 0.85866732 SOL |

`solana program deploy` 的 `--max-len` 默认取程序长度本身，但流程会**先建 buffer 账户再建 ProgramData**，两者都要租金豁免，故**峰值需求约 2× 租金**，buffer 随后退还。两个 program 的峰值合计约 3.44 SOL，结束后链上锁定约 1.72 SOL。

### 4.2 vault 池：为什么合约零改动

`initialize` 里 `vault.authority = ctx.accounts.authority.key()`，而 `authority` 同时是 `payer = authority`。**因此一个 vault 的 admin 就是当初出钱创建它的人。** 这常被视为限制，但正好被本设计利用：

- 一把**专用 ADMIN 密钥**（只在创建脚本里出现，**绝不入库、不进前端**）创建 N 个 vault，每个 `authority = ADMIN`、`balance = 1000`。
- 前端只需要**公开信息**：program id、`ADMIN` 公钥、vault 地址。它读 RPC 找下一个余额仍为 1000 的 vault，然后以访客钱包签名、把 `authority` 填成 `ADMIN` 的地址。
- `Withdraw` 的两个账户是 `#[account(mut)] vault: Account<Vault>` 与 `authority: AccountInfo<'info>`——**除访客钱包外没有第二个 signer**，所以访客只需签一次名，**不需要联合签名**，钱包兼容性风险为零。

**vault 地址推导（前端与创建脚本必须一致）**：

```
seed_i  = sha256(utf8("prism-vault-v1:" + i))          // 32 字节
keypair = Keypair.fromSeed(seed_i)                      // ed25519
address = base58(keypair.publicKey)                     // i = 0 .. POOL_SIZE-1
```

`POOL_SIZE = 30`。两边一致性用**黄金向量测试**锁死：创建脚本打印前 30 个地址，测试断言前端推导出的完全相同。测试在推导被改坏时必须变红。

### 4.3 证据采集

- 攻击成功：对上池中一个 fresh vault 发 `withdraw(500)`，签名即 **SIG_A**，填 `verification.ts` 的 `attackTxSignature`。
- 修复版拒绝：同一笔调用打到 `prism_fixed`，运行时在阶段③拒绝。**失败的交易同样有签名**，因此 SIG_B 也是真实可查的。
- 采集用 `sendRawTransaction` 而非 `sendAndConfirmTransaction`：后者在交易失败时抛错、拿不到签名，而我们需要失败那笔的签名。

## 5. 前端侧

### 5.1 `src/lib/devnet.ts`（纯函数，全部可测）

| 导出 | 职责 |
|---|---|
| `WITHDRAW_DISCRIMINATOR` | `b712469c946da122`（`sha256("global:withdraw")[0..8]`，已实测） |
| `withdrawInstructionData(amount)` | 16 字节：判别符 + u64 LE |
| `withdrawAccounts(vault, authority)` | 两个账户元，**均非 signer**，`vault` 可写 |
| `vaultAddress(i)` | §4.2 的推导 |
| `decodeVault(data)` | 48 字节 = 8 判别符 + 32 authority + 8 balance(u64 LE) |
| `nextFreshVault(rpcReader)` | 返回第一个 `balance === 1000` 且 `authority === ADMIN` 的索引 |

依赖仅 `@solana/web3.js`。不含任何 React、不含副作用——RPC 读写通过注入的 `rpcReader` 传入，因此可用假实现测。

### 5.2 `src/lib/wallet.ts`（薄适配）

`detect()` / `connect()` / `disconnect()` / `signAndSend(tx)`，全部落在 `window.solana`（Phantom）上。没有 provider 时 `detect()` 返回 false，**一切真实模式入口都不渲染**。用假 provider 对象测试，不需要真钱包。

### 5.3 状态与数据流

现有 `attackState`（`idle → showing-tx → running → done`）**一字不改**。新增一条并行的 `chainRun`：

```
disconnected → ready → running → ok(sig) | rejected(sig, reason) | failed(reason) | exhausted
```

`outcome` 从"由 `isFixed` 推导"变为"**来源可选**"：

- 默认（未连钱包）：`outcome = attackOutcome(isFixed)`——现有行为，一字不改。
- 真实模式：`outcome` 取自 `chainRun` 的结果，**同一个 `AttackDot` / `LayerCard` / `AttackResult` 渲染真实结论**。

这保持了仓库的"数据驱动、非手工开关"惯例：真实与模拟共用一条渲染路径，只有结论来源不同。

### 5.4 组件改动

| 文件 | 改动 |
|---|---|
| `App.tsx` | 新增 `chainRun` 状态与 "Execute on Devnet" 按钮（仅在已连钱包 **且** 选中漏洞版时渲染）；`outcome` 来源可选 |
| `TxCard.tsx` | 新增可选 `payload` prop。有值时渲染**真实** base58 的 vault/authority 与真实签名状态；无值时走现有常量。默认路径零改动 |
| `AttackResult.tsx` | 接受显式 `outcome`，缺省仍由 `isFixed` 推导 |
| `VerifyPanel.tsx` | 新增一行"本次运行的签名"（仅真实模式且有签名时渲染） |
| `config/verification.ts` | `vulnerableProgramId`/`fixedProgramId`/`attackTxSignature`/`attackTxError` 填真值；新增 `adminPubkey`、`rpcEndpoint`、`poolSize`、`faucetUrl` |
| `src/components/WalletButton.tsx`（新） | 连接/断开，放在现有 `.top-controls` 内 |

`isDeployed()` **不改**。它继续从数据推导；填了真值之后 VerifyPanel 自己切换到 deployed 措辞——这正是它当初的设计意图。

### 5.5 i18n 文案（最终稿，实现时照抄）

| 键 | en | zh |
|---|---|---|
| `walletConnect` | Connect wallet | 连接钱包 |
| `walletDisconnect` | Disconnect | 断开 |
| `walletConnected` | Connected | 已连接 |
| `walletMissing` | No Solana wallet detected in this browser. | 此浏览器未检测到 Solana 钱包。 |
| `executeOnDevnet` | Execute on Devnet | 在 Devnet 上执行 |
| `chainRunning` | Sending the transaction… | 正在发送交易… |
| `chainNeedSol` | This needs a little Devnet SOL for fees. | 这需要一点 Devnet SOL 付手续费。 |
| `chainExhausted` | The prepared vault pool is used up. Re-run the pool script to refill it. | 预备的 vault 池已用尽。重跑建池脚本即可补充。 |
| `chainFixedNotDeployed` | The repaired build is not deployed, so this refusal is the animation. | 修复版未部署，因此这里的拒绝来自动画。 |
| `chainTxFailed` | The transaction was rejected by the runtime. | 交易被运行时拒绝。 |
| `chainRealSignature` | this run's signature | 本次运行的签名 |
| `chainNotLamports` | The vault's balance is a number in its account, not lamports moved. | vault 的余额是账户里的一个数字，并不涉及 lamport 转移。 |
| `ariaWallet` | Wallet | 钱包 |

> `chainFixedNotDeployed` 是**数据驱动的回落态，不是常态文案**：本次决定两个 program 都部署，因此正常路径下修复版给出的是**真实链上拒绝**。只有当 `isFilled(fixedProgramId)` 为假（例如 SOL 不足以部署第二个 program）时才渲染这一句。

`no-hardcoded-copy.test.ts` 会扫所有组件，硬编码文案会失败；`messages.test.ts` 会强制两条语言键集一致、中文含中文字符且不等于英文。

## 6. 不得声称的事（诚实边界）

这一节是硬约束，实现时不得违反：

1. **`withdraw` 不搬运任何 lamport。** 它只把 vault 账户里的 `u64` 字段减 500。"盗取"是**状态变更**，真实交易展示的正是这个。UI 必须有对应文案（`chainNotLamports`），不得暗示资金转移。
2. **vault 池是有限的。** 耗尽是一个真实状态，必须如实报告（`chainExhausted`），不得回退到假装成功。
3. **访客需要 Devnet SOL。** 手续费由访客钱包支付。`faucet.solana.com` 在本网络不可达，故 faucet 地址是配置项。
4. **`solscan.io` 在本网络不可达。** 链接照常指向 Solscan（对公众是正确的），但本机浏览器打不开——这属网络限制，不改设计。

## 7. 守卫与测试（必须先红）

沿用仓库"每条守卫都要先证伪"的规矩：

| 守卫 | 断言 | 证伪方式 |
|---|---|---|
| 指令数据 | `withdrawInstructionData(500)` 恰好 16 字节、前 8 字节为 `b712469c946da122`、后 8 字节为 `f401000000000000` | 改判别符 → 红 |
| 账户元 | 两个账户，**没有一个是 signer**，`vault` 可写 `authority` 只读 | 把 authority 标成 signer → 红 |
| vault 推导 | 前 30 个地址等于创建脚本产出的黄金向量 | 改种子前缀 → 红 |
| 账户解码 | 48 字节解出正确的 authority 与 balance；长度不符时报错 | 偏移错位 → 红 |
| 无钱包时入口不渲染 | 无 provider 时 "Execute on Devnet" 不存在 | 无条件渲染 → 红 |
| 默认路径不变 | 不连钱包时组件的 DOM/行为与改动前一致 | 改动默认分支 → 红 |
| 现有 97 项 | 全部保持绿 | — |
| `public/source` 副本 | 改 `declare_id!` 后副本必须同步，否则 `source-assets.test.ts` 红 | 已实际触发过一次 |

## 8. 验证

1. `npm test` —— 现有 97 项 + 新增项全绿。
2. `npm run build` —— `tsc -b && vite build` 通过。
3. `tools/shoot.mjs` —— 经 DSH 自带 Node v24.21.0 跑，**在无钱包状态下**必须仍然通过（缺一选择器、结果串不对、层卡片重挂、任何 console 错误都失败）。
4. 真实链路人工验收 —— 连钱包、跑真实攻击、在 RPC 上确认签名与余额变化。

`npm test` 在本沙箱需要 `danger-full-access`：vitest 内部的 esbuild 以管道 stdio 启动子进程，受限模式下必然 `EPERM`。这是沙箱边界，非项目问题。

## 9. 风险

| 风险 | 处置 |
|---|---|
| faucet 限流，3.5 SOL 可能要多领几次 | 先部署 `prism_vulnerable`（峰值 1.72 SOL）再部署 `prism_fixed` |
| `solana-core 4.4.0-beta.0` 可能启用更严格的字节码门槛 | 已复验 `Flags: 0x3`（SBPFv3）；若部署被拒，日志会明说是版本问题 |
| 访客钱包不支持 `signAndSendTransaction` | 只用最通用的 `signTransaction` + RPC 发送 |
| 并发写入本工作区 | 已观测到外部进程在本会话期间重写 `public/source/*.rs.txt`（17:17:47-48），并导致一次**真阳性**守卫失败。修改期间需注意 |

## 10. 交付物

- 部署到 Devnet 的两个 program（真实 program id）
- vault 池与建池脚本
- 前端真实链层（`devnet.ts`、`wallet.ts`、`WalletButton.tsx`、组件接线）
- 填好真实证据的 `config/verification.ts`
- 新增测试与守卫
- 更新的 README / `contract/README.md`

## 11. 用户确认记录

| 决定 | 选择 |
|---|---|
| 对接程度 | 真·链上对接（部署 + 钱包连接 + 真实发交易） |
| 构建通道（初选） | Solana Playground |
| 构建通道（复选，知晓 PG 限制后） | Linux 构建机 + rpcpool |
| 交易模型 | 连钱包当攻击者，每次现场用池中 fresh vault |
| 真实链与动画的关系 | 可选层：未连钱包跑动画，连钱包才能跑真实交易 |
| 依赖 | 仅 `@solana/web3.js` + 手写 Phantom 适配 |
| `prism_fixed` | 部署（给出真实链上拒绝） |
| 真实模式入口 | 新增第二个按钮 "Execute on Devnet" |
| 充值目标 | 3.5 SOL |
