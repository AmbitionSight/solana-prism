# Solana Prism — 结语块瘦身（修订设计规格）

> 状态：方案 B 已与用户确认，待复核后转实施计划。
> 日期：2026-10-10
> 适用仓库：`solana-prism`（分支 `feat/prism`）
> **修订对象**：[`2026-10-10-closing-note-and-source-links-design.md`](./2026-10-10-closing-note-and-source-links-design.md)
> 本文档**取代**该规格的 §3.2（第二行链接为四条）、§3.3 中 `closingRealWorld` 一行、§8 中"现实代价口径"一行。其余条款继续有效。

## 1. 问题

结语块上线后，用户给出的反馈是**冗余**：想读到的只有三件事——**什么漏洞技术、什么事件、被拿走了多少钱**——而当前版本把这三件事埋在了一段带元陈述的长文案和七条链接里。

具体冗余点：

1. **元陈述不承载信息**。`这不是假想：Anchor 官方文档把这类攻击列为上主网前的必读。` / `This is not hypothetical — the Anchor docs treat this class of attack as required reading before mainnet.` 读者读完并没有多知道任何关于漏洞或事件的事，它只是在为下面那句话做担保。
2. **事件句绕**。"被同一族问题的另一面击中"、"attacked through the same gap in another form" 是双重限定，读者要走两遍。
3. **钱的数字只有一半**。原文只给了风险敞口（约 $2M）和"资金在被动之前被拦下"，没有给实际动过的钱（约 $16k 的误清算），而后者才是"这次到底损失了什么"的答案。
4. **外链七条**，第二行四条里两条（`sealevel-attacks 源码`、`Anchor 文档 · Account Types`）与第一行的本仓库原文重复承担"凭什么信"的职责。

## 2. 范围

### 做

- 重写 `closingRealWorld`（中英各一份），按"技术口径 → 事件 → 钱"三拍重排，并把金额写成**三档**：风险敞口约 $2M、攻击者拿走 $0、实际动过的约 $16k 误清算且已补偿。
- 删除 `closingLinkSealevelRepo`、`closingLinkAccountTypes` 两个键（`Messages` 接口 + 两个语言表 + `ClosingNote.tsx` 的 `READING_LINKS`），第二行链接由四条收为两条。
- 同步 `README.md` 与 `README.zh-CN.md` 中描述结语块的段落。
- 在旧规格上标注本修订，避免后人照着作废的 §3.2 / §3.3 实现。

### 不做（明确排除）

- **不动结论句** `closingFixIsDeclaration`。它是演示的立意句，且 `tools/shoot.mjs:221` 断言结语块文本含 `declaration, not a line of logic`；保留该句意味着 **harness 无需改动**。
- **不动 `closingSourceNote`**。出处声明必须留在页面上（旧规格 §3.3 的理由：这是转述而非一手报告）。它本来就只是一行小字。
- **不动第一行链接**（三个本仓库源文件）。它是"动画剖析的就是这个仓库"的另一半，由 `source-assets.test.ts` 逐字守。
- **不动** `closingLinksLabel`、`ariaClosingRegion`、组件结构、CSS、`App.tsx`。
- 不改步骤机、验证面板、`config/verification.ts`。
- 不重录 `walkthrough.mp4` 与 `contact-sheet.png`（旧规格 §2 已接受的取舍，本次同）。
- 不引入任何新的守卫测试：本次没有新增"可能撒谎的机制"，只有文案与链接数量的变化，已有守卫覆盖。

## 3. 文案（最终稿，实现时照抄，不得改写）

| 键 | en | zh |
|---|---|---|
| `closingRealWorld` | Solend, 2021-08-19 — the same family of mistake in another form: an authorization check too weak, bypassed with a lending market the attacker had created and owned. About $2M was at risk; the attacker took nothing. The only funds that moved were about $16k of wrongful liquidations — five accounts, hit by Solend's own liquidator — all refunded. | Solend，2021-08-19——同一族问题的另一面：授权校验太弱，被一个攻击者自己创建并拥有的 Lending Market 绕过。约 $2M 一度处于风险中，攻击者一分钱都没拿走。唯一动过的资金是约 $16k 的误清算——5 个账户，是 Solend 自己的清算机器人下的手——已全额补偿。 |

其余键一律不动。`closingLinkSealevelRepo` 与 `closingLinkAccountTypes` **整键删除**（接口、两张语言表、`READING_LINKS`）。

### 3.1 为什么"同一族问题的另一面"这个限定必须留着

旧规格 §3.3 末段与 §7.2 的约束继续有效，且是本次改写最容易踩坏的一处：

> Solend 那次事故的根因是**授权校验不足、攻击者传入了自己创建并拥有的 Lending Market**，严格说不是字面意义的"缺签名校验"，而是同一族问题的另一面。**文案不得改写成"Solend 因缺失签名校验被黑"**，那是不实陈述。

