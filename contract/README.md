# The contracts behind the demo

Five Anchor programs, all deployed to **testnet**: two pairs, and the tool one
of the attacks needs.

## Lesson one — the signature nobody asked for

Two programs that differ by exactly one line:

| | `Withdraw.authority` | What the runtime enforces |
|---|---|---|
| `programs/prism_vulnerable` | `AccountInfo<'info>` | nothing |
| `programs/prism_fixed` | `Signer<'info>` | a signature, before the handler runs |

Everything else — the `initialize`, the `require!` address check, the
`vault.balance -= amount` — is identical. That is the point: the fix is a
declaration, not a line of logic.

The listing shown in the lesson is `programs/prism_vulnerable/src/lib.rs`
verbatim, so what the animation dissects is real source in this repository.

## Lesson two — the account that was not ours

Again one declaration apart:

| | `Withdraw.credit` | What the runtime enforces |
|---|---|---|
| `programs/prism_owner_vulnerable` | `UncheckedAccount<'info>` | nothing |
| `programs/prism_owner_fixed` | `Account<'info, Credit>` | that this program owns the account, before the handler runs |

`programs/prism_counterfeit` is **not part of the protocol**. It is the
attacker's tool: a program that mints an account with the same discriminator and
the same layout as the protocol's `Credit`, differing only in **who owns it**.

That third program is not decoration. On Solana only a program may write the data
of an account it owns, so a forged account has to be written by *something* — and
deploying a program is something an attacker can simply do. Its trick is
deliberately unimpressive: naming its own struct `Credit` makes Anchor derive the
same eight-byte discriminator, because Anchor hashes the name.

Unlike lesson one, these vaults hold **lamports**, and `withdraw` moves them. The
attack is a transfer, not a counter changing.

## Status: built, deployed, and tested

All five are live on testnet, and both attacks have been run against them.

| program | address |
|---|---|
| `prism_vulnerable` | `7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2` |
| `prism_fixed` | `9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq` |
| `prism_owner_vulnerable` | `38hLgAJyNUnRiZvWVWAwTwt9cZMA6wzyPQm3QQDAdWJL` |
| `prism_owner_fixed` | `BC5AtnTTYDfhrhxfng7JPUfoVwvcnvPrzuQsE7HpQW93` |
| `prism_counterfeit` | `AKW7vUPNvueeG31GV7gRCRtPQyvsmvat4RnzjPXjxiHR` |

The same addresses are in `Anchor.toml` and in each program's `declare_id!`.
Anchor derives `#[account]`'s Owner from `declare_id!`, so those have to agree —
a placeholder there makes the runtime reject the vault or credit account.

**What is tested, and what is not.** `tests/prism.ts` covers lesson one: four
assertions, run against a local validator, that the attack succeeds against the
vulnerable build, is refused by the repaired one, and that the admin withdrawing
for themselves still works. **Lesson two has no `anchor test` file.** Its attack
was proven by a script run against testnet — the repaired build refuses the same
forged credit with `Custom(3007)`, and the vulnerable build moves the vault's
lamports to the attacker. A test file for lesson two is owed; the claim is not
unverified, but it is not covered the way lesson one is.

## Building and deploying

Any Linux or macOS box, or a Linux container:

```bash
cd contract
npm install
anchor build
anchor keys sync    # writes the keypair-derived ids into Anchor.toml and declare_id!
```

Two things this repository learned the hard way:

**Check the bytecode version before you trust a deployment.** Solana is retiring
SBPF v0/v1/v2; once SIMD-0500 activates, programs built for the old formats are
refused at deploy time. That needs platform-tools >= v1.56 and cargo-build-sbf
>= v4.2.0. Confirm with:

```bash
readelf -h target/deploy/prism_vulnerable.so | grep Flags   # 0x3 == SBPFv3
```

**The machine that built these could not resolve `*.solana.com`.** The network it
sat on poisons those names, so the cluster was reached through a reverse SSH
tunnel to the host's HTTP proxy:

```bash
ssh -R 18080:localhost:<proxy-port> <build-host>   # then, on the build host:
export HTTPS_PROXY=http://127.0.0.1:18080
solana program deploy target/deploy/<program>.so \
  --program-id target/deploy/<program>-keypair.json \
  --url https://api.testnet.solana.com \
  --keypair ~/.config/solana/<deployer>.json
```

Funding needs a few SOL: each ~170 KB program locks about 0.86 SOL in programdata,
and `solana program deploy` needs roughly twice that available at its peak (it
writes a buffer first and refunds it at the end). `api.testnet.solana.com` is the
canonical endpoint where it is reachable; this build used it through the tunnel.

## Where the evidence goes

The lesson's folder — `frontend/public/lessons/<id>/lesson.json` — carries the
program ids, the attack signature, the refusal error and the balances the attack
moved. The verify panel reads them from there and speaks from them; it derives
whether it may claim a deployment from the data, so there is no flag to flip by
hand.
