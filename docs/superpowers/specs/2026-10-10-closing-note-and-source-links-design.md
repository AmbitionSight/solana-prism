# Solana X-Ray — 结语块、出处链接与延伸阅读（设计规格）

> 状态：已与用户确认，待复核后转实施计划。
> 日期：2026-10-10
> 适用仓库：`solana-xray`（分支 `feat/xray`）

## 1. 问题

前端功能完整、93 项测试全绿，但存在一个**立意层面的缺口**：全站解释性文案仅由 `i18n/messages.ts` 中那些字符串构成（1 个标题、2 句代码注释、5 个阶段名、2 个徽章、4 句结果文案、验证面板文案），不足以回答观众看完动画后必然产生的两个问题：

1. **为什么这样修？** README 里那句核心结论——"声明的约束由运行时免费强制，手写检查只有你记得写才有"——**屏幕上没有**。动画讲的是*发生了什么*，没有讲*为什么* `Signer<'info>` 就解决了。
2. **凭什么信？** README 声称 step 2 的代码列表是 `contract/programs/xray_vulnerable/src/lib.rs` 逐字复制，但页面没有任何链接指向它，观众无法自行核对。
3. **所以呢？** 没有任何现实代价的落点，也没有延伸阅读。Public Goods 赛道的"教育入口"叙事在页面上没有出口。

本设计补上这三件事，且**不新增步骤、不改动验证面板**。

## 2. 范围

### 做

- 新增 `ClosingNote` 组件：在攻击结束后被动出现，含结论句、现实代价句、出处与延伸链接行。
- 出处链接**自包含**：把 `contract/` 下三个源文件复制进 `frontend/public/source/`，页面直接链接；并新增守卫测试断言副本与原文件逐字一致。
- 新增 i18n 文案键（中英各一份，经 `Messages` 接口强制）。
- README 更新：六步叙述补充结语块；Layout 段落登记新组件与新目录；**明确标注** `walkthrough.mp4` 与 `contact-sheet.png` 录制于结语块加入之前。

### 不做（明确排除，避免范围蔓延）

- **不接入录屏**：`docs/screenshots/walkthrough.mp4` 不复制进 `public/`，页面不出现任何 `<video>`。验证面板现有的 `/demo-verify.mp4` 探测逻辑与文案**保持原样**。
- **不重录** `walkthrough.mp4` 与 `contact-sheet.png`。用户选择以 README 标注版本差异的方式处理过期问题。
- 不改动 `VerifyPanel.tsx`、`verification.ts`、`isDeployed()` 及围绕它们的守卫。
- 不新增步骤：步骤机仍是 1→5，`AUTO_ADVANCE_MS`、`steps.ts` 不动。
- 不引入路由、深链、进度指示器。
- 不做移动端适配、不加 og/favicon（属另一批工作）。

## 3. 组件与数据流

### 3.1 位置

`attackState === 'done'` 时，在 `App.tsx` 的 `.footer-slot` 内、`AttackResult` 之后、`VerifyPanel` 之前插入 `<ClosingNote />`。

即改动 `App.tsx` 现有这一处：

```tsx
{attackState === 'done' && (
  <>
    <AttackResult isFixed={isFixed} />
    <ClosingNote />        {/* 新增 */}
    <VerifyPanel />
  </>
)}
```

理由：被动出现（用户已确认），不新增步骤；放在结果之后、证据面板之前，形成"发生了什么 → 为什么 → 凭什么信 → 链上证据"的顺序。

### 3.2 `ClosingNote` 的行为

- 纯展示组件，**无 props、无 state、无副作用**。不接触 `isDeployed()`，因此它的存在与部署状态无关，不需要 deployed/undeployed 两态测试。
- 全部文案经 `useLanguage()` 的 `t` 取用；不得出现任何硬编码用户可见字符串（既有 `no-hardcoded-copy.test.ts` 会扫）。
- 结构：`<section role="region" aria-label={t.ariaClosingRegion}>`，内含结论段、现实代价段、来源说明（小字）、`closingLinksLabel` 标签与两行链接：
  - **第一行 = 本仓库原文**（`closingLinkSourceVulnerable`、`closingLinkSourceFixed`、`closingLinkSourceTests`），指向 `/source/*.rs.txt` 与 `/source/xray.test.ts.txt`；
  - **第二行 = 延伸**（`closingLinkSealevel`、`closingLinkSealevelRepo`、`closingLinkAccountTypes`、`closingLinkSolend`），指向 §4 的四个外部 URL。
