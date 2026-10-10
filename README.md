<h1 align="center">Solana Prism</h1>

<p align="center">
<img alt="Solana" src="https://img.shields.io/badge/Solana-24292F?style=flat-square&logo=solana&logoColor=white">
<img alt="Anchor 0.30" src="https://img.shields.io/badge/Anchor-0.30-24292F?style=flat-square&logo=rust&logoColor=white">
<img alt="React 18.3" src="https://img.shields.io/badge/React-18.3-24292F?style=flat-square&logo=react&logoColor=white">
<img alt="TypeScript 5.8" src="https://img.shields.io/badge/TypeScript-5.8-24292F?style=flat-square&logo=typescript&logoColor=white">
<img alt="Vite 6" src="https://img.shields.io/badge/Vite-6-24292F?style=flat-square&logo=vite&logoColor=white">
<img alt="Vitest 3.2" src="https://img.shields.io/badge/Vitest-3.2-24292F?style=flat-square&logo=vitest&logoColor=white">
<img alt="node: >=20.10" src="https://img.shields.io/badge/node-%3E%3D20.10-24292F?style=flat-square&logo=nodedotjs&logoColor=white">
</p>

<p align="center"><strong>English</strong> · <a href="README.zh-CN.md">中文</a></p>

Solana Prism is a security lesson for Solana smart contracts. It takes one
`withdraw` instruction apart along the execution path the bug actually travels —
five stages — and animates why a missing signer check lets an attacker drain a
vault without ever holding the admin's key, and why the repair is one changed
account declaration rather than one more line of checking.

<p align="center">
<img src="docs/screenshots/contact-sheet.png" alt="The six steps" width="900">
</p>

## What's inside

- **The demo** — six interactive steps, from the title screen to on-chain
  verification, in English and Chinese.
- **The contract and its tests** — two real Anchor programs
  (`prism_vulnerable` / `prism_fixed`) that differ by a single declaration, with
  the attack stated as assertions in `tests/prism.ts`.
- **The verification toolchain** — `tools/` holds a walkthrough harness that
  asserts against the live page in headless Chrome, and a recorder.

## Quick start

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # tsc -b && vite build
```

Node **20.10.0 or newer** to run the app. Vite is pinned to 6.x (Vite 7 needs
`^20.19.0 || >=22.12.0`). The scripts under `tools/` additionally need **Node
>= 22**.

## The lesson

```
1 Instruction          withdraw(ctx, amount: 500)          what was called
2 Accounts             vault · authority                   who was handed over
3 Account Declaration  authority: AccountInfo<'info>       what the program demands  ← the flaw
4 Manual Check         require!(vault.authority == ...)    what the handler checks itself
5 State Change         vault.balance -= amount             what gets written
```

The flaw is in stage 3, **not** stage 4. On Solana you *declare* what an account
must be and the runtime enforces it before your handler runs: declaring
`AccountInfo<'info>` asks for nothing, so the attacker hands over the admin's
address and it is accepted, while declaring `Signer<'info>` demands a signature
and the same call is refused before stage 4 or 5 ever execute. Declared
constraints are enforced for free; hand-written checks only if you remember to
write them. That is the lesson.

These five stages are the split *this* attack path makes, not Solana's fixed
execution model. A different vulnerability splits differently: overflow,
precision and rounding crack in arithmetic; CPI abuse needs a cross-program
invocation stage; an unverified PDA bump needs an address-derivation stage.
**Stages are a property of the vulnerability, not of Solana.** The stage list is
data (`config/layers.ts`) and the render pipeline takes its length from that
array rather than assuming five.

## The six steps

1. **Title** — "What is a smart contract?" fades in and out.
2. **Code** — the contract, highlighted by our own tokenizer. Each region is
   boxed and labelled with the stage it becomes, swept in source order, so the
   labels read **2, 3, 1, 4, 5**.
3. **Decompose** — the boxes fan out into the five stages.
4. **Stack** — they converge into execution order; stage 3 cracks (red dashed,
   *No signature required*).
