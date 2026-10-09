# The contract behind the demo

Two Anchor programs that differ by exactly one line:

| | `Withdraw.authority` | What the runtime enforces |
|---|---|---|
| `programs/xray_vulnerable` | `AccountInfo<'info>` | nothing |
| `programs/xray_fixed` | `Signer<'info>` | a signature, before the handler runs |

Everything else — the `initialize`, the `require!` address check, the
`vault.balance -= amount` — is identical. That is the point: the fix is a
declaration, not a line of logic.

The listing shown in step 2 of the web demo is `programs/xray_vulnerable/src/lib.rs`
verbatim, so what the animation dissects is real source in this repository.

## Status: written, never compiled

**Neither program has been built, deployed, or tested.** No `.so`, no program id,
no transaction signature exists. `tests/xray.ts` is therefore a claim about what
will happen, not a record of what did.

The reason is a toolchain gap, not a choice: producing Solana bytecode needs
`cargo-build-sbf` plus platform-tools (a custom LLVM backend), which is published
for Linux and macOS only. There is no Windows build. The demo's front end needs
none of that, which is why it was built first and stands on its own.

## Running it, on a machine that can

Any Linux or macOS box, or a Linux container, or Solana Playground:

```bash
cd contract
npm install
anchor build
anchor keys list              # the two real program ids
anchor keys sync              # writes them into Anchor.toml and both declare_id!
anchor test --skip-local-validator --provider.cluster devnet
```

Devnet SOL first: `solana airdrop 2` a few times, or use faucet.solana.com. Two
program deployments plus repeated test runs want a few SOL.

**Check the bytecode version before you trust a deployment.** Solana is retiring
SBPF v0/v1/v2; once SIMD-0500 activates, programs built for the old formats are
refused at deploy time. That needs platform-tools >= v1.56 and
cargo-build-sbf >= v4.2.0. Confirm with:

```bash
readelf -h target/deploy/xray_vulnerable.so | grep Flags   # 0x3 == SBPFv3
```

If that comes back `0x0`, the build is v0 and Devnet may reject it.

## After a successful run

Fill `frontend/src/config/verification.ts` with the real program ids and the
attack transaction signature. The verify panel switches itself out of its
"not deployed" wording as soon as those values are real — it derives the state
from the data, so there is no flag to flip by hand.
