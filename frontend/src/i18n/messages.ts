/**
 * messages.ts — every user-visible string in the demo, in both languages.
 *
 * Both languages implement the same `Messages` interface, so a key added to one
 * and forgotten in the other is a **compile error**, not a Chinese reader
 * stumbling onto an English sentence. `messages.test.ts` then checks what types
 * cannot: that no value is empty, that every Chinese value is actually Chinese,
 * and that none was left as a copy of the English.
 *
 * Deliberately NOT translated: on-chain field names and identifiers
 * (`vault`, `authority`, `ATTACKER`, `ADMIN`, `accounts:`, `signatures:`) —
 * those are literal names from a real transaction, and translating them would
 * put the demo out of step with what a viewer sees on Solscan. Only the
 * annotations around them are translated.
 */

import { clusterLabel } from '../config/verification';

export type Language = 'en' | 'zh';

/**
 * Fill a template's `{cluster}` slot with the configured cluster's name.
 *
 * Three sentences name the chain, and a name written out in longhand goes stale
 * the moment the configuration changes — which is what happened when this demo
 * moved from devnet to testnet and the copy still said "Devnet". The claim
 * sentence especially: it is the one thing here that must not be wrong.
 */
export function formatCluster(template: string, cluster?: string): string {
  return template.replace('{cluster}', clusterLabel(cluster));
}

export interface Messages {
  /* Step 1 */
  step1Title: string;

  /* Step 2 — margin notes beside the real listing. Each key is pinned to one
     line of the deployed source by contractSource.ts's MARGIN_NOTES, so the
     listing can stay byte-identical to what was deployed. */
  noteDeclareId: string;
  noteStructNotSigner: string;
  noteHandlerRequires: string;
  noteTheBug: string;
  noteStateChange: string;

  /* Step 2's status bar — the chain the deployed build runs on. Templated with
     `{cluster}` like the other sentences that name the chain. */
  contractLive: string;

  /* Step 2 shows an excerpt of the deployed file, not the whole thing: 64 lines
     do not fit a 1280x820 viewport at a readable size. These two say so on the
     page — `excerptScope` names what is on screen, and `excerptElided` marks
     each run of lines left out, templated with `{n}`. Neither may be dropped
     without the page quietly claiming to be the whole file. */
  excerptScope: string;
  excerptElided: string;

  /* The six stages of one instruction, in execution order.
     In Chinese these render as "中文 English" — see bilingualName. */
  stageSetup: string;
  stageInstruction: string;
  stageAccounts: string;
  stageDeclaration: string;
  stageManualCheck: string;
  stageStateChange: string;

  /* The sentence each stage card leads with — plain language saying what happens
     at that step, with the code line underneath as the evidence. These carry who
     makes the stage happen ("the runtime…", "the program…") in their own words,
     which is why there is no separate enforcer tag. */
  sayCreateVault: string;
  sayCall: string;
  sayHandOver: string;
  sayDeclaration: string;
  /**
   * Stage 3's sentence as it reads on the repaired build. The fix is a change to
   * the declaration, so the sentence that describes the declaration changes with
   * it — the vulnerable wording ("which asks for nothing") would otherwise sit
   * on the green card that demands a signature.
   */
  sayDeclarationFixed: string;
  sayCompare: string;
  sayStateChange: string;

  /* Stage 4's comparison, spelled out. The stage holds two values against each
     other, so it renders as two labelled rows — the vault's stored authority,
     which is a real address, and the caller's supplied address, which is left
     blank until the attack fills it. Showing the same address on both lines
     would give the answer away, so the second row is a slot waiting to be
     filled.

     Only the labels and the two notes are copy. The one address that exists is
     config (`VERIFICATION.adminPubkey`) and is elided for display; writing it
     into the catalogue would put a value that changes on redeploy into a
     translated string. The first note is a back-reference (S0 wrote it in); the
     second is a fact about the platform, not a back-reference — on Solana the
     caller supplies this and nothing checks who they are. */
  compareStored: string;
  compareStoredFrom: string;
  compareSupplied: string;
  compareSuppliedNote: string;

