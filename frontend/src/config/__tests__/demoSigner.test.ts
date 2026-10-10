import { describe, it, expect } from 'vitest';
import { DEMO_SIGNER_PUBKEY, DEMO_SIGNER_SECRET, demoSigner } from '../demoSigner';

/**
 * The shipped secret and the published public key must agree.
 *
 * The array is 64 raw bytes a human copied once; the address is the thing the
 * transaction card names and the thing anyone can check on Solscan. Nothing else
 * in the suite would notice if the two drifted apart — the transaction would
 * just be sent by a different account than the demo claims. So the derivation is
 * pinned here, against the exact address the demo was funded at.
 */
describe('demoSigner — 隐藏的私钥与公开的地址是同一个人', () => {
  it('由私钥推导出的公钥就是记下来的那把', () => {
    expect(demoSigner().publicKey.toBase58()).toBe(DEMO_SIGNER_PUBKEY);
  });

  it('公开的地址就是被充值的那把 demo 键', () => {
    expect(DEMO_SIGNER_PUBKEY).toBe('7T6ze6xyT1NaD5ai57pVWj6odfjVvFtSJkoT7sfBTWmw');
  });

  it('私钥是 web3.js 要的 64 字节 ed25519 形式', () => {
    expect(DEMO_SIGNER_SECRET).toHaveLength(64);
  });

  it('每次都返回同一个 keypair, 而不是每次重建', () => {
    expect(demoSigner()).toBe(demoSigner());
  });
});