- 链接一律 `target="_blank" rel="noreferrer"`。本地源码链接用相对路径（`/source/...`），外部链接为绝对 URL。

### 3.3 文案（最终稿，实现时照抄，不得改写）

新增键与其取值：

| 键 | en | zh |
|---|---|---|
| `closingFixIsDeclaration` | The repair is a declaration, not a line of logic: Signer<'info> makes the runtime demand a signature before your handler runs, and AccountInfo<'info> demands nothing. | 修复是一个声明，而不是一行逻辑：Signer<'info> 让你的 handler 跑起来之前，运行时就已经要求签名；AccountInfo<'info> 什么都没要求。 |
| `closingRealWorld` | This is not hypothetical — the Anchor docs treat this class of attack as required reading before mainnet. In August 2021 Solend was attacked through the same gap in another form: an authorization check was too weak, and the attacker passed a lending market they had created and owned themselves. About $2M was put at risk, and the team caught it before any funds were taken. | 这不是假想：Anchor 官方文档把这类攻击列为上主网前的必读。2021 年 8 月，Solend 被同一族问题的另一面击中——授权校验不够强，攻击者传入了一个自己创建并拥有的 Lending Market。约 $2M 一度处于风险中，团队在资金被拿走之前拦下了。 |
| `closingSourceNote` | Incident details relayed from the Solend incident report (SLND-INCDT-01) via the Quadriga case file. | 事件细节转引自 Solend 自己的事件报告（SLND-INCDT-01），经 Quadriga 案例页。 |
| `closingLinksLabel` | Where this comes from | 出处与延伸 |
| `closingLinkSourceVulnerable` | the vulnerable program, verbatim | 漏洞版程序原文 |
| `closingLinkSourceFixed` | the fixed program, verbatim | 修复版程序原文 |
| `closingLinkSourceTests` | the attack, as assertions | 把攻击写成断言的测试 |
| `closingLinkSealevel` | Anchor docs · Sealevel Attacks | Anchor 文档 · Sealevel Attacks |
| `closingLinkSealevelRepo` | sealevel-attacks source | sealevel-attacks 源码 |
| `closingLinkAccountTypes` | Anchor docs · Account Types | Anchor 文档 · Account Types |
| `closingLinkSolend` | Solend incident, 2021-08-19 | Solend 事件（2021-08-19） |
| `ariaClosingRegion` | Closing note | 结语 |

`closingFixIsDeclaration` 的取值里没有 markdown 反引号：反引号在网页上会被当字面量渲染出来。由于 `Signer<'info>` 自带单引号，这两条取值在 `messages.ts` 里用双引号书写。

### 3.4 样式

- 复用既有设计令牌与卡片外观（`global.css` 的 `--color-*` / `--radius-card` / `--shadow-card` / `--font-mono` 等），样式追加在 `app.css` 现有 `.footer-slot` 相关段落之后，不新建样式文件。
- **不得引入任何坐标像素**：本块是静态排版，不参与层叠/攻击坐标系，因此不产生 `transform` 位移；`no-hardcoded-pixels.test.ts` 的适用范围（`transform` 内的像素与生成器源码）不因本块扩大，也不得为绕开它而把坐标写进非 transform 属性。
- **不得使用 `--color-text-tertiary`**：`global.css` 已声明它是 2.5:1、不满足 WCAG AA、仅供装饰，来源说明与链接属于承载含义的文案，只能用 `--color-text-secondary`（仓库注释称其为"文案允许的最浅一档"）。
- 字体层级：结论段与结果文案同级，现实代价段次之，来源说明更小。具体数值由实现时与既有段落对齐决定，不在此规格中固定（避免与 design token 重复定义）。