  /* Stage 3's badge — the flaw, stated plainly */
  badgeNoSignerRequired: string;
  badgeSignerRequired: string;

  /* Controls */
  execute: string;
  versionVulnerable: string;
  versionFixed: string;
  ariaLanguage: string;

  /* Transaction card */
  txTitle: string;
  txNoteProgram: string;
  txNoteVaultTarget: string;
  txNoteAdminPresent: string;
  txNoteSigned: string;
  txNoteSignatureAbsent: string;
  ariaSignaturePresent: string;
  ariaSignatureAbsent: string;
  /**
   * The animated path with no honest authority to name.
   *
   * Parallel to `chainExhausted`: both say the demo has nothing it can attack,
   * and neither dresses that up as a run. This one is for a missing admin
   * address rather than an empty pool, which is a state this repository is not
   * in but must not silently ignore.
   */
  demoNoTarget: string;

  /* The real chain, opt-in. Every string here is only ever rendered when a
     wallet is connected and the selected build is actually deployed, so none of
     them can be read as a claim about a deployment that does not exist. */
  walletConnect: string;
  walletDisconnect: string;
  walletConnected: string;
  walletMissing: string;
  executeOnDevnet: string;
  chainRunning: string;
  chainNeedSol: string;
  chainExhausted: string;
  chainFixedNotDeployed: string;
  chainTxFailed: string;
  /**
   * Not in the design spec's table, deliberately added here.
   *
   * `chainTxFailed` says the runtime refused the transaction, which is true of a
   * run that reached the chain and was rejected — and false of one that never
   * got there. `lib/chainRun.ts` keeps those two apart on purpose ("conflating
   * them would turn an RPC outage into a security claim"), so the state it calls
   * `failed` needs wording of its own rather than a borrowed accusation.
   */
  chainAttemptFailed: string;
  chainRealSignature: string;
  chainNotLamports: string;
  ariaWallet: string;

  /* Attack result */
  resultSuccessTitle: string;
  resultSuccessBody: string;
  resultRejectedTitle: string;
  resultRejectedBody: string;

  /* Verify panel — two different claims, because the deployed one is a lie
     until a program id and a signature actually exist */
  verifyToggle: string;
  verifyClaimDeployed: string;
  verifyClaimNotDeployed: string;
  verifyVulnerableProgram: string;
  verifyAttackTx: string;
  verifyVaultBalance: string;
  /**
   * The balance row's value on a refused run.
   *
   * The 1000 -> 500 pair is the vulnerable build's drain, and belongs only to a
   * run that actually drained. A refusal must not be shown beside a balance that
   * moved, so the row states the one thing that is true instead: a rejected
   * transaction changes no account state.
   */
  verifyBalanceUnchanged: string;
  verifyFixedProgram: string;
  verifySameCall: string;
  verifyPending: string;
  ariaVerifyRegion: string;

  /* Closing note — why the repair works, what it costs to miss it, and where
     the code the demo dissects actually lives. */
  closingFixIsDeclaration: string;
  closingRealWorld: string;
  closingSourceNote: string;
  closingLinksLabel: string;
  closingLinkSourceVulnerable: string;
  closingLinkSourceFixed: string;
  closingLinkSourceTests: string;
  closingLinkSealevel: string;
  closingLinkSolend: string;
  ariaClosingRegion: string;

  /* ---- The eight-page narrative tail (pages 4, 6, 7, 8) ---- */

  /* Page 4 — the payoff of the blank left on page 3: the caller simply writes
     the admin's public address into the slot. The address itself is config
     (`VERIFICATION.adminPubkey`), elided at render; only the prose is copy. */
  fillTitle: string;
  fillLede: string;
  fillNoHack: string;
  fillNeedHeading: string;
  fillNeedBody: string;
  fillNowHeading: string;
  fillNowBody: string;

