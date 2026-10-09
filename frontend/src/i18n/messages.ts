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
  codeCommentAuthority: string;
  codeCommentNoSigner: string;

  /* Layer names. In Chinese these render as "中文 English" — see bilingualName. */
  layerInstruction: string;
  layerAccountState: string;
  layerAccessControl: string;
  layerBusinessLogic: string;
  layerRuntime: string;

  /* Security-layer badge */
  badgeMissingSigner: string;
  badgeSignerVerified: string;

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

/** The five layer names, so `bilingualName` can be typed narrowly. */
export type LayerNameKey =
  | 'layerInstruction'
  | 'layerAccountState'
  | 'layerAccessControl'
  | 'layerBusinessLogic'
  | 'layerRuntime';

export const MESSAGES: Record<Language, Messages> = {
  en: {
    step1Title: 'What is a smart contract?',

    codeCommentAuthority: 'check the authority address matches',
    codeCommentNoSigner: 'but... there is no signature check!',

    layerInstruction: 'Instruction',
    layerAccountState: 'Account State',
    layerAccessControl: 'Access Control',
    layerBusinessLogic: 'Business Logic',
    layerRuntime: 'Runtime',

    badgeMissingSigner: '⚠️ Missing Signer Check',
    badgeSignerVerified: '🔒 Signer Verified',

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

    codeCommentAuthority: '检查 authority 地址是否匹配',
    codeCommentNoSigner: '但... 没有检查签名!',

    layerInstruction: '指令层',
    layerAccountState: '账户状态',
    layerAccessControl: '访问控制',
    layerBusinessLogic: '业务逻辑',
    layerRuntime: '运行时',

    badgeMissingSigner: '⚠️ 缺少签名校验',
    badgeSignerVerified: '🔒 签名已验证',

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
 * A layer name for display. English gets the term alone; Chinese gets the
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
