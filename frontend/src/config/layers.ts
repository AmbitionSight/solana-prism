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
 *   (1) Instruction          what was called
 *   (2) Accounts             which accounts were handed over
 *   (3) Account Declaration  what the program demands of them   <- the flaw
 *   (4) Manual Check         what the handler checks itself
 *   (5) State Change         what gets written
 *
 * Stage 3 versus stage 4 is the lesson: declared constraints are enforced for
 * free, hand-written checks are enforced only if you remember to write them.
 *
 * `scatter` values are offsets from the centre of the stage, in px.
 */

import type { LayerNameKey } from '../i18n/messages';

export interface ContractLayer {
  /** Display id, e.g. 'S3'. Also the React key — must be stable. */
  id: string;
  /** Catalogue key for the stage name, resolved per language at render time. */
  nameKey: LayerNameKey;
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
  /**
   * Who makes this stage happen.
   *
   * The distinction is the whole lesson: stages 1 and 2 are what the caller
   * does, stage 3 is what the *runtime* does on the program's behalf (from its
   * declaration alone, before any program code runs), and 4 and 5 are the
   * program's own code.
   */
  enforcedBy: 'caller' | 'runtime' | 'code';
  /** Offset from stage centre used by the decompose animation. */
  scatter: { x: number; y: number };
}

/** The vulnerable `prism_vulnerable` withdraw path, top stage first. */
export const VAULT_LAYERS: ContractLayer[] = [
  {
    id: 'S1',
    nameKey: 'stageInstruction',
    code: 'withdraw(ctx, amount: 500)',
    isSecurityLayer: false,
    broken: false,
    enforcedBy: 'caller',
    scatter: { x: -220, y: -110 },
  },
  {
    id: 'S2',
    nameKey: 'stageAccounts',
    code: 'vault · authority',
    isSecurityLayer: false,
    broken: false,
    enforcedBy: 'caller',
    scatter: { x: 220, y: -90 },
  },
  {
    id: 'S3',
    nameKey: 'stageDeclaration',
    code: "authority: AccountInfo<'info>",
    codeWhenFixed: "authority: Signer<'info>",
    isSecurityLayer: true,
    broken: true,
    enforcedBy: 'runtime',
    scatter: { x: -200, y: 70 },
  },
  {
    id: 'S4',
    nameKey: 'stageManualCheck',
    code: 'require!(vault.authority == authority.key())',
    isSecurityLayer: false,
    broken: false,
    enforcedBy: 'code',
    scatter: { x: 210, y: 90 },
  },
  {
    id: 'S5',
    nameKey: 'stageStateChange',
    code: 'vault.balance -= amount',
    isSecurityLayer: false,
    broken: false,
    enforcedBy: 'code',
    scatter: { x: 0, y: 160 },
  },
];