新稿用 `the same family of mistake in another form` / `同一族问题的另一面` 承载这个限定——它说的是"同一族（该由声明承担的约束被留给了手写检查）"，不是"同一个 bug"。这句话不允许被"顺"成"Solend 也被缺签名校验打穿了"。

### 3.2 三档金额的核实依据

全部逐句来自 Solend 自己的事件报告 SLND-INCDT-01（经 Quadriga 案例页转述，2026-10-10 本机复核实测 HTTP 200）：

| 稿中措辞 | 原文 |
|---|---|
| about $2M was at risk / 约 $2M 一度处于风险中 | "We estimate that around $2M was at risk." |
| the attacker took nothing / 攻击者一分钱都没拿走 | "detected and stopped by the Solend team in time such that no funds were stolen" |
| about $16k of wrongful liquidations — five accounts, hit by Solend's own liquidator — all refunded / 约 $16k 的误清算——5 个账户，是 Solend 自己的清算机器人下的手——已全额补偿 | "A handful of users (5) were liquidated by Solend's liquidator, but those users were refunded out of the liquidator's undue earnings (~16K USD)." |

**归属必须准确**：那 5 个账户是 Solend 自己的清算机器人清算的，不是攻击者得手的；稿中 `hit by Solend's own liquidator` / `是 Solend 自己的清算机器人下的手` 就是为这一点存在的，不得删。Quadriga 案例页把本事件的 "Total Amount Lost" 记为 $16,000——与稿中第三档同源，但稿中不写"损失 $16k"，因为这些钱随后被全额补偿，写"损失"会失真。

## 4. 链接变更

`ClosingNote.tsx` 的 `READING_LINKS` 由四条收为两条，顺序与标签不变：

| 保留 | href |
|---|---|
| `closingLinkSealevel`（Anchor 文档 · Sealevel Attacks） | `https://www.anchor-lang.com/docs/references/security-exploits` |
| `closingLinkSolend`（Solend 事件 2021-08-19） | `https://www.quadrigainitiative.com/cryptocurrencyhackscamfraudwiki/index.php?title=Solend_Insecure_Authentication_Check` |

| 删除 | 原因 |
|---|---|
| `closingLinkSealevelRepo`（`https://github.com/coral-xyz/sealevel-attacks`） | 2026-10-10 复核实测：`security-exploits` 页面本身**不列举**攻击，它只写"if you're shipping anything to mainnet, it's important you understand every bit of that magic"，然后**链向**这个 repo 作为"A list of common attacks"。因此保留 `closingLinkSealevel` 时清单只有一跳之遥；且本机对 `github.com` 的 `web_fetch` 再次失败（`TypeError: fetch failed`），该链接的渲染从未被验证过，属于四条里最该删的一条 |
| `closingLinkAccountTypes`（`https://www.anchor-lang.com/docs/references/account-types`） | 它论证的"`AccountInfo` 是未检查账户"已由 `closingFixIsDeclaration` 直接说清，且结论句右侧就是第 ③ 阶段徽章"未要求签名"在演示同一件事 |

`SOURCE_LINKS`（三个本仓库源文件）与 `source-assets.test.ts` 的守卫完全不动。

## 5. 连带改动

| 文件 | 改动 |
|---|---|
| `frontend/src/i18n/messages.ts` | 改 `closingRealWorld` 两条；删两个链接键（接口 + en + zh） |
| `frontend/src/components/ClosingNote.tsx` | `READING_LINKS` 删两条 |
| `README.md` | §"The six steps" 第 6 点后的结语段：金额补成三档，外链描述删去 account-types 一项 |
| `README.zh-CN.md` | 同一段的中文版同步 |
| `docs/superpowers/specs/2026-10-10-closing-note-and-source-links-design.md` | §3.2 / §3.3 / §8 相关行加"已被本修订取代"指向 |
| `tools/shoot.mjs` | **不改**。断言的是 `declaration, not a line of logic`，该句保留 |

### 5.1 README 两段的确切替换文本

`README.md` 第 100–111 行整段，**已实施的最终文本**（改动只在第 103–108 行那两句金额与"外链"列举；第 109–111 行是按仓库的 ~80 列换行习惯重排，措辞未变）：

```
The result is followed by a closing note, because the animation answers *what
happened* and leaves two questions open. It states the sentence the source is
really about — the repair is a declaration, not a line of logic — names one
incident from the same family (Solend, August 2021: an authorization check that
was too weak, defeated by a lending market the attacker had created and owned —
about $2M put at risk, nothing taken, and about $16k of wrongful liquidations
refunded), and links out: the Anchor docs' Sealevel Attacks reference and the
incident case file, with the attribution stated on the page because it is a
relay of Solend's own report rather than the report itself. The first row of
links is the other half of the claim: the two programs and the attack test,
served from this site verbatim, so a reader can check that the animation
dissects what this repository actually contains.
```

`README.zh-CN.md` 第 54 行，把那一段换成：

