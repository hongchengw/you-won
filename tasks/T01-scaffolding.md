# T01 — Scaffolding, build pipeline, test harness

**Spec:** SPEC.md §9

## Goal

Stand up the repo skeleton so every later task has a place to put code, a way to test it, and a way to ship it.

## Failing tests first

`tests/build.test.js`:
- `dist/index.html` produced by the build contains no `<link ... href=` stylesheet references and no `<script ... src=` references
- the built file contains the contents of every `src/styles/*.css` file
- the built file contains the contents of every `src/scripts/**/*.js` module
- the built file starts with `<!doctype html>` and contains the `#app` mount point

`tests/spec.test.js`:
- `SPEC.md` exists and is non-empty (guards against the source of truth being deleted)

Run them, confirm they fail, then implement.

## Implement

1. `package.json` — name `you-won`, `"type": "module"`, private. Scripts:
   - `build`: `node build/build.js`
   - `test`: `vitest run`
   - `test:watch`: `vitest`
   Dev deps: `vitest`, `jsdom`.
2. `vitest.config.js` — `environment: 'jsdom'`, include `tests/**/*.test.js`.
3. `src/index.html` — minimal shell: `<!doctype html>`, meta charset + viewport, title `You Won!`, `<div id="app"></div>`, a `<!-- STYLES -->` and `<!-- SCRIPTS -->` placeholder pair for the build to fill, plus dev-time `<link>`/`<script type="module">` tags so the source tree also works when served directly.
4. `src/styles/tokens.css` — the palette table from SPEC §8 as custom properties. Other CSS files can be created empty-with-a-comment for now.
5. `src/scripts/main.js` — placeholder that mounts a "loading" node into `#app`. Later tasks replace it.
6. `build/build.js` — reads `src/index.html`, concatenates `src/styles/*.css` into one inline `<style>`, bundles `src/scripts/**` into one inline `<script type="module">`, strips the dev `<link>`/`<script src>` tags, writes `dist/index.html`.
   - Keep the bundler simple and dependency-free: resolve relative `import` statements, topologically order modules, strip `import`/`export` keywords, and concatenate into a single module scope. Assert no duplicate top-level identifiers across modules; fail the build loudly if that happens.
   - If a hand-rolled bundler proves fragile, `esbuild` as a dev dependency is an acceptable substitute — the only hard requirement is a single self-contained `dist/index.html` with zero external references.
7. `.gitignore` — `node_modules/`. **Do not ignore `dist/`**; the built file is a committed artifact.
8. `changelogs/CHANGELOG.md` — header plus the T01 entry.
9. `AGENTS.md` — document the workflow: SPEC.md is source of truth, failing tests before features, `npm test` then `node build/build.js` before every commit, one commit per task, conventional commit messages.

## Acceptance

- `npm install` succeeds
- `npm test` passes
- `node build/build.js` writes `dist/index.html`
- Opening `dist/index.html` from `file://` shows the placeholder with zero console errors and zero network requests
