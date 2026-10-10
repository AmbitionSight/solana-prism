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

/**
 * A stage whose card holds two values against each other rather than leading
 * with a sentence and one code line — only stage 4.
 *
 * Deliberately a description rather than the values: it carries the catalogue
 * keys for the two labels and the two notes, while the one address that exists
 * stays where every other address in the demo lives
 * (`VERIFICATION.adminPubkey`), elided at render. A literal address here would
 * be as stale as one written into the copy.
 *
 * There is no result key. The caller's side is blank on this page, so the
 * comparison has no outcome to show yet; the result arrives with the attack,
 * when the second slot is actually filled.
 */
export interface ComparisonSpec {
  /** Label for the value the vault stored (written at S0). */
  storedKey: MessageKey;
  /** Where that value came from — the stage that wrote it. */
  storedFromKey: MessageKey;
  /** Label for the value the caller supplies with this call. */
  suppliedKey: MessageKey;
  /**
   * A fact about the platform, not a back-reference: on Solana the caller
   * supplies this value and nothing checks who they are.
   */
  suppliedNoteKey: MessageKey;
}

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
  /**
   * Present only on a stage that renders a comparison instead of a bare
   * sentence: two labelled values, their origin and the result of holding them
   * against each other. This is the discriminator — the card branches on the
   * data being there, never on the stage's id.
   */
  compare?: ComparisonSpec;
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
    // The only stage that shows *what* is compared: the vault's stored
    // authority against the address this call hands over. Only the vault's side
    // has a value here; the caller's side is left blank, because on Solana the
    // caller supplies it and nothing checks who they are. Filling that blank is
    // the attack, and the attack is a later page.
    compare: {
      storedKey: 'compareStored',
      storedFromKey: 'compareStoredFrom',
      suppliedKey: 'compareSupplied',
      suppliedNoteKey: 'compareSuppliedNote',
    },
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
