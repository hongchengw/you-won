# Changelog

Newest entries at the top. Times are EDT.

## T01 — Scaffolding, build pipeline, test harness

**2026-07-26 6:27 PM EDT**

- Added `package.json` (`you-won`, ESM, private) with `build`, `test`, and `test:watch` scripts, plus `vitest` and `jsdom` dev deps.
- Added `vitest.config.js` running the jsdom environment over `tests/**/*.test.js`.
- Added `tests/spec.test.js` guarding that `SPEC.md` exists and is non-empty.
- Added `tests/build.test.js` asserting the built file starts with `<!doctype html>`, mounts `#app`, carries no external `<link href>` or `<script src>` references, and inlines every stylesheet and every script module.
- Added `src/index.html` shell with `<!-- STYLES -->` and `<!-- SCRIPTS -->` placeholders and dev-time tags so the source tree also works when served directly.
- Added `src/styles/tokens.css` with the kawaii palette, radii, font stacks, and sticker shadow from SPEC section 8. Remaining stylesheets stubbed for later tasks.
- Added `src/scripts/main.js` placeholder that mounts a loading node into `#app`.
- Added `build/build.js`, a dependency-free bundler that concatenates the stylesheets, walks relative imports from `main.js` in topological order, strips import and export syntax into one shared module scope, fails loudly on duplicate top-level identifiers or unreachable modules, and writes a single self-contained `dist/index.html`.
- Added `AGENTS.md` documenting the workflow and `changelogs/CHANGELOG.md`.
