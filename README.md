# Solana Contract X-Ray

An Apple-style interactive web demo that takes an Anchor program apart into five
layers — Instruction, Account State, **Access Control**, Business Logic, Runtime —
and shows, at the layer where it belongs, why a missing signer check lets an
attacker drain a vault without ever holding the admin's key.

The attack lands on layer **L3**, so that is the layer the dot passes through.

## The six steps

1. **Title** — "What is a smart contract?" fades in and out.
2. **Code** — the `withdraw` path, highlighted by our own tokenizer.
3. **Decompose** — the code breaks into five cards and fans out.
4. **Stack** — the cards converge into a stack; L3 cracks (red dashed,
   *Missing Signer Check*).
5. **Attack** — pick *Vulnerable* or *Fixed* and press Execute. The transaction
   payload appears first, because the whole point is that the admin's **address**
   is present while the admin's **signature** is absent. Then the dot drops:
   through L3 (*Attack Successful*), or bounced off it (*Transaction Rejected*).
6. **Verify** — the on-chain evidence behind the animation.

Press **Replay** to run the whole thing again without reloading.

![The six steps](docs/screenshots/contact-sheet.png)

## Stack

Vite + React 18 + TypeScript, plain CSS with custom properties, CSS transitions
and keyframes, Vitest. No Tailwind, no animation library, no UI library, no
state-management library, no syntax-highlighting library — the three-colour
highlighter and both attack animations are ours.

## Running it

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm test         # 48 tests
npm run build    # tsc -b && vite build
```

Node **20.10.0 or newer** to run the app. Vite is pinned to `6.x` on purpose:
Vite 7 requires Node `^20.19.0 || >=22.12.0`, and the `^6.3.5` caret caps below
7.0.0 so it will not drift to a version that cannot run here.

The verification harness (`tools/shoot.mjs`) additionally needs **Node >= 22**
for the global `WebSocket`; it says so plainly if run on an older Node. The app
itself does not.

## Layout

```
frontend/src/
  lib/geometry.ts     every pixel coordinate in the demo, and the only place they exist
  lib/keyframes.ts    the attack animations, generated from geometry
  lib/steps.ts        the step state machine
  lib/highlight.ts    hand-written Rust tokenizer
  config/layers.ts    the five layers — the demo is generated from this array
  config/verification.ts  on-chain evidence (placeholders until Phase 4)
  components/         Step1Title, Step2Code, ContractLayers, LayerCard,
                      TxCard, AttackDot, FixToggle, AttackResult, VerifyPanel
  styles/             global.css (tokens) · app.css · animations.css
```

Two rules hold this together. Both are checked mechanically, at the level that
can actually catch a violation:

- **No animation coordinate is written in CSS.** Offsets are computed in
  `geometry.ts` and arrive as custom properties; the attack keyframes are
  generated at runtime. Three checks cover this and they are not equivalent:
  `keyframes.test.ts` validates the values the generator *produces*,
  `no-hardcoded-pixels.test.ts` reads the stylesheets **and the generator's own
  source** and fails on a pixel literal inside a `transform`, and the harness
  below measures the rendered result in a real browser. A value-only check would
  pass for a hard-coded-but-correct implementation, which is why the
  source-level one exists.

  > `test: { css: true }` in `frontend/vite.config.ts` is **load-bearing, not
  > cosmetic**. With Vitest's default, a `?raw` CSS import resolves to an empty
  > string, so the guard silently reads nothing and passes. Removing it re-breaks
  > the rule without failing a single test.
- **Steps 3, 4 and 5 share one set of DOM nodes.** They differ only by class
  name and transform inputs, so the cards travel between layouts instead of
  being re-created. This cannot be proved by reading the source, so the harness
  proves it empirically: it tags the five live nodes and fails if the tags do
  not survive a layout change.

Every guard above has been **falsified on purpose** — a mutation was introduced
and the check confirmed to fail — because a check that cannot fail is worse than
no check at all. Two of them originally could not.

## Verification

`npm test` covers geometry, the step machine, the keyframe generator, the
tokenizer, the verification URLs, and the no-hand-written-coordinates guard.

For the visuals there is a real-time screenshot harness:

```bash
npm run dev -- --port 5199 &
node tools/shoot.mjs http://localhost:5199/ .shots-real   # needs Node >= 22
```

It drives headless Chrome over the DevTools Protocol and clicks real elements.
Every step **waits on a predicate against the live page** rather than sleeping
for a guessed duration, and each capture logs the step/mode it actually observed
— guessed sleeps produced both false failures and mislabelled frames. It fails
on a missing selector, a wrong result string, layer cards that were remounted, or
any console error (`Runtime.consoleAPICalled`, `Runtime.exceptionThrown`,
`Log.entryAdded`, collected from page load).

Chrome's `--virtual-time-budget` is deliberately *not* used: it fast-forwards
`setTimeout` while CSS animations keep running on the real clock, so the captured
frame does not match the state the app believes it is in.

## Status

Phase 0–2 (front end) is complete and demonstrable with no chain dependency.
`config/verification.ts` still holds `TBD` placeholders; Phase 3–4 add the Anchor
programs, deploy the vulnerable build to Devnet, and fill in the real program id
and attack transaction signature.

The full plan is in [`docs/solana-xray-plan.md`](docs/solana-xray-plan.md); the
front-end execution plan and its decisions are in
[`docs/superpowers/plans/2026-10-10-solana-xray-frontend.md`](docs/superpowers/plans/2026-10-10-solana-xray-frontend.md).
