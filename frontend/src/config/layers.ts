/**
 * layers.ts — the shape of one stage of a lesson.
 *
 * This module used to carry `VAULT_LAYERS`, the six stage nodes of lesson one,
 * hard-wired into the app. They are now data in the lesson folder
 * (`public/lessons/missing-signer/lesson.json`), fetched at runtime, so a second
 * lesson can ship its own stages without a code change. What remains here is the
 * shape those stages must have — the same shape for every lesson.
 *
 * On Solana you *declare* what an account must be and the runtime enforces it
 * before your handler runs. That declaration is where this lesson's bug lives,
 * so it is where the crack belongs:
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
 */

import type { LayerNameKey, MessageKey } from '../i18n/messages';

/**
 * A stage whose card holds two values against each other rather than leading
 * with a sentence and one code line — only stage 4 of lesson one.
 *
 * Deliberately a description rather than the values: it carries the catalogue
 * keys for the two labels and the two notes, while the one address that exists
 * stays with the lesson's verification data (`verification.adminPubkey`), elided
 * at render. A literal address here would be as stale as one written into copy.
 *
 * The result key is present in the data, but the card renders it only when the
 * caller's slot is filled — the attack page, not page 3.
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
  /**
   * What holding the two values against each other concludes. The card shows it
   * only once the caller's slot is filled. Kept here rather than in the
   * component so the comparison stays data.
   */
  resultKey: MessageKey;
}

export interface ContractLayer {
  /** Display id, e.g. 'S3'. Also the React key — must be stable. */
  id: string;
  /** Catalogue key for the stage name, resolved per language at render time. */
  nameKey: LayerNameKey;
  /**
   * Catalogue key for the stage's sentence — the plain-language line the card
   * leads with, with `code` beneath it as the evidence. The sentence is what
   * carries who makes the stage happen ("the runtime…", "the program…").
   */
  sayKey: MessageKey;
  /**
   * What the sentence reads as once the contract is fixed. Only the declaration
   * stage differs: on the repaired build its declaration demands a signature, so
   * the vulnerable sentence would contradict the green card it sits on.
   */
  sayWhenFixed?: MessageKey;
  /** The code this stage abstracts, as it reads in the vulnerable build. */
  code: string;
  /**
   * What this line reads as once the contract is fixed. Only the declaration
   * stage's declaration changes.
   */
  codeWhenFixed?: string;
  /**
   * Present only on a stage that renders a comparison instead of a bare
   * sentence. This is the discriminator — the card branches on the data being
   * there, never on the stage's id.
   */
  compare?: ComparisonSpec;
  /** True for the stage that carries the flaw. */
  isSecurityLayer: boolean;
  /** True when this build of the contract has the flaw in this stage. */
  broken: boolean;
  /** Offset from stage centre used by the decompose animation, in px. */
  scatter: { x: number; y: number };
}
