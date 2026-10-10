/**
 * layers.ts — the anatomy of one instruction, in the order it actually executes.
 *
 * This replaced an earlier five-"layer" model (Instruction / Account State /
 * Access Control / Business Logic / Runtime) that mixed categories — a code
 * construct, some data, two concerns and a platform, stacked as if they were
 * peers — and, worse, put the flaw in the wrong place. The old model painted the
 * crack on the body's `require!` line, but the repair is a change to the accounts
 * struct: `AccountInfo<'info>` becomes `Signer<'info>`.
 *
 * On Solana you *declare* what an account must be and the runtime enforces it
 * before your handler runs. That declaration is where this bug lives, so it is
 * where the crack belongs:
 *
 *   (0) Vault Setup          the vault is created and the admin's address written in
 *   (1) Instruction          what was called
 *   (2) Accounts             which accounts were handed over
 *   (3) Account Declaration  what the program demands of them   <- the flaw
 *   (4) Manual Check         what the handler checks itself
 *   (5) State Change         what gets written
 *
 * Stage 3 versus stage 4 is the lesson: declared constraints are enforced for
 * free, hand-written checks are enforced only if you remember to write them.
 *
 * Stage 0 is the antecedent the flow was missing: without `initialize` writing
 * `vault.authority`, there is no address for the later comparison to compare
 * against, and the story has no beginning.
 *
 * `scatter` values are offsets from the centre of the stage, in px.
 */

import type { LayerNameKey, MessageKey } from '../i18n/messages';

export interface ContractLayer {
  /** Display id, e.g. 'S3'. Also the React key — must be stable. */
  id: string;
  /** Catalogue key for the stage name, resolved per language at render time. */
  nameKey: LayerNameKey;
  /**
   * Catalogue key for the stage's sentence — the plain-language line the card
   * leads with, with `code` beneath it as the evidence. The sentence is what
   * carries who makes the stage happen ("the runtime…", "the program…"), which
   * is why there is no separate enforcer field any more.
   */
  sayKey: MessageKey;
  /** The code this stage abstracts, as it reads in the vulnerable build. */
  code: string;
  /**
   * What this line reads as once the contract is fixed. Only stage 3 differs:
   * the whole fix is that one declaration.
   */
  codeWhenFixed?: string;
  /** True for the stage that carries the flaw. */
  isSecurityLayer: boolean;
  /** True when this build of the contract has the flaw in this stage. */
  broken: boolean;
  /** Offset from stage centre used by the decompose animation. */
  scatter: { x: number; y: number };
}

/**
 * The vulnerable `prism_vulnerable` path, top stage first.
 *
 * S0 is where the flow now begins: `initialize` creates the vault and writes the
 * admin's address into it, which is the antecedent every later stage needs — the
 * comparison at S4 compares against what S0 wrote.
 */
export const VAULT_LAYERS: ContractLayer[] = [
  {
    id: 'S0',
    nameKey: 'stageSetup',
    sayKey: 'sayCreateVault',
    // Verbatim from `initialize` in the deployed file, not paraphrased.
    code: 'vault.authority = ctx.accounts.authority.key()',
    isSecurityLayer: false,
    broken: false,
    // Provisional: the decompose animation is a later task. Sits above the two
    // columns the other five form, so it reads as the step before them.
    scatter: { x: 0, y: -195 },
  },
  {
    id: 'S1',
    nameKey: 'stageInstruction',
    sayKey: 'sayCall',
    code: 'withdraw(ctx, amount: 500)',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: -220, y: -110 },
  },
  {
    id: 'S2',
    nameKey: 'stageAccounts',
    sayKey: 'sayHandOver',
    code: 'vault · authority',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 220, y: -90 },
  },
  {
    id: 'S3',
    nameKey: 'stageDeclaration',
    sayKey: 'sayDeclaration',
    code: "authority: AccountInfo<'info>",
    codeWhenFixed: "authority: Signer<'info>",
    isSecurityLayer: true,
    broken: true,
    scatter: { x: -200, y: 70 },
  },
  {
    id: 'S4',
    nameKey: 'stageManualCheck',
    sayKey: 'sayCompare',
    code: 'require!(vault.authority == authority.key())',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 210, y: 90 },
  },
  {
    id: 'S5',
    nameKey: 'stageStateChange',
    sayKey: 'sayStateChange',
    code: 'vault.balance -= amount',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 0, y: 160 },
  },
];
