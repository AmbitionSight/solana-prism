<h1 align="center">Solana Prism</h1>

<p align="center"><strong>One Solana vulnerability per lesson — taken apart along the execution path the bug travels, then run for real on testnet.</strong></p>

<p align="center">
<img alt="Solana" src="https://img.shields.io/badge/Solana-24292F?style=flat-square&logo=solana&logoColor=white">
<img alt="Anchor 0.30" src="https://img.shields.io/badge/Anchor-0.30-24292F?style=flat-square&logo=rust&logoColor=white">
<img alt="React 18.3" src="https://img.shields.io/badge/React-18.3-24292F?style=flat-square&logo=react&logoColor=white">
<img alt="TypeScript 5.8" src="https://img.shields.io/badge/TypeScript-5.8-24292F?style=flat-square&logo=typescript&logoColor=white">
<img alt="Vite 6" src="https://img.shields.io/badge/Vite-6-24292F?style=flat-square&logo=vite&logoColor=white">
<img alt="Vitest 3.2" src="https://img.shields.io/badge/Vitest-3.2-24292F?style=flat-square&logo=vitest&logoColor=white">
</p>

<p align="center"><strong>English</strong> · <a href="README.zh-CN.md">中文</a></p>

## What it is

Solana Prism is a platform for Solana smart-contract security lessons. Each
lesson picks one vulnerability and takes the contract apart along the execution
path the bug actually travels — every stage the call passes through, and the one
line where the mistake lives. Then it runs the attack for real: the attack a
reader watches is a transaction on testnet, and every claim the lesson makes has
a signature behind it that an explorer can confirm. Nothing is asserted that the
chain has not confirmed, so the verdict under an attack is the cluster's answer
rather than a local rule, and the verify panel speaks from the lesson's evidence
rather than from a deployment flag.

## Quick start

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173 — opens on the lesson list
npm test         # the unit suite (33 files, 359 tests)
npm run build    # tsc -b && vite build
```

Node **20.10.0 or newer** runs the app. Vite is pinned to 6.x (Vite 7 needs
`^20.19.0 || >=22.12.0`). The scripts under `tools/` additionally need
**Node >= 22**.

Lesson folders are fetched over HTTP, so the app needs the dev server (or the
built `dist/`) — opening it from a `file://` URL does not work.

## How it works

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

  subgraph chain["The chain — testnet"]
    decision["chainRun · devnetRun · ownerRun<br/>every decision, pure and tested"]
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
| Decision layer | the pool scan, a transaction's construction, what an outcome means — pure functions over injected I/O, so every branch is a unit test | `lib/chainRun.ts`, `lib/devnetRun.ts`, `lib/ownerRun.ts` |
| Edge adapters | the only files that know about web3.js, or about Phantom | `lib/solanaChain.ts`, `lib/wallet.ts` |
| Presentation | the components, and every user-visible string in two languages behind one typed catalogue | `components/`, `i18n/` |

### The lesson folder

**A lesson is data.** A lesson is a folder of static files that the app fetches
at runtime and renders; nothing below the shell imports lesson content, so the
pages, the flow and the verify panel are driven entirely by what the folder says.

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

## Executing for real

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

So the prose a lesson shows is still typed content in `i18n/messages.ts`, and the
wiring that lets a new vulnerability execute is still code. What the folder buys
is that neither is per-lesson duplication: a lesson adds keys and instructions to
shared lists rather than a page of its own.

## Testing

```bash
cd frontend && npx vitest run --reporter=dot
```

```
Test Files  33 passed (33)
     Tests  359 passed (359)
```

`docs/verification.md` is the long form of this section: which invariants the
suite holds, at what level each check catches a violation, and how every guard
was falsified.

## Status

- **Deployed on testnet** — two lessons, five programs (the vulnerable and
  repaired build of each lesson, plus the attacker's counterfeit program lesson
  two needs). Both attacks have been run against the live programs. ✅
- **Unit suite green** — 33 files, 359 tests. ✅
- **Not yet hosted** — there is no public URL. Run it locally with `npm run dev`.
- **The recorded walkthrough predates lesson two** — `docs/screenshots/` shows
  lesson one only.
- **CI runs the frontend** — `.github/workflows/ci.yml` runs `npm ci`,
  `npm test` and `npm run build` on every push and pull request. It does not
  build the contracts: that needs `cargo-build-sbf` and platform-tools, which a
  stock runner does not have (see `contract/README.md`).

## License

This project is [MIT licensed](LICENSE).