`closingRealWorld` 里"too weak"的措辞是刻意的：Solend 那次事故的根因是**授权校验不足、攻击者传入了自己创建并拥有的 Lending Market**，严格说不是字面意义的"缺签名校验"，而是同一族问题的另一面。**文案不得改写成"Solend 因缺失签名校验被黑"**，那是不实陈述。

## 4. 链接目标

| 用途 | URL | 核实状态（2026-10-10 由本机 web_fetch 实测） |
|---|---|---|
| 官方把该类攻击列为必读 | `https://www.anchor-lang.com/docs/references/security-exploits` | **HTTP 200**，标题 "Sealevel Attacks"，明确指向 coral-xyz/sealevel-attacks 并说明每个攻击有 insecure/secure/recommended 三版 |
| 该清单的源码 | `https://github.com/coral-xyz/sealevel-attacks` | 由上述官方页面直接链接；本机无法打开 github.com，未直接验证渲染 |
| `AccountInfo` = unchecked 的官方说明 | `https://www.anchor-lang.com/docs/references/account-types` | **HTTP 200**（`/docs/account-types` 会 302 到此地址），页内明确写 `AccountInfo` 是 unchecked account，并列有 `Signer` 条目 |
| Solend 事件 | `https://www.quadrigainitiative.com/cryptocurrencyhackscamfraudwiki/index.php?title=Solend_Insecure_Authentication_Check` | **HTTP 200**，逐句引用了 Solend 事件报告 SLND-INCDT-01（`$2M at risk`、`subvert an auth check`、`arbitrary Lending Market created and owned by them`、5 名用户误清算约 $16K 已赔付） |
| 本地源码原文 | `/source/xray_vulnerable.rs.txt`、`/source/xray_fixed.rs.txt`、`/source/xray.test.ts.txt` | 随构建产出，同源，永不死链 |

**已废弃的两个候选**（记录原因，避免后人重新踩）：

- `https://docs.rs/anchor-lang/latest/anchor_lang/prelude/struct.Signer.html` —— **实测 404**（anchor-lang 1.2.1 中该路径不存在）。
- `solana.com` 官方课程 URL —— 本机 DNS 解析到非公网 IP，**无法验证**，故不采用；"官方必读"这一环改由已实测的 Anchor 官方文档承担。原口径 A 承诺的是"Solana 官方课程"，此处**有意替换为 Anchor 官方文档**，因为后者可核实且正是 Anchor 开发者会查的地方。

被排除的流行数字（记录决策依据）：Wormhole $326M、Cashio $48M、Mango $115M 等金额广泛流传，但本机无法触达一手报告（`github.com`、`raw.githubusercontent.com`、`docs.google.com`、`solana.com` 均不可达），无法逐句核对金额与根因。**在本项目中，不得把无法核对的二手转述印成事实**，故不采用。

## 5. 自包含源码副本与防漂移守卫

### 5.1 副本

从仓库复制（**内容逐字一致，不改一个字符**）：

| 源 | 副本 |
|---|---|
| `contract/programs/xray_vulnerable/src/lib.rs` | `frontend/public/source/xray_vulnerable.rs.txt` |
| `contract/programs/xray_fixed/src/lib.rs` | `frontend/public/source/xray_fixed.rs.txt` |
| `contract/tests/xray.ts` | `frontend/public/source/xray.test.ts.txt` |

**为什么是 `.rs.txt` 而不是 `.rs`**：`public/` 下的文件由 Vite 原样托管，MIME 由服务器按扩展名推断；`.rs` 不保证映射到 `text/plain`，浏览器可能改为**下载**文件而不是直接显示。本链接的整个目的是"让观众点开就能读到源码"，只有 `.txt` 结尾能确保在浏览器内直接查看，且不依赖任何服务器的 MIME 配置。文件名保留 `.rs` 前缀，不隐瞒内容类型。

### 5.2 守卫测试

新增 `frontend/src/__tests__/source-copy.test.ts`：