5. **Attack** — pick *Vulnerable* or *Fixed* and execute. The transaction payload
   appears first (the admin's **address** present, the **signature** absent), then
   the dot drops: through stage 3 (*Attack Successful*), or stopped at it
   (*Transaction Rejected*).
6. **Verify** — the on-chain evidence behind the animation: the two program ids,
   the attack transaction, the refusal the repaired build returns, and the vault
   the attack consumed.

The result is followed by a closing note: the repair is a declaration, not a line
of logic, with a reference to an incident from the same family (Solend, August
2021: an authorization check too weak, defeated by a lending market the attacker
had created and owned, about $2M put at risk) and links to the Anchor Sealevel
Attacks reference and the incident case file. Press **Replay** to run the whole
thing again without reloading.

A recording of the full flow is in
[`docs/screenshots/walkthrough.mp4`](docs/screenshots/walkthrough.mp4), generated
by `tools/record.mjs`. It predates the closing note, so step 5 ends without it.

## Layout

```
frontend/src/
  lib/geometry.ts     every pixel coordinate in the demo, and the only place they exist
  lib/keyframes.ts    the attack animations, generated from geometry
  lib/steps.ts        the step state machine
  lib/highlight.ts    hand-written Rust tokenizer
  lib/code.ts         the step-2 listing; comments follow the language
  i18n/               every user-visible string, both languages
  config/layers.ts    the stage list — the demo is generated from this array
  config/verification.ts  on-chain evidence, real values from testnet
  components/         Step1Title, Step2Code, ContractLayers, LayerCard, TxCard,
                      AttackDot, FixToggle, AttackResult, ClosingNote,
                      VerifyPanel, LanguageToggle
  styles/             global.css (tokens) · app.css · animations.css

frontend/public/source/   byte-for-byte copies of contract/, linked from the closing note
contract/            the Anchor programs the step-2 listing is taken from
  programs/prism_vulnerable   authority declared as AccountInfo — the bug
  programs/prism_fixed        authority declared as Signer — the one-line fix
  tests/prism.ts              the attack, as assertions
tools/               the walkthrough and recording scripts
```

Three invariants are held by mechanical checks: no animation coordinate is
written in CSS, steps 3–5 share one set of DOM nodes, and the provenance copies
match `contract/` byte for byte. Every guard has had a mutation injected into it
to confirm it goes red; two of them originally would not. Full write-up in
[`docs/verification.md`](docs/verification.md).

## Status

**The front end is finished, and both programs are deployed and live on
testnet.** The attack has been run against them for real:

| | |
|---|---|
| `prism_vulnerable` | `7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2` |
| `prism_fixed` | `9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq` |
| attack transaction | `2d4hd6Sn…tEEW` — **succeeded**, balance 1000 → 500 |
| the same call, repaired | `4WqnSCg8…LvuF` — **refused**, `Custom(3010)`, balance unchanged |

A pool of 30 vaults — plus one owned by the repaired build — is prepared
on-chain, so a visitor with a wallet can run the attack themselves instead of
watching an animation. `config/verification.ts` carries every value; the verify
panel derives its wording from that data rather than from a flag, and so it is
now claiming deployment because there is one.

Building Solana bytecode needs `cargo-build-sbf` and platform-tools, published
for Linux and macOS only — there is no Windows build. This was built and
deployed on a Linux box. That machine cannot resolve `*.solana.com` (this
network's DNS poisons it), so the deploy ran through a reverse SSH tunnel to the
host's HTTP proxy, against `https://api.testnet.solana.com`. See
[`contract/README.md`](contract/README.md).

## More

- Testing and guards, in full: [`docs/verification.md`](docs/verification.md)
- The full plan: [`docs/solana-prism-plan.md`](docs/solana-prism-plan.md)
- Front-end execution plan and decision record:
  [`docs/superpowers/plans/2026-10-10-solana-prism-frontend.md`](docs/superpowers/plans/2026-10-10-solana-prism-frontend.md)