```
结果之后有一段收束注（closing note），因为动画回答了*发生了什么*，还留下两个问题。它说出源码真正想说的那句话 —— 修复在声明，不在逻辑 —— 并点名同族的一起事故（Solend，2021 年 8 月：一处过弱的授权检查，被攻击者自己创建并拥有的借贷市场绕过 —— 约 200 万美元一度处于风险中，攻击者一分钱没拿走，约 1.6 万美元的误清算已全额补偿），再给出外链：Anchor 文档的 Sealevel Attacks 参考，以及事故案例档案；页面上写明出处，因为这是转述 Solend 自己的报告，而非报告本身。第一行链接是这句话的另一半：两个程序和攻击测试，从本站原样提供，读者可以核对动画剖析的正是这个仓库里的东西。
```

两处都**只**改金额与"外链"列举，其余措辞（"the other half of the claim" / "第一行链接是这句话的另一半"整句）保持原样——它描述的是第一行链接，本次未动。

## 6. 验证清单

- `npm test` 全绿（改前基线 97 项——**已实测**：2026-10-10 16:55 在本机跑 `npm test`，11 个文件 97 项全通过，exit 0）。重点看 `messages.test.ts` 三项：无空值、每条中文含中文字符且不等于英文、英文不夹带中文。新 `closingRealWorld` 中英差异大、英文无 CJK，预期通过。
- `npx tsc -b` 无错——这是本次的**真 RED**：先在接口里删掉两个键，编译器会精确指出两张表里还留着它们；再删表的对应行。删键的驱动顺序应当是"先删接口与语言表，后删 `READING_LINKS`"，否则 `ClosingNote.tsx` 会先报 `MessageKey` 不存在。
- `tools/shoot.mjs` 真实浏览器校验一遍（Node ≥ 22，本机在 `C:\Users\Ambit\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`；Chrome 在 `C:\Program Files\Google\Chrome\Application\chrome.exe`）：无 console 报错、无缺失选择器、`step5-closing-note` 断言通过、两条路径下结语块都出现。**不得为了让 harness 变绿而放宽它的断言。**
- 人眼确认：结语块在 Vulnerable 与 Fixed 两条路径下都出现；第二行只剩两条链接且均可点开；页面无残留的第四条外链。
- 金额措辞与 §3.2 表逐字对照一次，确认没有引入任何未核实数字。

## 7. 约束与风险

1. **外链区从"承担论证"退化为"进一步阅读"**。被删掉的那句铺垫（`Anchor 官方文档把这类攻击列为上主网前的必读`）本来正是 `closingLinkSealevel` 所支撑的断言——页面原文确实写着 "if you're shipping anything to mainnet, it's important you understand every bit of that magic and the motivation behind it"。铺垫句一走，这条链接就不再支撑页面上的任何断言，只剩"进一步阅读"的身份。这是用户为"少即是多"付出的代价，记录在此以免日后被当成遗漏补回去或误加回那句铺垫。
   **同时记录一处 2026-10-10 复核实测推翻的旧假设**：旧规格 §4 把 `security-exploits` 描述为"明确指向 coral-xyz/sealevel-attacks 并说明每个攻击有 insecure/secure/recommended 三版"——指向与三版说明属实，但该页面**本身不列举攻击项**，清单在 repo 里。因此删掉 `closingLinkSealevelRepo` 后，攻击清单距页面两跳而非原来的一跳。若日后认为这不可接受，正确的修法是**保留 repo 链接、改删 `closingLinkSealevel`**（官方页一跳可达 repo，反之不然），而不是把两句铺垫塞回来。
2. **文案比旧稿只短约 8 个英文词**，但信息量从"1 档金额"变成"3 档金额"，且删掉了整个元陈述句。视觉上的减负主要来自两处：删掉的那句铺垫，以及第二行少掉的两条链接。
3. **旧规格 §3.3 标注为"不得改写"的最终稿被本次改写**。这不是绕过纪律，而是记录在案的修订：本文档即修订依据，且旧规格会被加上指向本文件的标注。
4. 外部链接仍无法在运行时自证（旧规格 §7.1 继续有效）。本条修订未新增外部链接，只减少两条。
5. `README.md` / `README.zh-CN.md` 与录屏/截图的时间差继续存在（旧规格 §7.3），本次不处理。

## 8. 决策记录

| 决策 | 选择 | 依据 |
|---|---|---|
| 冗余的判定 | 元陈述句 + 第二行两条链接为冗余 | 用户反馈 |
| 金额口径 | 三档全写（$2M 风险 / $0 被拿走 / $16k 误清算已补偿） | 用户从三个口径中选定；三档均为已核实事实 |
| 删除范围 | 删铺垫句、收链接 7→5，保留结论句与来源小字 | 用户选定方案 B |
| harness | 不改 | 被断言的句子保留，无需动 |
| 新守卫 | 不加 | 本次未引入新的"可能撒谎的机制" |
