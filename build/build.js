// Build: inline every stylesheet and every ES module into one self-contained
// dist/index.html. No dependencies, no network requests, runs from file://.
// SPEC.md section 9.

import { readFileSync, writeFileSync, mkdirSync, globSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve, relative } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src');
const ENTRY = join(SRC, 'scripts', 'main.js');

// tokens.css defines the custom properties everything else reads, so it leads.
const CSS_ORDER = ['tokens.css', 'base.css'];

const read = (file) => readFileSync(file, 'utf8');

const slug = (file) => relative(SRC, file).replace(/[^a-zA-Z0-9]/g, '_');

// --- CSS ------------------------------------------------------------------

function collectStyles() {
  const files = globSync('styles/*.css', { cwd: SRC }).sort((a, b) => {
    const rank = (name) => {
      const i = CSS_ORDER.indexOf(name.split(/[\\/]/).pop());
      return i === -1 ? CSS_ORDER.length : i;
    };
    return rank(a) - rank(b) || a.localeCompare(b);
  });

  return files
    .map((rel) => `/* ${rel.replace(/\\/g, '/')} */\n${read(join(SRC, rel)).trim()}`)
    .join('\n\n');
}

// --- JS -------------------------------------------------------------------

const IMPORT_RE = /^import\s+(?:(.+?)\s+from\s+)?['"](.+?)['"];?\s*$/;

// Turns one module's source into flat statements plus the list of files it
// needs first. Named exports keep their identifiers because every module ends
// up sharing a single scope; default exports get a generated name.
function parseModule(file) {
  const deps = [];
  const out = [];
  const defaultName = `__default_${slug(file)}`;

  for (const line of read(file).split('\n')) {
    const imported = line.match(IMPORT_RE);
    if (imported) {
      const [, clause, spec] = imported;
      if (!spec.startsWith('.')) {
        throw new Error(`${file}: only relative imports are supported, got "${spec}"`);
      }
      const dep = resolve(dirname(file), spec);
      deps.push(dep);
      out.push(...aliasStatements(clause, dep, file));
      continue;
    }

    if (/^export\s+default\s/.test(line)) {
      out.push(line.replace(/^export\s+default\s/, `const ${defaultName} = `));
      continue;
    }
    if (/^export\s*\{/.test(line)) continue;

    out.push(line.replace(/^export\s+/, ''));
  }

  return { file, deps, code: out.join('\n').trim() };
}

// `import x from './a.js'` and `import { a as b }` need a binding; plain named
// imports already resolve in the shared scope, so they emit nothing.
function aliasStatements(clause, dep, file) {
  if (!clause) return [];

  if (clause.includes('*')) {
    throw new Error(`${file}: namespace imports are not supported`);
  }

  const statements = [];
  const [, defaultClause = '', namedClause = ''] =
    clause.match(/^([^{,]*)?,?\s*(\{.*\})?$/) || [];

  const def = defaultClause.trim();
  if (def) statements.push(`const ${def} = __default_${slug(dep)};`);

  for (const entry of namedClause.replace(/[{}]/g, '').split(',')) {
    const [name, alias] = entry.split(/\s+as\s+/).map((s) => s.trim());
    if (alias) statements.push(`const ${alias} = ${name};`);
  }

  return statements;
}

// Depth-first walk from the entry, so a module is always emitted after
// everything it imports.
function bundleScripts() {
  const modules = new Map();
  const ordered = [];
  const visiting = new Set();

  const visit = (file) => {
    if (modules.has(file)) return;
    if (visiting.has(file)) throw new Error(`circular import at ${file}`);
    visiting.add(file);

    const parsed = parseModule(file);
    parsed.deps.forEach(visit);

    visiting.delete(file);
    modules.set(file, parsed);
    ordered.push(parsed);
  };

  visit(ENTRY);

  // Every module must be reachable, otherwise it silently misses the bundle.
  for (const rel of globSync('scripts/**/*.js', { cwd: SRC })) {
    const file = join(SRC, rel);
    if (!modules.has(file)) {
      throw new Error(`${rel} is never imported and would be dropped from the bundle`);
    }
  }

  assertUniqueTopLevel(ordered);

  return ordered
    .map((m) => `// ${relative(SRC, m.file).replace(/\\/g, '/')}\n${m.code}`)
    .join('\n\n');
}

const DECL_RE = /^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/;

function assertUniqueTopLevel(modules) {
  const owners = new Map();
  const clashes = [];

  for (const m of modules) {
    for (const line of m.code.split('\n')) {
      const declared = line.match(DECL_RE);
      if (!declared) continue;
      const name = declared[1];
      if (owners.has(name)) {
        clashes.push(`"${name}" in ${relative(SRC, m.file)} and ${owners.get(name)}`);
      } else {
        owners.set(name, relative(SRC, m.file));
      }
    }
  }

  if (clashes.length) {
    throw new Error(`duplicate top-level identifiers:\n  ${clashes.join('\n  ')}`);
  }
}

// --- Assemble -------------------------------------------------------------

const DEV_TAGS_RE = /^[ \t]*(<link\b[^>]*>|<script\b[^>]*\bsrc=[^>]*>\s*<\/script>)\n?/gim;

// Everything ends up pasted into an HTML context, where tokenisation stops at
// the first `</script` or `</style` regardless of what the JS or CSS thinks it
// is quoting. Both sequences are only ever legal inside a string, a regex or a
// comment, where the backslash is either an escape for `/` or simply inert, so
// defusing them is always safe.
export const escapeInline = (code) => code.replace(/<\/(script|style)/gi, '<\\/$1');

// Replacement, not pattern substitution: `$&` and its friends in the payload
// are literal text. Passing the payload as a string would let a `$&` anywhere
// in the source paste the marker back into the bundle.
export const inject = (html, marker, content) => html.replace(marker, () => content);

// The HTML parser rewrites every CRLF and every lone CR to a single LF before
// anything downstream sees the text, so a hash of what is on disk is not a hash
// of what the browser hashes. Windows checkouts with core.autocrlf produce CRLF
// sources, which is how one block ends up with different line endings from the
// other. Normalising here makes the built file byte-identical on every platform
// and makes the digests below correct on all of them.
export const normalizeNewlines = (text) => text.replace(/\r\n?/g, '\n');

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('base64');

// SPEC.md section 9: the app makes no requests of any kind. `default-src 'none'`
// is that promise stated to the browser rather than only to the test suite.
//
// Both inline blocks are pinned by hash, which the build can do because it just
// produced them, so the policy needs no escape hatch. A hash does not cover a
// style *attribute*, but the app has none: every style it writes goes through
// `element.style.setProperty` or a property setter, and the CSSOM is not
// governed by style-src at all. A future style attribute would be blocked,
// which is the right way for that to fail.
const policyFor = (script, styles) =>
  [
    "default-src 'none'",
    `script-src 'sha256-${sha256(script)}'`,
    `style-src 'sha256-${sha256(styles)}'`,
    "base-uri 'none'",
    "form-action 'none'"
  ].join('; ');

function build() {
  // Normalised then hashed verbatim, so the string that is hashed, the string
  // that is written, and the string the parser hands to the CSP check are all
  // the same string.
  const styles = normalizeNewlines(`\n${escapeInline(collectStyles())}\n`);
  const script = normalizeNewlines(`\n${escapeInline(bundleScripts())}\n`);

  let html = normalizeNewlines(read(join(SRC, 'index.html'))).replace(DEV_TAGS_RE, '');
  html = inject(html, '<!-- STYLES -->', `<style>${styles}</style>`);
  html = inject(html, '<!-- SCRIPTS -->', `<script type="module">${script}</script>`);
  html = inject(
    html,
    '<!-- CSP -->',
    `<meta http-equiv="Content-Security-Policy" content="${policyFor(script, styles)}" />`
  );

  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist', 'index.html'), html, 'utf8');
  return html;
}

// Importing this file, which the tests do to reach the helpers above, must not
// write anything. Only running it as a command builds.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = build();
  console.log(`dist/index.html written (${Buffer.byteLength(output, 'utf8')} bytes)`);
}
