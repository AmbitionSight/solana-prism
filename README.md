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

Solana Prism is a platform for Solana smart-contract security lessons. A lesson
takes one vulnerability apart along the execution path the bug actually travels,
and then runs it for real: the attack the reader watches is a transaction on
testnet, and every claim the lesson makes has a signature behind it that an
explorer can confirm.

Two ideas hold the whole thing up.

**A lesson is data.** A lesson is a folder of static files — a catalogue entry,
a JSON description of its stages and its evidence, and the contract verbatim.
The app fetches that folder at runtime and renders it, and nothing below the
shell imports lesson content, so the pages, the flow and the verify panel are
driven entirely by what the folder says. What is *not* data is the vocabulary a
lesson speaks and the instructions it sends: stage names, margin-note keys and
the flaw's badge are one shared, typed list that a lesson extends when it needs
a word the platform does not have, and each vulnerability brings its own
instruction code. Both are set out under
[Adding a lesson](#adding-a-lesson).

**Nothing is asserted that the chain has not confirmed.** The verdict under an
attack is the cluster's answer rather than a local rule; the verify panel
derives its wording from the evidence data rather than from a deployment flag;
and the invariants that hold those properties up are mechanical checks, not
care.

## Quick start

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 — opens on the lesson list
npm test         # the unit suite (30 files)
npm run build    # tsc -b && vite build
```

Node **20.10.0 or newer** to run the app. Vite is pinned to 6.x (Vite 7 needs
`^20.19.0 || >=22.12.0`). The scripts under `tools/` additionally need **Node
>= 22**.

Lesson folders are fetched over HTTP, so the app needs the dev server (or the
built `dist/`) rather than a `file://` URL.

## Architecture

```mermaid
flowchart TB
  subgraph lesson["A lesson is a folder — fetched at runtime"]
    index["lessons/index.json<br/>the catalogue"]
    data["lessons/ID/lesson.json<br/>stages · contract structure · evidence"]
    rs["lessons/ID/contract.rs<br/>the contract, verbatim"]
  end

  subgraph app["The app"]
    shell["Shell<br/>the platform's only I/O"]
    home["Home<br/>the lesson list"]
    render["App · LessonContext<br/>the pages, shaped by lesson data"]
  end

  subgraph chain["The chain"]
    decision["devnet · chainRun · devnetRun<br/>every decision, pure and tested"]
    edge["solanaChain · wallet<br/>web3.js and Phantom, at the edge"]
  end

  index --> shell
  data --> shell
  rs --> shell
  shell --> home
  shell --> render
  render --> decision
  decision --> edge
```

The split is by **what can be tested without a browser**, and it runs top to
bottom:

| Layer | Responsibility | Where |
|---|---|---|
| Shell | the platform's only I/O — fetch the catalogue, fetch the chosen lesson, decide list-or-lesson | `components/Shell.tsx` |
| Lesson format | the folder the app renders, and the JSON boundary: the guarantees TypeScript gives over an import are re-established at runtime | `public/lessons/`, `lib/lesson.ts` |
| Render pipeline | page count and stage count come from the lesson's own arrays; the lesson reaches the tree as a prop and a context, never as an import | `App.tsx`, `lib/lessonContext.ts` |
| Decision layer | the pool scan, the transaction's construction, what an outcome means — pure functions over injected I/O, so every branch is a unit test | `lib/devnet.ts`, `lib/chainRun.ts`, `lib/devnetRun.ts` |
| Edge adapters | the only files that know about web3.js, or about Phantom | `lib/solanaChain.ts`, `lib/wallet.ts` |
| Presentation | the components, and every user-visible string in two languages behind one typed catalogue | `components/`, `i18n/` |

### The lesson folder

```
public/lessons/
  index.json              the catalogue the home page reads
  <id>/lesson.json        stages, the contract's structure, the on-chain evidence
  <id>/contract.rs        the contract, verbatim
```

`lesson.json` carries the stage list, which lines of the contract become which
stage, the margin notes keyed to those lines, and the evidence the verify panel
speaks from. The renderer takes the number of stages from that array rather than
assuming six, and takes each stage's scatter offsets and code lines from the
data — which is what makes the format general rather than a shape one lesson
happens to fit.

JSON erases one guarantee TypeScript gave for free: that every `sayKey`,
`nameKey` and note key names a real catalogue entry. `lib/lesson.ts` re-establishes
it at runtime, so a key that is not in the message catalogue, or a contract
region that runs off the end of `contract.rs`, is a `LessonError` the shell
reports plainly — never a blank sentence on screen, and never a white page.

### What opening a lesson does

1. The shell fetches `lessons/index.json`; `Home` renders the catalogue, and
   says so honestly while it is loading or if the fetch failed.
2. Opening an entry fetches that lesson's folder, validates it, and hands the
   assembled `Lesson` to `App`. An id that names no real lesson never becomes a
   fetch.
3. `App` provides it through `LessonContext`; every page below reads the stages,
   the contract lines and the evidence from it.
4. The chain layer never reads lesson data itself — program ids, the admin
   address and the pool size arrive as arguments, so it can be exercised against
   a fixture.

## Features

- **A lesson catalogue** — a landing page listing what the platform ships, and
  the way back out of a lesson from every page.
- **Lessons as data** — the whole content of a lesson is three files in a
  folder; no component knows about any particular one.
- **Real execution by default** — *Execute* sends a real testnet transaction
  without asking the visitor to install anything.
- **A wallet path, opt-in** — the same run can be made with the visitor's own
  key; nothing about the default path requires one.
- **A verify panel that cannot overclaim** — program ids, the attack
  transaction, and the balances it moved, all linked to an explorer, all derived
  from lesson data.
- **Honest failure states** — an exhausted pool, a missing authority and an
  unreachable RPC are each reported in the control's own words, never as an
  animated drain that did not happen.
- **Two languages** — behind one typed catalogue, so a key present in one
  language and missing in the other is a compile error.

### Executing for real

*Execute* is signed by a dedicated demo keypair that ships in the frontend
(`config/demoSigner.ts`). That is a deliberate, accepted trade-off: without it,
a visitor with no wallet — almost everyone — could only watch an animation,
which is exactly the thing this demo exists to argue against. The key is
testnet-only, funded with a little testnet SOL for fees, and is never the pool's
authority — the `authority` account passed to `withdraw` is the admin's public
key, and nobody signs as the admin. Anyone who reads the bundle can spend its
fee balance; that is the whole of the exposure, and the pool is refillable. **It
must never be pointed at mainnet.**

The verdict is the chain's (`lib/devnetRun.ts`), not a local rule: the animation
decides only *when* a result may be shown, never *what* it is.

## Adding a lesson

The **content** of a lesson is three files and one catalogue entry:

1. `public/lessons/<id>/contract.rs` — the contract, exactly as compiled.
2. `public/lessons/<id>/lesson.json` — its stages, the line regions that become
   them, the margin notes, and the on-chain evidence.
3. An entry in `public/lessons/index.json` naming the id, and the catalogue keys
   for its title and one-line description.

Then add those catalogue keys in both languages to `i18n/messages.ts`. For a
lesson that speaks the platform's existing vocabulary and makes a call the chain
layer already knows, that is the whole of it — no component to touch, no
registry, no build step.

Two things are not content, and a lesson that needs one says so in code:

- **A word the platform does not have.** Stage names (`i18n/messages.ts`),
  margin-note keys (`lib/contractSource.ts`) and the flaw's badge
  (`config/layers.ts` and the catalogue) are each one shared, typed list. A
  lesson whose flaw is an unchecked owner rather than a missing signature, or
  which reads its state through deserialisation rather than a manual check, adds
  a key to those lists. Each list is a single source, so the type and the check
  `lib/lesson.ts` runs against fetched JSON cannot drift apart.
- **An instruction the platform does not have.** The chain layer is
  per-vulnerability, not a plugin interface: a lesson brings the selectors, the
  account lists and the address derivation for the calls it makes. That is
  unavoidable — different vulnerabilities *are* different instructions — and it
  is why the decision layer is pure functions over injected I/O, so a new
  lesson's instructions can be tested the way the existing ones already are.

## A worked example: "the signature nobody asked for"

The lesson the platform ships with. A `withdraw` handler compares the caller
against the stored admin, and never asks the runtime to check a signature.

```
0 Vault Setup          vault.authority = ctx.accounts.authority.key()   who the vault was told to trust
1 Instruction          withdraw(ctx, amount: 500)                       what was called
2 Accounts             vault · authority                                who was handed over
3 Account Declaration  authority: AccountInfo<'info>                    what the program demands  ← the flaw
4 Manual Check         require!(vault.authority == ...)                 what the handler checks itself
5 State Change         vault.balance -= amount                          what gets written
```

The flaw is in stage 3, **not** stage 4. On Solana you *declare* what an account
must be and the runtime enforces it before your handler runs: declaring
`AccountInfo<'info>` asks for nothing, so the attacker hands over the admin's
address and it is accepted, while declaring `Signer<'info>` demands a signature
and the same call is refused before stage 4 or 5 ever execute. Declared
constraints are enforced for free; hand-written checks only if you remember to
write them.

These six stages are the split *this* attack path makes, not Solana's fixed
execution model — overflow cracks in arithmetic, CPI abuse needs an invocation
stage, an unverified PDA bump needs an address-derivation stage. **Stages are a
property of the vulnerability, not of Solana**, which is why the list is lesson
data rather than code.

The lesson runs as eight pages: a title; the deployed contract listed with our
own tokenizer, each region boxed and labelled with the stage it becomes; the
boxes flying apart into the execution-order flow; the attacker filling the
caller's slot with the admin's *public* address; the attack, run for real; why
the mistake is so easy to make (the Solidity check it is copied from is
correct); the one-line repair; and the same attack refused by the repaired
build. All three of its programs are deployed on testnet and the attack has been
run against them — see [Status](#status).

## Verification

`npm test` covers the geometry, the page machine, the keyframe generator, the
Rust tokenizer, the lesson loader and its failure modes, the chain decisions,
and the message catalogue. Three invariants are held by mechanical checks rather
than by review:

1. **No animation coordinate is written in CSS** — offsets are computed in
   `lib/geometry.ts` and the attack keyframes are generated at runtime; three
   non-equivalent checks cover it, including one that reads the stylesheets *and
   the generator's own source*.
2. **Pages 3–8 share one set of DOM nodes** — the cards travel between layouts
   instead of being re-created, proved empirically against a live page because
   it cannot be proved by reading the source.
3. **The provenance chain holds** — `lessons/<id>/contract.rs` is byte-for-byte
   `public/source/prism_vulnerable.rs.txt`, which is pinned in turn to
   `contract/`.

Every guard has had a mutation injected into it to confirm it goes red; two of
them originally would not. Full write-up, including the headless-Chrome harness
and the recorder, in [`docs/verification.md`](docs/verification.md).

## Status

**The front end is finished, and the lesson's programs are deployed and live on
testnet.** The attack has been run against them for real:

| | |
|---|---|
| `prism_vulnerable` | `7SdcJctnNWx1CPrfJr5MR8jWgDLtW173FoYyCm8rP8U2` |
| `prism_fixed` | `9CFbfwYirp1ZFfwA2fYKKaeVoYU9R3cKNBukvn8EayPq` |
| attack transaction | `2d4hd6Sn…tEEW` — **succeeded**, balance 1000 → 500 |
| the same call, repaired | `4WqnSCg8…LvuF` — **refused**, `Custom(3010)`, balance unchanged |

A pool of vaults — `PLATFORM.poolSize`, 200 — plus one owned by the repaired
build, is prepared on-chain, so a visitor can run the attack themselves instead
of watching an animation.

Building Solana bytecode needs `cargo-build-sbf` and platform-tools, published
for Linux and macOS only — there is no Windows build. This was built and
deployed on a Linux box. That machine cannot resolve `*.solana.com` (this
network's DNS poisons it), so the deploy ran through a reverse SSH tunnel to the
host's HTTP proxy, against `https://api.testnet.solana.com`.

## More

- Testing and guards, in full: [`docs/verification.md`](docs/verification.md)
- The full plan: [`docs/solana-prism-plan.md`](docs/solana-prism-plan.md)
- Front-end execution plan and decision record:
  [`docs/superpowers/plans/2026-10-10-solana-prism-frontend.md`](docs/superpowers/plans/2026-10-10-solana-prism-frontend.md)
- The eight-page flow, drawn out, and the plan to build it:
  [`docs/superpowers/plans/2026-10-11-flow-redesign.md`](docs/superpowers/plans/2026-10-11-flow-redesign.md)
