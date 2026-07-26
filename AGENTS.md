# Agent Instructions

Working agreement for anyone, human or agent, touching this repo.

## SPEC.md is the source of truth

`SPEC.md` describes every behavior of the app. Any behavior change lands in the spec
first, then in code. If code and spec disagree, the spec wins and the code is a bug.
Never change behavior to match code that drifted.

## Failing tests before features

Every feature gets a failing test before its implementation:

1. Write the test from the spec.
2. Run it. Confirm it fails, and that it fails for the reason you expect.
3. Implement until it passes.

Tests live in `tests/` and run under Vitest with the jsdom environment. Web Audio and
canvas are stubbed in tests.

## Before every commit

```
npm test
node build/build.js
```

Both must succeed. `dist/index.html` is a committed artifact, so rebuild it whenever
`src/` changes and commit the result alongside the source.

## Build rules

- Source lives in `src/` as ES modules plus separate CSS files.
- The build inlines all CSS and JS into a single `dist/index.html`.
- Zero external references. No `<link href>`, no `<script src>`, no web fonts, no CDNs,
  no network requests of any kind. The file must run correctly from `file://`.
- The bundler shares one module scope, so top-level identifiers must be unique across
  modules. The build fails loudly if they are not.
- Every module under `src/scripts/` must be reachable from `main.js`, otherwise the
  build refuses to drop it silently.

## Commits

- One commit per task in `tasks/`.
- Conventional Commits format, for example `feat(build): add dependency-free bundler`.
- Append a `changelogs/CHANGELOG.md` entry per task, newest first, with the real
  current time in EDT.

## Style

- Prioritize simplicity and readability over clever solutions.
- Start minimal, verify it works, then add complexity.
- Prefer functional and stateless code where it improves clarity.
- Keep core logic clean and push implementation details to the edges.
- Keep indentation, naming, and patterns consistent across the codebase.
- No em-dashes in prose.
