/**
 * layers.ts — data-driven decomposition of an Anchor program.
 *
 * The whole demo is generated from this array: the number of cards, their
 * content, which one is the security layer, and where each one flies to during
 * the decompose animation. Adding a different contract later means adding a
 * different array — no component changes.
 *
 * `scatter` values are offsets from the centre of the stage, in px.
 *
 * The display name is a message key rather than a literal, because it is
 * language-dependent; `code` stays a literal because Rust reads the same in
 * every language.
 */

import type { LayerNameKey } from '../i18n/messages';

export interface ContractLayer {
  /** Display id, e.g. 'L3'. Also the React key — must be stable. */
  id: string;
  /** Catalogue key for the layer name, resolved per language at render time. */
  nameKey: LayerNameKey;
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
    nameKey: 'layerInstruction',
    code: 'pub fn withdraw(ctx, amount) -> Result<()>',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: -220, y: -110 },
  },
  {
    id: 'L4',
    nameKey: 'layerAccountState',
    code: 'struct Vault { authority, balance }',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 220, y: -90 },
  },
  {
    id: 'L3',
    nameKey: 'layerAccessControl',
    code: 'require!(vault.authority == authority.key())',
    isSecurityLayer: true,
    broken: true,
    scatter: { x: -200, y: 70 },
  },
  {
    id: 'L2',
    nameKey: 'layerBusinessLogic',
    code: 'vault.balance -= amount',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 210, y: 90 },
  },
  {
    id: 'L1',
    nameKey: 'layerRuntime',
    code: '#[derive(Accounts)] struct Withdraw',
    isSecurityLayer: false,
    broken: false,
    scatter: { x: 0, y: 160 },
  },
];
