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

  /* Verify panel */
  verifyToggle: string;
  verifyClaim: string;
  verifyVulnerableProgram: string;
  verifyAttackTx: string;
  verifyVaultBalance: string;
  verifyFixedProgram: string;
  verifySameCall: string;
  verifyPending: string;
  verifyVideoNote: string;
  ariaVerifyRegion: string;
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
    verifyClaim:
      'This is not an animation. The exploit is real, deployed, and reproducible on Devnet.',
    verifyVulnerableProgram: 'Vulnerable program',
    verifyAttackTx: 'Attack transaction',
    verifyVaultBalance: 'Vault balance',
    verifyFixedProgram: 'Fixed program',
    verifySameCall: 'Same call, fixed build',
    verifyPending: 'awaiting Phase 4',
    verifyVideoNote: 'Recorded walkthrough (demo-verify.mp4) is added in Phase 4.',
    ariaVerifyRegion: 'On-chain verification',
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
    verifyClaim: '这不是动画。这个漏洞是真实的、已部署的，可以在 Devnet 上复现。',
    verifyVulnerableProgram: '漏洞版程序',
    verifyAttackTx: '攻击交易',
    verifyVaultBalance: '金库余额',
    verifyFixedProgram: '修复版程序',
    verifySameCall: '同一调用，修复版',
    verifyPending: 'Phase 4 补上',
    verifyVideoNote: '录屏（demo-verify.mp4）将在 Phase 4 补上。',
    ariaVerifyRegion: '链上验证',
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
