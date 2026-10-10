/**
 * demoAttack.ts — Execute's real run, wired once so App and its test run the
 * same code.
 *
 * `executeChainRun` in `devnetRun.ts` already knows how to plan a target, hand
 * it to `onTarget`, and report the outcome to `onResult`. The only thing missing
 * for the no-wallet path is the ports: `demoSigner`'s key rather than a wallet's.
 * That wiring lives here, rather than inline in `App.tsx`, so the one property
 * that matters — that this path needs no wallet, no provider, no connection
 * prompt — is a thing a unit test can assert without a browser.
 */

import type { AccountConnection, AttackConnection } from './solanaChain';
import { createVaultReader, demoAttackPorts } from './solanaChain';
import { executeChainRun, type ChainPlanConfig, type ChainRunHooks } from './devnetRun';

/**
 * Plan and run the attack with the demo key.
 *
 * A real `Connection` satisfies both connection shapes; the intersection keeps
 * the signature honest about what is actually used, and lets a test pass a fake.
 */
export function executeDemoAttack(
  connection: AttackConnection & AccountConnection,
  config: ChainPlanConfig,
  hooks: ChainRunHooks,
  cancelled?: () => boolean,
): Promise<void> {
  return executeChainRun(
    {
      config,
      read: createVaultReader(connection),
      // No provider, no wallet: the demo key signs. The program id still comes
      // from the plan, so the selected build decides which program is called.
      portsFor: (programId) => demoAttackPorts(connection, programId),
      cancelled,
    },
    hooks,
  );
}
