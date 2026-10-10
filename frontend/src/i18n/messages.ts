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

export type Language = 'en' | 'zh';

export interface Messages {
  /* Step 1 */
  step1Title: string;

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
  txNoteAttackerOwned: string;
  txNoteAdminPresent: string;
  txNoteSigned: string;
  txNoteSignatureAbsent: string;
  ariaSignaturePresent: string;
  ariaSignatureAbsent: string;

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
  closingLinkSealevelRepo: string;
  closingLinkAccountTypes: string;
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
    txNoteAttackerOwned: 'attacker-owned',
    txNoteAdminPresent: 'admin address present',
    txNoteSigned: 'signed',
    txNoteSignatureAbsent: 'signature absent',
    ariaSignaturePresent: 'signature present',
    ariaSignatureAbsent: 'signature absent',

    resultSuccessTitle: 'Attack Successful',
    resultSuccessBody: 'Vault drained. The attacker never signed.',
    resultRejectedTitle: 'Transaction Rejected',
    resultRejectedBody: 'Missing signer. Access denied.',

    verifyToggle: 'Verify on-chain',
    verifyClaimDeployed:
      'This is not an animation. The exploit is real, deployed, and reproducible on Devnet.',
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
      'This is not hypothetical — the Anchor docs treat this class of attack as required reading before mainnet. In August 2021 Solend was attacked through the same gap in another form: an authorization check was too weak, and the attacker passed a lending market they had created and owned themselves. About $2M was put at risk, and the team caught it before any funds were taken.',
    closingSourceNote:
      'Incident details relayed from the Solend incident report (SLND-INCDT-01) via the Quadriga case file.',
    closingLinksLabel: 'Where this comes from',
    closingLinkSourceVulnerable: 'the vulnerable program, verbatim',
    closingLinkSourceFixed: 'the fixed program, verbatim',
    closingLinkSourceTests: 'the attack, as assertions',
    closingLinkSealevel: 'Anchor docs · Sealevel Attacks',
    closingLinkSealevelRepo: 'sealevel-attacks source',
    closingLinkAccountTypes: 'Anchor docs · Account Types',
    closingLinkSolend: 'Solend incident, 2021-08-19',
    ariaClosingRegion: 'Closing note',
  },

  zh: {
    step1Title: '什么是智能合约？',

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
    txNoteAttackerOwned: '攻击者所有',
    txNoteAdminPresent: '管理员地址在场',
    txNoteSigned: '已签名',
    txNoteSignatureAbsent: '签名缺席',
    ariaSignaturePresent: '签名已提供',
    ariaSignatureAbsent: '签名缺席',

    resultSuccessTitle: '攻击成功',
    resultSuccessBody: '金库已被掏空。攻击者自始至终没有签名。',
    resultRejectedTitle: '交易被拒绝',
    resultRejectedBody: '缺少签名者。访问被拒绝。',

    verifyToggle: '链上验证',
    verifyClaimDeployed: '这不是动画。这个漏洞是真实的、已部署的，可以在 Devnet 上复现。',
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
      '这不是假想：Anchor 官方文档把这类攻击列为上主网前的必读。2021 年 8 月，Solend 被同一族问题的另一面击中——授权校验不够强，攻击者传入了一个自己创建并拥有的 Lending Market。约 $2M 一度处于风险中，团队在资金被拿走之前拦下了。',
    closingSourceNote: '事件细节转引自 Solend 自己的事件报告（SLND-INCDT-01），经 Quadriga 案例页。',
    closingLinksLabel: '出处与延伸',
    closingLinkSourceVulnerable: '漏洞版程序原文',
    closingLinkSourceFixed: '修复版程序原文',
    closingLinkSourceTests: '把攻击写成断言的测试',
    closingLinkSealevel: 'Anchor 文档 · Sealevel Attacks',
    closingLinkSealevelRepo: 'sealevel-attacks 源码',
    closingLinkAccountTypes: 'Anchor 文档 · Account Types',
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
