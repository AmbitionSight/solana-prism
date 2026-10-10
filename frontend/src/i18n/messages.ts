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

  /* Code card — the Rust itself is language-independent, only comments differ */
  codeCommentBug: string;
  codeCommentAddressOnly: string;

  /* The five stages of one instruction, in execution order.
     In Chinese these render as "中文 English" — see bilingualName. */
  stageInstruction: string;
  stageAccounts: string;
  stageDeclaration: string;
  stageManualCheck: string;
  stageStateChange: string;

  /* Stage 3's badge — the flaw, stated plainly */
  badgeNoSignerRequired: string;
  badgeSignerRequired: string;

  /* Controls */
  replay: string;
  execute: string;
  versionVulnerable: string;
  versionFixed: string;
  ariaContractVersion: string;
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
  verifyFixedProgram: string;
  verifySameCall: string;
  verifyPending: string;
  verifyVideoNote: string;
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
}

export type MessageKey = keyof Messages;

/** The five stage names, so `bilingualName` can be typed narrowly. */
export type LayerNameKey =
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

    codeCommentBug: 'CHECK: address only — no signature required. This is the bug.',
    codeCommentAddressOnly: 'the address matches — but who signed was never checked',

    stageInstruction: 'Instruction',
    stageAccounts: 'Accounts',
    stageDeclaration: 'Account Declaration',
    stageManualCheck: 'Manual Check',
    stageStateChange: 'State Change',

    badgeNoSignerRequired: 'No signature required',
    badgeSignerRequired: 'Signature required',

    replay: 'Replay',
    execute: 'Execute',
    versionVulnerable: 'Vulnerable',
    versionFixed: 'Fixed',
    ariaContractVersion: 'Contract version',
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
    verifyFixedProgram: 'Fixed program',
    verifySameCall: 'Same call, fixed build',
    verifyPending: 'not deployed yet',
    verifyVideoNote: 'Recorded walkthrough (demo-verify.mp4) is added once there is something real to record.',
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
  },

  zh: {
    step1Title: '什么是智能合约？',

    noteDeclareId: '这个构建编译进去的地址 —— 链上跑的就是它。',
    noteStructNotSigner: '账户清单。`authority` 在这一段被声明。',
    noteHandlerRequires: '处理函数。它只在运行时满意之后才会执行。',
    noteTheBug: '`AccountInfo` 向运行时什么都没要 —— 连签名都没要。这一行就是全部的漏洞。',
    noteStateChange: '伤害落点：vault 账户里的一个 u64。',

    contractLive: '正在 {cluster} 上运行',

    codeCommentBug: 'CHECK: 只查地址，不要求签名 —— 漏洞就在这里',
    codeCommentAddressOnly: '地址对得上就放行 —— 但从没验过是谁签的名',

    stageInstruction: '指令',
    stageAccounts: '账户',
    stageDeclaration: '账户声明',
    stageManualCheck: '手工校验',
    stageStateChange: '状态变更',

    badgeNoSignerRequired: '未要求签名',
    badgeSignerRequired: '要求签名',

    replay: '重播',
    execute: '执行攻击',
    versionVulnerable: '漏洞版',
    versionFixed: '修复版',
    ariaContractVersion: '合约版本',
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
    verifyFixedProgram: '修复版程序',
    verifySameCall: '同一调用，修复版',
    verifyPending: '尚未部署',
    verifyVideoNote: '录屏（demo-verify.mp4）要等真的跑通之后才有东西可录。',
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
