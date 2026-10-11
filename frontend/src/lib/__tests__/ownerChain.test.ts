import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey } from '@solana/web3.js';
import {
  FORGE_DISCRIMINATOR,
  OPEN_VAULT_DISCRIMINATOR,
  OWNER_WITHDRAW_DISCRIMINATOR,
  VAULT_SEED,
  forgeAccounts,
  forgeInstructionData,
  openVaultAccounts,
  ownerWithdrawAccounts,
  ownerWithdrawInstructionData,
  planOwnerRun,
  solAmount,
  vaultPda,
} from '../ownerChain';

/**
 * No `Buffer` here on purpose: `tsconfig.app.json` pins `types: []`, so these
 * tests stay on plain typed arrays, exactly as `devnet.test.ts` does.
 */
function hex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

const VULNERABLE = '38hLgAJyNUnRiZvWVWAwTwt9cZMA6wzyPQm3QQDAdWJL';
const FIXED = 'BC5AtnTTYDfhrhxfng7JPUfoVwvcnvPrzuQsE7HpQW93';
const COUNTERFEIT = 'AKW7vUPNvueeG31GV7gRCRtPQyvsmvat4RnzjPXjxiHR';
const SYSTEM = new PublicKey('11111111111111111111111111111111');

describe('ownerChain — 判别符是两个真实的哈希切片', () => {
  // Each expected value is the first 8 bytes of sha256 over Anchor's naming
  // scheme, printed as hex. Written here rather than only in the source comment
  // so a selector cannot be edited to a plausible-looking wrong number.
  it('forge = sha256("global:forge")[0..8]', () => {
    expect(hex(FORGE_DISCRIMINATOR)).toBe('3f05d31cedc36e90');
  });

  it('withdraw = sha256("global:withdraw")[0..8] —— 与第一课同一个选择器', () => {
    expect(hex(OWNER_WITHDRAW_DISCRIMINATOR)).toBe('b712469c946da122');
  });

  it('open_vault = sha256("global:open_vault")[0..8]', () => {
    expect(hex(OPEN_VAULT_DISCRIMINATOR)).toBe('b5f8e44306af25a7');
  });
});

describe('ownerChain — 金库地址是 [b"vault"] 的 PDA', () => {
  it('种子恰好是 "vault"', () => {
    expect(hex(VAULT_SEED)).toBe('7661756c74');
  });

  it('两个构建的地址与链上读到的一致', () => {
    // Pinned to the addresses the deployed vaults actually sit at, read from
    // testnet — so a wrong seed or a wrong program id fails here, not on-chain.
    expect(vaultPda(new PublicKey(VULNERABLE)).toBase58()).toBe(
      '7XKEBJJR1rWLPYDmEQ5camjBxjWuHehc1SfsLf4tDEmb',
    );
    expect(vaultPda(new PublicKey(FIXED)).toBase58()).toBe(
      'AFENMertdYaKcKy6FWf8c9dj75fVeaniCjCKK43e1i8N',
    );
  });
});

describe('ownerChain — 指令数据', () => {
  it('forge 恰好 16 字节：选择器 + 小端 u64 —— 0.05 SOL', () => {
    expect(hex(forgeInstructionData(50_000_000))).toBe('3f05d31cedc36e9080f0fa0200000000');
  });

  it('withdraw 没有参数, 所以只有 8 字节选择器', () => {
    expect(ownerWithdrawInstructionData().length).toBe(8);
    expect(hex(ownerWithdrawInstructionData())).toBe('b712469c946da122');
  });
});

describe('ownerChain — 账户表按结构体声明顺序', () => {
  it('forge: forged(签名, 可写) · payer(签名) · system', () => {
    const forged = Keypair.generate().publicKey;
    const payer = Keypair.generate().publicKey;
    const accounts = forgeAccounts(forged, payer, SYSTEM);
    expect(accounts.map((a) => a.pubkey.toBase58())).toEqual([forged, payer].map((k) => k.toBase58()).concat(SYSTEM.toBase58()));
    expect(accounts.map((a) => [a.isSigner, a.isWritable])).toEqual([
      [true, true],
      [true, true],
      [false, false],
    ]);
  });

  it('open_vault: vault(可写, 非签名者) · authority(签名) · system', () => {
    const vault = Keypair.generate().publicKey;
    const authority = Keypair.generate().publicKey;
    const accounts = openVaultAccounts(vault, authority, SYSTEM);
    expect(accounts.map((a) => [a.isSigner, a.isWritable])).toEqual([
      [false, true],
      [true, true],
      [false, false],
    ]);
  });

  it('withdraw: vault(可写) · credit(只读) · recipient(签名) —— credit 什么都不是', () => {
    // The whole attack: `credit` is neither a signer nor owned by the attacked
    // program; it is merely an address handed in.
    const vault = Keypair.generate().publicKey;
    const credit = Keypair.generate().publicKey;
    const recipient = Keypair.generate().publicKey;
    const accounts = ownerWithdrawAccounts(vault, credit, recipient);
    expect(accounts.map((a) => a.pubkey.toBase58())).toEqual(
      [vault, credit, recipient].map((k) => k.toBase58()),
    );
    expect(accounts.map((a) => [a.isSigner, a.isWritable])).toEqual([
      [false, true],
      [false, false],
      [true, true],
    ]);
  });
});

describe('ownerChain — 计划', () => {
  const config = {
    isFixed: false,
    vulnerableProgramId: VULNERABLE,
    fixedProgramId: FIXED,
    counterfeitProgramId: COUNTERFEIT,
    attackLamports: 50_000_000,
  };

  it('两个 id 都是占位符时拒绝计划, 不把占位符变成地址', () => {
    const plan = planOwnerRun(
      { ...config, vulnerableProgramId: 'TBD', counterfeitProgramId: 'TBD' },
      new PublicKey(VULNERABLE),
      Keypair.generate(),
      Keypair.generate().publicKey,
    );
    expect(plan.kind).toBe('notDeployed');
  });

  it('选定哪一版就指向哪个程序 id', () => {
    const credit = Keypair.generate();
    const recipient = Keypair.generate().publicKey;
    const vault = new PublicKey(VULNERABLE);
    const run = planOwnerRun({ ...config, isFixed: true }, vault, credit, recipient);
    expect(run.kind).toBe('run');
    if (run.kind !== 'run') return;
    expect(run.target.programId.toBase58()).toBe(FIXED);
    expect(run.target.counterfeitProgramId.toBase58()).toBe(COUNTERFEIT);
    expect(run.target.amount).toBe(50_000_000);
    expect(run.target.creditKeypair).toBe(credit);
    expect(run.target.recipient.toBase58()).toBe(recipient.toBase58());
  });
});

describe('ownerChain — lamport 数额的显示', () => {
  it('0.05 SOL 由 50,000,000 lamport 得到', () => {
    expect(solAmount(50_000_000)).toBe('0.05');
  });

  it('0 就是 0.00', () => {
    expect(solAmount(0)).toBe('0.00');
  });
});
