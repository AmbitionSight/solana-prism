import { describe, it, expect } from 'vitest';
import { PENDING, PLATFORM, isDeployed, isFilled, solscanAccountUrl, solscanTxUrl } from '../verification';
import { POOL_SIZE } from '../../lib/devnet';
import { MESSAGES } from '../../i18n/messages';

const PANEL_SOURCES = import.meta.glob(['../../components/VerifyPanel.tsx'], {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/**
 * A line mentioning the deployed claim is only allowed to do so on the
 * `deployed ?` side of a ternary.
 *
 * This exists because the claim is the one sentence in the demo that must not be
 * wrong. "The exploit is real, deployed, and reproducible on Testnet" is true the
 * moment a program id and a signature are filled in, and false — worse than
 * useless — at every moment before that. Types cannot catch it, and a screenshot
 * of the panel shows whatever state you happened to be in, so the source is
 * scanned instead.
 */
function deployedClaimIsGated(line: string): boolean {
  return /deployed \?/.test(line);
}

/**
 * This file guards the *platform* half of what used to be one `VERIFICATION`
 * object: the cluster, the RPC, the faucet and the pool size. The lesson half —
 * the program ids, the admin address and the run evidence — moved into the
 * lesson folder and is guarded by `lesson.test.ts` against the shipped bytes.
 */
describe('platform chain config', () => {
  it('已填值判定', () => {
    expect(isFilled('abc')).toBe(true);
    expect(isFilled(PENDING)).toBe(false);
    expect(isFilled('')).toBe(false);
  });

  it('Solscan 交易链接指向 testnet', () => {
    expect(solscanTxUrl('SIG123')).toBe('https://solscan.io/tx/SIG123?cluster=testnet');
  });

  it('Solscan 账户链接指向 testnet', () => {
    expect(solscanAccountUrl('ADDR123')).toBe(
      'https://solscan.io/account/ADDR123?cluster=testnet',
    );
  });

  it('可覆盖 cluster', () => {
    expect(solscanTxUrl('SIG', 'mainnet-beta')).toBe(
      'https://solscan.io/tx/SIG?cluster=mainnet-beta',
    );
  });

  it('RPC 端点绕开被封的 solana.com', () => {
    // api.testnet.solana.com is DNS-poisoned on this network; the demo carries
    // the endpoint that works as data instead of hardcoding it in the client.
    expect(PLATFORM.rpcEndpoint).toBe('https://testnet.rpcpool.com');
  });

  it('poolSize 与 devnet.ts 的 POOL_SIZE 是同一个数', () => {
    // Two copies of the pool size would eventually disagree, and the scan would
    // stop short of the pool or walk past it.
    expect(PLATFORM.poolSize).toBe(POOL_SIZE);
  });

  it('faucet 地址是配置项, 不在代码里散落', () => {
    expect(PLATFORM.faucetUrl).toMatch(/^https:\/\//);
  });
});

describe('isDeployed — 由数据推导，不是开关', () => {
  it('程序 ID 与签名都填了才算已部署', () => {
    expect(isDeployed({ vulnerableProgramId: 'Prog', attackTxSignature: 'Sig' })).toBe(true);
  });

  it('只填程序 ID 不算', () => {
    expect(isDeployed({ vulnerableProgramId: 'Prog', attackTxSignature: PENDING })).toBe(false);
  });

  it('只填签名不算', () => {
    expect(isDeployed({ vulnerableProgramId: PENDING, attackTxSignature: 'Sig' })).toBe(false);
  });
});

describe('未部署时不得声称已部署', () => {
  it('确实读到了面板源码', () => {
    // A guard over file contents is worthless if it reads no files: with
    // Vitest's default settings a `?raw` import can resolve to an empty string,
    // and this suite would pass while checking nothing.
    const files = Object.entries(PANEL_SOURCES);
    expect(files.length).toBeGreaterThan(0);
    expect(files.every(([, source]) => source.length > 0)).toBe(true);
  });

  it('两种话术是两条不同的文案', () => {
    for (const language of ['en', 'zh'] as const) {
      expect(MESSAGES[language].verifyClaimNotDeployed).not.toBe(
        MESSAGES[language].verifyClaimDeployed,
      );
    }
  });

  it('未部署话术里不含"已部署"的断言', () => {
    for (const language of ['en', 'zh'] as const) {
      expect(MESSAGES[language].verifyClaimNotDeployed).not.toMatch(/reproducible/i);
    }
  });

  it('已部署话术只出现在 isDeployed 为真的一侧', () => {
    const offenders: string[] = [];
    for (const [path, source] of Object.entries(PANEL_SOURCES)) {
      for (const line of source.split('\n')) {
        if (!line.includes('verifyClaimDeployed')) continue;
        if (!deployedClaimIsGated(line)) offenders.push(`${path}: ${line.trim()}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('这条守卫本身必须会失败', () => {
  it('认得出写死的已部署话术', () => {
    expect(deployedClaimIsGated('<p>{t.verifyClaimDeployed}</p>')).toBe(false);
  });

  it('放过挂在三元里的话术', () => {
    expect(
      deployedClaimIsGated('{deployed ? t.verifyClaimDeployed : t.verifyClaimNotDeployed}'),
    ).toBe(true);
  });
});