  /* The comparison's outcome, shown only once the caller's slot is filled — the
     attack page, where the addresses actually match. Absent on page 3, where the
     slot is still blank. */
  compareResult: string;

  /* Page 6 — why the mistake is made: Solidity's check is right, and the hand
     writes the same shape in Rust where it proves nothing. */
  whyTitle: string;
  whyEthTitle: string;
  whySolTitle: string;
  whySolidityBody: string;
  whySolidityVerdict: string;
  whySolBody: string;
  whySolVerdict: string;
  whyTableColEth: string;
  whyTableColSol: string;
  whyTableStateLabel: string;
  whyTableStateEth: string;
  whyTableStateSol: string;
  whyTableCallerLabel: string;
  whyTableCallerEth: string;
  whyTableCallerSol: string;
  whyConclusion: string;
  whyNote: string;

  /* Page 7 — the fix: one declaration, not a line of logic. */
  fixTitle: string;
  fixLede: string;
  fixBody: string;
  fixBodyDeclaration: string;
  fixNote: string;

  /* Page 8 — the same attack against the fixed build, refused, and the two
     versions held side by side. */
  retryTitle: string;
  retryNote: string;
  retryTableHeading: string;
  retryTableRuntimeLabel: string;
  retryTableRuntimeVuln: string;
  retryTableRuntimeFixed: string;
  retryTableSigLabel: string;
  retryTableSigVuln: string;
  retryTableSigFixed: string;
  retryTableResultLabel: string;
  retryTableResultVuln: string;
  retryTableResultFixed: string;
  retryConclusion: string;
}

export type MessageKey = keyof Messages;

/** The six stage names, so `bilingualName` can be typed narrowly. */
export type LayerNameKey =
  | 'stageSetup'
  | 'stageInstruction'
  | 'stageAccounts'
  | 'stageDeclaration'
  | 'stageManualCheck'
  | 'stageStateChange';

