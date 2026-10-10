import { describe, it, expect } from 'vitest';
import { PublicKey, Transaction } from '@solana/web3.js';
import { executeDemoAttack } from '../demoAttack';
import { demoSigner } from '../../config/demoSigner';
import {
  INITIAL_BALANCE,
  POOL_SIZE,
  VAULT_DISCRIMINATOR,
  VAULT_SPACE,
  vaultAddress,
} from '../devnet';
import type { ChainPlanConfig } from '../devnetRun';

/**
 * Execute is no longer gated behind a wallet.
 *
 * The old default path could reach a verdict with no chain at all (it derived
 * one from the selected build). This pins the new property: the composition the
 * Execute button runs — `executeDemoAttack` — takes no provider and no wallet,
 * and still produces a *real* result, signed by the demo key.
 *
 * The fake connection plays the same role it does everywhere else: no network.
 */

const VULNERABLE_ID = '7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2';
const FIXED_ID = '9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq';
const ADMIN = 'DMkwnXZ6Gy7X8fkzSyBCdCuk3E2CFrwCmhV9A44qGU7T';
const BLOCKHASH = 'EkSnNWid2cvwEVnVx9aBqawnmiCNiDgp3gUdkDPTKN1N';

/** A Vault account as the program lays it out: 8 + 32 + 8 bytes. */
function vaultData(authority: string, balance: number): Uint8Array {
  const data = new Uint8Array(VAULT_SPACE);
  data.set(VAULT_DISCRIMINATOR, 0);
  data.set(new PublicKey(authority).toBytes(), 8);
  new DataView(data.buffer).setBigUint64(40, BigInt(balance), true);
  return data;
}

function config(overrides: Partial<ChainPlanConfig> = {}): ChainPlanConfig {
  return {
    isFixed: false,
    vulnerableProgramId: VULNERABLE_ID,
    fixedProgramId: FIXED_ID,
    adminPubkey: ADMIN,
    poolSize: POOL_SIZE,
    ...overrides,
  };
}

/**
 * A connection stand-in. Only pool vault 0 exists and it is read through
 * `getAccountInfo`; every submission confirms success. No network.
 */
function fakeConnection(vault0: Uint8Array | null = vaultData(ADMIN, INITIAL_BALANCE)) {
  const sent: Uint8Array[] = [];
  const connection = {
    getLatestBlockhash: async () => ({ blockhash: BLOCKHASH, lastValidBlockHeight: 99 }),
    sendRawTransaction: async (raw: Uint8Array) => {
      sent.push(raw);
      return 'SIG_DEMO';
    },
    getSignatureStatuses: async () => ({
      context: { slot: 1 },
      value: [{ err: null, confirmationStatus: 'confirmed' }],
    }),
    getAccountInfo: async (address: PublicKey) =>
      vault0 && vaultAddress(0).equals(address)
        ? // Owned by the program this run attacks, so the scanner accepts it.
          { owner: new PublicKey(VULNERABLE_ID), data: vault0 }
        : null,
  };

  return { connection: connection as never, sent };
}

describe('executeDemoAttack — Execute 不再需要钱包', () => {
  it('没有 provider/wallet, 用 demo 键也能拿到链上的真实结果', async () => {
    const { connection, sent } = fakeConnection();
    const targets: string[] = [];
    const results: unknown[] = [];

    await executeDemoAttack(connection, config(), {
      onTarget: (target) => targets.push(target.vault.toBase58()),
      onResult: (result) => results.push(result),
    });

    // A real target, a real submission, the chain's own verdict — with no wallet
    // anywhere in the call.
    expect(targets).toEqual([vaultAddress(0).toBase58()]);
    expect(results).toEqual([{ kind: 'success', signature: 'SIG_DEMO' }]);

    const rebuilt = Transaction.from(sent[0]);
    const demo = demoSigner();
    expect(rebuilt.feePayer?.equals(demo.publicKey)).toBe(true);
    expect(rebuilt.signatures.map((s) => s.publicKey.toBase58())).toEqual([
      demo.publicKey.toBase58(),
    ]);
  });

  it('池子空了就不发交易, 也不假装成功', async () => {
    // Every vault reads as already drained, so nothing is fresh.
    const { connection, sent } = fakeConnection(vaultData(ADMIN, 500));
    const results: unknown[] = [];
    let planned = 0;

    await executeDemoAttack(connection, config(), {
      onTarget: () => {
        planned += 1;
      },
      onResult: (result) => results.push(result),
    });

    expect(planned).toBe(0);
    expect(sent).toEqual([]);
    expect(results).toEqual([{ kind: 'exhausted' }]);
  });
});
