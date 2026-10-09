/**
 * layers.ts — data-driven decomposition of an Anchor program.
 *
 * The whole demo is generated from this array: the number of cards, their
 * content, which one is the security layer, and where each one flies to during
 * the decompose animation. Adding a different contract later means adding a
 * different array — no component changes.
 *
 * `scatter` values are offsets from the centre of the stage, in px.
 */

export interface ContractLayer {
  /** Display id, e.g. 'L3'. Also the React key — must be stable. */
  id: string;
  /** Human-readable layer name, shown to the right of the stacked card. */
  name: string;
  /** The line of contract code this layer abstracts. */
  code: string;
  /** True for the layer that carries the access-control check. */
  isSecurityLayer: boolean;
  /** True when this build of the contract has the flaw in this layer. */
  broken: boolean;
  /** Offset from stage centre used by the decompose animation. */
  scatter: { x: number; y: number };
}

/** The vulnerable `xray_vault` withdraw path, top layer first. */
export const VAULT_LAYERS: ContractLayer[] = [
  {
    id: 'L5',
    name: 'Instruction',
    code: 'pub fn withdraw(ctx, amount) -> Result<()>',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: -220, y: -110 },
  },
  {
    id: 'L4',
    name: 'Account State',
    code: 'struct Vault { authority, balance }',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 220, y: -90 },
  },
  {
    id: 'L3',
    name: 'Access Control',
    code: 'require!(vault.authority == authority.key())',
    isSecurityLayer: true,
    broken: true,
    scatter: { x: -200, y: 70 },
  },
  {
    id: 'L2',
    name: 'Business Logic',
    code: 'vault.balance -= amount',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 210, y: 90 },
  },
  {
    id: 'L1',
    name: 'Runtime',
    code: '#[derive(Accounts)] struct Withdraw',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 0, y: 160 },
  },
];