export const MESSAGES: Record<Language, Messages> = {
  en: {
    step1Title: 'What is a smart contract?',

    noteDeclareId: 'The address this build was compiled with — the one on chain.',
    noteStructNotSigner: 'The account list. `authority` is declared here.',
    noteHandlerRequires: 'The handler. It runs only after the runtime is satisfied.',
    noteTheBug:
      '`AccountInfo` asks the runtime for nothing — not even a signature. ' +
      'This line is the whole bug.',
    noteStateChange: 'Where the damage lands: a u64 inside the vault account.',

    contractLive: 'running on {cluster}',

    excerptScope: 'key sections, shown verbatim — elided lines are marked',
    excerptElided: '… {n} lines elided …',

    stageSetup: 'Vault Setup',
    stageInstruction: 'Instruction',
    stageAccounts: 'Accounts',
    stageDeclaration: 'Account Declaration',
    stageManualCheck: 'Manual Check',
    stageStateChange: 'State Change',

    sayCreateVault: 'An admin creates the vault — and writes their own address into it.',
    sayCall: 'Someone calls the contract, asking for 500.',
    sayHandOver: 'They hand over two accounts.',
    sayDeclaration: 'The runtime checks the declaration — which asks for nothing.',
    sayDeclarationFixed: 'The runtime checks the declaration — which demands a signature.',
    sayCompare: 'The program compares two addresses.',
    sayStateChange: 'The balance is reduced by 500.',

    compareStored: 'stored in the vault',
    compareStoredFrom: 'written in when the vault was created',
    compareSupplied: 'the caller fills in',
    compareSuppliedNote: 'on Solana, anyone may put anything here',

    badgeNoSignerRequired: 'No signature required',
    badgeSignerRequired: 'Signature required',

    execute: 'Execute',
    versionVulnerable: 'Vulnerable',
    versionFixed: 'Fixed',
    ariaLanguage: 'Language',

    txTitle: 'Transaction',
    txNoteProgram: 'the deployed build',
    txNoteVaultTarget: 'the vault being drained',
    txNoteAdminPresent: 'admin address present',
    txNoteSigned: 'signed',
    txNoteSignatureAbsent: 'signature absent',
    ariaSignaturePresent: 'signature present',
    ariaSignatureAbsent: 'signature absent',
    demoNoTarget: 'There is nothing it could honestly attack right now.',

    walletConnect: 'Connect wallet',
    walletDisconnect: 'Disconnect',
    walletConnected: 'Connected',
    walletMissing: 'No Solana wallet detected in this browser.',
    executeOnDevnet: 'Execute on {cluster}',
    chainRunning: 'Sending the transaction…',
    chainNeedSol: 'This needs a little {cluster} SOL for fees.',
    chainExhausted: 'The prepared vault pool is used up. Re-run the pool script to refill it.',
    chainFixedNotDeployed: 'The repaired build is not deployed, so this refusal is the animation.',
    chainTxFailed: 'The transaction was rejected by the runtime.',
    chainAttemptFailed: 'Could not complete the attempt, so there is no verdict.',
    chainRealSignature: "this run's signature",
    chainNotLamports: "The vault's balance is a number in its account, not lamports moved.",
    ariaWallet: 'Wallet',

    resultSuccessTitle: 'Attack Successful',
    resultSuccessBody: 'Vault drained. The attacker never signed.',
    resultRejectedTitle: 'Transaction Rejected',
    resultRejectedBody: 'Missing signer. Access denied.',

    verifyToggle: 'Verify on-chain',
    verifyClaimDeployed:
      'This is not an animation. The exploit is real, deployed, and reproducible on {cluster}.',
    verifyClaimNotDeployed:
      'Nothing here has been deployed yet. The animation is a faithful walkthrough of the contract source in this repository — but until those programs are built and deployed, there is no program id or transaction behind it.',
    verifyVulnerableProgram: 'Vulnerable program',
    verifyAttackTx: 'Attack transaction',
    verifyVaultBalance: 'Vault balance',
    verifyBalanceUnchanged: 'unchanged — a rejected transaction changes no state',
    verifyFixedProgram: 'Fixed program',
    verifySameCall: 'Same call, fixed build',
    verifyPending: 'not deployed yet',
    ariaVerifyRegion: 'On-chain verification',

    closingFixIsDeclaration:
      "The repair is a declaration, not a line of logic: Signer<'info> makes the runtime demand a signature before your handler runs, and AccountInfo<'info> demands nothing.",
    closingRealWorld:
      "Solend, 2021-08-19 — the same family of mistake in another form: an authorization check too weak, bypassed with a lending market the attacker had created and owned. About $2M was at risk; the attacker took nothing. The only funds that moved were about $16k of wrongful liquidations — five accounts, hit by Solend's own liquidator — all refunded.",
    closingSourceNote:
      'Incident details relayed from the Solend incident report (SLND-INCDT-01) via the Quadriga case file.',
    closingLinksLabel: 'Where this comes from',
    closingLinkSourceVulnerable: 'the vulnerable program, verbatim',
    closingLinkSourceFixed: 'the fixed program, verbatim',
    closingLinkSourceTests: 'the attack, as assertions',
    closingLinkSealevel: 'Anchor docs · Sealevel Attacks',
    closingLinkSolend: 'Solend incident, 2021-08-19',
    ariaClosingRegion: 'Closing note',

    fillTitle: 'He simply put this address in.',
    fillLede:
      "This address is visible to everyone on chain. The admin's public key is not a secret — a public key never is.",
    fillNoHack:
      'No cracking. No forgery. No stolen key. He wrote a piece of public information into that position.',
    fillNeedHeading: 'What it normally takes to move this vault',
    fillNeedBody: "the admin's private key — to sign",
    fillNowHeading: 'What it takes now',
    fillNowBody: "the admin's address — public information",

    compareResult: 'addresses match → the check passes',

    whyTitle: 'Because you wrote it this way in Ethereum, and there it was right.',
    whyEthTitle: 'Solidity · Ethereum',
    whySolTitle: 'Rust · Solana',
    whySolidityBody:
      'msg.sender is computed by the protocol from the transaction signatures. The protocol already verified them, so comparing the address is verifying identity.',
    whySolidityVerdict: 'This line is correct, sufficient, and fine.',
    whySolBody:
      'Solana has no msg.sender. Here authority is just a public key someone handed in.',
    whySolVerdict: 'It proves nothing.',
    whyTableColEth: 'Ethereum',
    whyTableColSol: 'Solana',
    whyTableStateLabel: 'Where state lives',
    whyTableStateEth: 'inside the contract',
    whyTableStateSol: 'in accounts someone hands in',
    whyTableCallerLabel: 'Who the caller is',
    whyTableCallerEth: 'the protocol tells you',
    whyTableCallerSol: 'does not tell you — unless you declare Signer',
    whyConclusion:
      'In Ethereum, who you are is told to you by the protocol. In Solana, who you are is something you have to demand yourself.',
    whyNote:
      'So someone who has written Solidity all day types that require! from muscle memory — it looks exactly like the Solidity check, and it looks safer. It compiles, the tests pass, and review slides past it.',

    fixTitle: 'Change one line.',
    fixLede: 'Not a check added — a declaration changed.',
    fixBody:
      'That is it. The flaw is not in that require! line — that line was right all along; comparing the address is exactly what it should do.',
    fixBodyDeclaration: 'The flaw is in this declaration: it asked the runtime for nothing.',
    fixNote: 'Two versions, one line apart.',

    retryTitle: 'Attack the fixed build.',
    retryNote:
      'Not one line of contract code ran. The attacker’s dot stopped at the declaration node — the runtime stopped it for him.',
    retryTableHeading: 'The two versions side by side',
    retryTableRuntimeLabel: 'what the runtime node says',
    retryTableRuntimeVuln: 'nothing required',
    retryTableRuntimeFixed: 'authority must sign',
    retryTableSigLabel: 'signatures on the transaction',
    retryTableSigVuln: '1',
    retryTableSigFixed: '1 (not enough)',
    retryTableResultLabel: 'result',
    retryTableResultVuln: 'attack succeeded',
    retryTableResultFixed: 'transaction refused',
    retryConclusion: 'The only difference between the two versions is what that node says.',
  },

  zh: {
    step1Title: '什么是智能合约？',

    noteDeclareId: '这个构建编译进去的地址 —— 链上跑的就是它。',
    noteStructNotSigner: '账户清单。`authority` 在这一段被声明。',
    noteHandlerRequires: '处理函数。它只在运行时满意之后才会执行。',
    noteTheBug: '`AccountInfo` 向运行时什么都没要 —— 连签名都没要。这一行就是全部的漏洞。',
    noteStateChange: '伤害落点：vault 账户里的一个 u64。',

    contractLive: '正在 {cluster} 上运行',

    excerptScope: '关键段落，逐字照录 —— 省略的行已标出',
    excerptElided: '… 省略 {n} 行 …',

    stageSetup: '金库建立',
    stageInstruction: '指令',
    stageAccounts: '账户',
    stageDeclaration: '账户声明',
    stageManualCheck: '手工校验',
    stageStateChange: '状态变更',

    sayCreateVault: '管理员建立金库 —— 把自己的地址写了进去。',
    sayCall: '有人调用合约，要取 500。',
    sayHandOver: '他交出了两个账户。',
    sayDeclaration: '运行时代合约检查声明 —— 声明里什么都没要求。',
    sayDeclarationFixed: '运行时代合约检查声明 —— 这个声明要求签名。',
    sayCompare: '合约代码比对两个地址。',
    sayStateChange: '余额被减掉 500。',

    compareStored: '合约里存着的',
    compareStoredFrom: '建金库时写进去的',
    compareSupplied: '调用者填的',
    compareSuppliedNote: 'Solana 上谁都能填，没人核对',

    badgeNoSignerRequired: '未要求签名',
    badgeSignerRequired: '要求签名',

    execute: '执行攻击',
    versionVulnerable: '漏洞版',
    versionFixed: '修复版',
    ariaLanguage: '语言',

    txTitle: '交易',
    txNoteProgram: '已部署的那一份',
    txNoteVaultTarget: '被掏空的那个 vault',
    txNoteAdminPresent: '管理员地址在场',
    txNoteSigned: '已签名',
    txNoteSignatureAbsent: '签名缺席',
    ariaSignaturePresent: '签名已提供',
    ariaSignatureAbsent: '签名缺席',
    demoNoTarget: '现在没有一个它敢如实指着说「就它」的目标。',

    walletConnect: '连接钱包',
    walletDisconnect: '断开',
    walletConnected: '已连接',
    walletMissing: '此浏览器未检测到 Solana 钱包。',
    executeOnDevnet: '在 {cluster} 上执行',
    chainRunning: '正在发送交易…',
    chainNeedSol: '这需要一点 {cluster} SOL 付手续费。',
    chainExhausted: '预备的 vault 池已用尽。重跑建池脚本即可补充。',
    chainFixedNotDeployed: '修复版未部署，因此这里的拒绝来自动画。',
    chainTxFailed: '交易被运行时拒绝。',
    chainAttemptFailed: '这次尝试没能完成，因此没有链上结论。',
    chainRealSignature: '本次运行的签名',
    chainNotLamports: 'vault 的余额是账户里的一个数字，并不涉及 lamport 转移。',
    ariaWallet: '钱包',

    resultSuccessTitle: '攻击成功',
    resultSuccessBody: '金库已被掏空。攻击者自始至终没有签名。',
    resultRejectedTitle: '交易被拒绝',
    resultRejectedBody: '缺少签名者。访问被拒绝。',

    verifyToggle: '链上验证',
    verifyClaimDeployed: '这不是动画。这个漏洞是真实的、已部署的，可以在 {cluster} 上复现。',
    verifyClaimNotDeployed:
      '这里还没有任何东西被部署。动画忠实还原了本仓库中的合约源码，但在程序完成编译与部署之前，它没有对应的程序 ID 和交易。',
    verifyVulnerableProgram: '漏洞版程序',
    verifyAttackTx: '攻击交易',
    verifyVaultBalance: '金库余额',
    verifyBalanceUnchanged: '未变动 —— 被拒绝的交易不改变任何状态',
    verifyFixedProgram: '修复版程序',
    verifySameCall: '同一调用，修复版',
    verifyPending: '尚未部署',
    ariaVerifyRegion: '链上验证',

    closingFixIsDeclaration:
      "修复是一个声明，而不是一行逻辑：Signer<'info> 让你的 handler 跑起来之前，运行时就已经要求签名；AccountInfo<'info> 什么都没要求。",
    closingRealWorld:
      'Solend，2021-08-19——同一族问题的另一面：授权校验太弱，被一个攻击者自己创建并拥有的 Lending Market 绕过。约 $2M 一度处于风险中，攻击者一分钱都没拿走。唯一动过的资金是约 $16k 的误清算——5 个账户，是 Solend 自己的清算机器人下的手——已全额补偿。',
    closingSourceNote: '事件细节转引自 Solend 自己的事件报告（SLND-INCDT-01），经 Quadriga 案例页。',
    closingLinksLabel: '出处与延伸',
    closingLinkSourceVulnerable: '漏洞版程序原文',
    closingLinkSourceFixed: '修复版程序原文',
    closingLinkSourceTests: '把攻击写成断言的测试',
    closingLinkSealevel: 'Anchor 文档 · Sealevel Attacks',
    closingLinkSolend: 'Solend 事件（2021-08-19）',
    ariaClosingRegion: '结语',

    fillTitle: '他只是把这个地址填了进去。',
    fillLede: '这个地址，在链上人人可见。管理员的公钥不是秘密 —— 公钥从来不是秘密。',
    fillNoHack: '没有破解。没有伪造。没有窃取密钥。他只是把一个公开信息，写进了那个位置。',
    fillNeedHeading: '平时需要什么才能动这个金库',
    fillNeedBody: '管理员的私钥 —— 用来签名',
    fillNowHeading: '现在只需要什么',
    fillNowBody: '管理员的地址 —— 公开信息',

    compareResult: '地址匹配 → 检查通过',

    whyTitle: '因为你在以太坊里这么写过，而它是对的。',
    whyEthTitle: 'Solidity · 以太坊',
    whySolTitle: 'Rust · Solana 合约',
    whySolidityBody:
      'msg.sender 是协议根据交易签名算出来的。协议层已经验证过签名了，所以「比对地址」就是在验证身份。',
    whySolidityVerdict: '这行代码正确、充分、没问题。',
    whySolBody: 'Solana 没有 msg.sender。这里的 authority 只是别人递进来的一个公钥。',
    whySolVerdict: '它什么都不证明。',
    whyTableColEth: '以太坊',
    whyTableColSol: 'Solana 链',
    whyTableStateLabel: '状态在哪',
    whyTableStateEth: '在合约里面',
    whyTableStateSol: '在别人递进来的账户里',
    whyTableCallerLabel: '调用者是谁',
    whyTableCallerEth: '协议告诉你',
    whyTableCallerSol: '不告诉你 —— 除非你声明 Signer',
    whyConclusion: '以太坊里，「你是谁」是协议告诉你的。Solana 里，「你是谁」得你自己要求。',
    whyNote:
      '所以一个写惯 Solidity 的人，手会自己敲出那行 require! —— 它长得和 Solidity 的检查一模一样，而且看起来更稳妥。它编译通过、测试通过、评审也容易滑过去。',

    fixTitle: '改一行。',
    fixLede: '不是加一行检查，是改一行声明。',
    fixBody: '就这。漏洞不在那行 require! 里 —— 那行本来就是对的，它确实该比对地址。',
    fixBodyDeclaration: '漏洞在这一行声明：它向运行时什么都没要。',
    fixNote: '两个版本，全文只差这一行。',

    retryTitle: '打修复版。',
    retryNote: '合约代码一行都没有执行。攻击者的圆点撞在「账户声明」那一格上就停住了 —— 那是运行时替他挡的。',
    retryTableHeading: '两版并排',
    retryTableRuntimeLabel: '「运行时」那一格里写着',
    retryTableRuntimeVuln: '无要求',
    retryTableRuntimeFixed: 'authority 必须签名',
    retryTableSigLabel: '交易上的签名数',
    retryTableSigVuln: '1 个',
    retryTableSigFixed: '1（不够）',
    retryTableResultLabel: '结果',
    retryTableResultVuln: '攻击成功',
    retryTableResultFixed: '交易被拒',
    retryConclusion: '两版的差别，只有那一格里写的东西。',
  },
};

/**
 * A stage name for display. English gets the term alone; Chinese gets the
 * Chinese term with the canonical English beside it, so a reader can map what
 * they are learning onto the term they will meet in every other document.
 */
export function bilingualName(
  language: Language,
  key: LayerNameKey,
): { primary: string; secondary?: string } {
  const primary = MESSAGES[language][key];
  if (language === 'en') return { primary };

  const secondary = MESSAGES.en[key];
  return secondary && secondary !== primary ? { primary, secondary } : { primary };
}

export const LANGUAGES: { id: Language; label: string }[] = [
  // Language names are written in their own language on purpose: someone who
  // cannot read the current UI still has to be able to find their way out.
  { id: 'en', label: 'EN' },
  { id: 'zh', label: '中文' },
];