- 对上述三对文件，用 `Buffer` 逐字节比较，断言完全相等（含行尾与末尾换行）。
- 失败信息必须**指名是哪个副本**与首个差异偏移，而不是笼统的 `expect(a).toBe(b)`。
- 读取路径经 `import.meta.url` 解析：副本在 `../../public/source/`，源文件在 `../../../contract/`（测试文件位于 `frontend/src/__tests__/`，vitest 在 `frontend/` 下运行，跨目录读 `../contract` 属预期行为）。
- **必须证伪**：实现时故意改动副本中一个字符，确认测试变红并指出文件名与偏移，然后改回。这是本仓库的既有纪律（"不能被证伪的守卫比没有守卫更糟"）。
- 若跨目录读取在本机跑不通，**不得**把守卫降级成"存在性检查"；改为把副本落成生成物并配一个生成脚本（同一守卫仍比对内容）。此分支需在实施时先行确认。

## 6. 测试与验证清单

- `npm test` 全绿（现有 93 项 + 新增）；`tsc -b` 无错。
- i18n：新增键在 en/zh 两侧齐备（缺一即编译错）；`messages.test.ts` 的非空 / 确为中文 / 非英文副本三项检查通过。
- `no-hardcoded-copy.test.ts` 通过——`ClosingNote` 中不得有漏翻文案。
- `source-copy.test.ts` 新增并通过，且**已证伪一次**。
- 视觉与流程实证：以 `tools/shoot.mjs` 跑一遍真实浏览器校验（需 Node ≥ 22——本机自带 node 为 20.10.0 会拒绝启动，改用 DSH 运行时的 Node 24；Chrome 在 `C:\Program Files\Google\Chrome\Application\chrome.exe`）。要求：无 console 报错、无缺失选择器、攻击两态的结果文案不变、结语块确实出现。产出目录不得提交（确认 `.gitignore` 覆盖）。
  - 若 harness 因新增元素而失败，**先判断是它的前提过期还是布局真的坏了**：前者才允许调整断言，后者必须修代码。不得为了让 harness 变绿而放宽断言（本仓库的调试协议：不在现象层打补丁）。
- 人眼确认：结语块在 Vulnerable 与 Fixed 两条路径下都出现；链接均可点开。
- README 更新到位（见 §2）。

## 7. 已知约束与风险

1. **外部链接无法在运行时自证**。§4 中的核实是 2026-10-10 的一次实测快照；页面上的链接若日后失效，本仓库没有机制能发现。已在规格中记录每个链接的核实方式，便于日后复核。
2. **Solend 案例属"同一族、非同一漏洞"**。文案以限定措辞处理（§3.3）；任何把该事件说成"缺失签名校验"的改写都属违规。
3. **录屏与截图将过期**。用户选择不重录，改以 README 标注。后果：README 顶部展示的界面与当前代码不一致，此为**已接受的取舍**，不是遗漏。
4. **`public/source/` 是内容副本**，存在漂移风险，由 §5.2 的守卫兜住；守卫本身必须证伪后才算成立。
5. 本设计不触碰链上部分；`verification.ts` 仍全为 `TBD`，验证面板仍如实声明未部署。

## 8. 决策记录

| 决策 | 选择 | 依据 |
|---|---|---|
| A 组范围 | 三项全做（结语、出处、现实代价） | 用户明确选择 |
| 结语呈现 | 被动出现，不新增步骤 | 用户选择；保持"六步"叙事与步骤机不变 |
| 出处链接方式 | 自包含副本进 `public/` + 防漂移守卫 | 用户选择；仓库无 remote，无公开 URL 可指 |
| 现实代价口径 | A+B+C 全加 | 用户选择；以已核实的官方文档与 Solend 事件承载，不用无法核实的金额 |
| 官方课程链接 | 替换为 Anchor 官方文档 | 原目标 `solana.com` 本机不可达、无法验证，替换为实测 200 的官方页面 |
| 录屏 | 不接入页面 | 用户选择 |
| 过期录屏/截图 | 不重录，README 标注版本差异 | 用户选择 |
