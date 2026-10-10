# Testing and guards

Full version of the README's verification section: which invariants are held by
what, the level each check catches a violation at, and how every guard was
falsified.

## Three invariants

### 1. No animation coordinate is written in CSS

Offsets are computed in `lib/geometry.ts` and arrive as custom properties; the
attack keyframes are generated at runtime in `lib/keyframes.ts`. Three checks
cover this and they are not equivalent:

- `keyframes.test.ts` validates the values the generator **produces**;
- `no-hardcoded-pixels.test.ts` reads the stylesheets **and the generator's own
  source** and fails on a pixel literal inside a `transform`;
- `tools/shoot.mjs` measures the rendered result in a real browser.

A value-only check would pass for a hard-coded-but-correct implementation, which
is why the source-level one exists.

The source-level check's scope is deliberate: it scans every declaration (so a
coordinate hidden behind a custom property is still caught) and understands the
3D, matrix and perspective forms — each of which an earlier version missed while
the suite stayed green. It does **not** police pixel values in non-transform
properties (`top`, `left`, `margin`) on static chrome, or inline `style={{}}` in
TSX. That scope is sufficient because the stage-card and attack coordinate
system is entirely transform-based.

> `test: { css: true }` in `frontend/vite.config.ts` is **load-bearing**. With
> Vitest's default, a `?raw` CSS import resolves to an empty string, so the guard
> silently reads nothing and passes. Removing it re-breaks the rule without
> failing a single test.

### 2. Steps 3, 4 and 5 share one set of DOM nodes

The three steps differ only by class name and transform inputs, so the cards
travel between layouts instead of being re-created. This cannot be proved by
reading the source, so `tools/shoot.mjs` proves it empirically: it tags the five
live nodes and fails if the tags do not survive a layout change.

### 3. The provenance copies are checked against their sources

The three files under `frontend/public/source/` are compared byte for byte with
`contract/` by `source-assets.test.ts`, which also fails if a link in
`ClosingNote.tsx` points at a file that is not served.

## Falsification record

Every guard had a mutation injected and the check confirmed to go red — a check
that cannot fail is worse than no check at all. Two of them originally could
not.

| Guard | Mutation injected | The failure named |
| --- | --- | --- |
| `source-assets.test.ts` copy comparison | trailing space appended to a copy | the offset, both bytes and both lengths |
| `source-assets.test.ts` link check | link target renamed | the missing file |
| closing-note selector | pointed at a `data-testid` that does not exist | a timed-out `waitFor` before `step5-closing-note` |
| VerifyPanel deployed claim | claim left un-gated | the offending line |

## Guards on the verify panel's wording

"The animation has on-chain evidence behind it" is the one sentence here that
must not be wrong, so it has guards of its own:

- `isDeployed()` is tested in both states, not just the one this repo is in.
- A test scans `VerifyPanel.tsx` and fails if the deployed claim ever appears
  outside the `deployed ?` branch.

`isDeployed()` is derived from the data in `config/verification.ts` rather than
stored as a flag, so the panel's wording switches by itself the moment real
values are filled in.

## What `npm test` covers

Geometry, the step machine, the keyframe generator, the Rust tokenizer, the
verification config and its deployed/undeployed states, the
no-hand-written-coordinates guard, and the byte-for-byte provenance check on the
copies the closing note links to.

## The screenshot harness

```bash
npm run dev -- --port 5199 &
node tools/shoot.mjs http://localhost:5199/ .shots-real   # needs Node >= 22
```

It drives headless Chrome over the DevTools Protocol and clicks real elements.
Every step **waits on a predicate against the live page** rather than sleeping
for a guessed duration, and each capture logs the step/mode it actually observed
— guessed sleeps produced both false failures and mislabelled frames.

It fails on a missing selector, a wrong result string, layer cards that were
remounted, or any console error (`Runtime.consoleAPICalled`,
`Runtime.exceptionThrown`, `Log.entryAdded`, collected from page load).

Chrome's `--virtual-time-budget` is deliberately *not* used: it fast-forwards
`setTimeout` while CSS animations keep running on the real clock, so the captured
frame does not match the state the app believes it is in.

## The walkthrough recorder

```bash
node tools/record.mjs http://localhost:5199/ docs/screenshots/walkthrough.mp4 \
  --fps=30 --width=1920 --height=1080        # needs Node >= 22 and ffmpeg
```

It captures the page's own compositor output over the DevTools Protocol — no
window chrome, no desktop — and drives the flow with the same state predicates
as the screenshot harness. Frames arrive only when the page repaints, so they
are resampled to a constant frame rate rather than replayed at whatever rate
they happened to arrive.

The current `docs/screenshots/walkthrough.mp4` predates the closing note, so the
recording and `contact-sheet.png` show the flow without that note at the end of
step 5.
