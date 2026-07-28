import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { describe, it, expect, beforeAll } from 'vitest';
import { globSync } from 'node:fs';
import { repoPath } from './helpers/paths.js';
import { escapeInline, inject } from '../build/build.js';
import { CAPTCHA_MODULES } from '../src/scripts/captchas/index.js';
import { CAPTCHA_ORDER } from '../src/scripts/state.js';

const DIST = repoPath('dist', 'index.html');

const listFiles = (pattern) =>
  globSync(pattern, { cwd: repoPath() }).map((rel) => repoPath(rel)).sort();

// Lines that survive bundling: everything except import/export syntax and blanks.
const bodyLines = (source) =>
  source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^import\s/.test(line))
    .filter((line) => !/^export\s+(\*|\{|default\s)/.test(line))
    .map((line) => line.replace(/^export\s+/, ''));

let html = '';

beforeAll(() => {
  execFileSync('node', [repoPath('build', 'build.js')], { cwd: repoPath() });
  html = readFileSync(DIST, 'utf8');
});

describe('build output', () => {
  it('writes dist/index.html', () => {
    expect(existsSync(DIST)).toBe(true);
  });

  it('starts with <!doctype html> and mounts #app', () => {
    expect(html.trimStart().toLowerCase().startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('id="app"');
  });

  it('has no external stylesheet or script references', () => {
    expect(html).not.toMatch(/<link[^>]*\shref=/i);
    expect(html).not.toMatch(/<script[^>]*\ssrc=/i);
  });

  // SPEC.md section 9: it runs from file:// and it never touches the network.
  // Anything that could reach off the page is a build failure, not a nit.
  it('reaches the network in no other way either', () => {
    expect(html).not.toMatch(/https?:\/\//i);
    expect(html).not.toMatch(/\burl\(\s*['"]?(?!data:)[a-z0-9./]/i);
    expect(html).not.toMatch(/@import/i);
    expect(html).not.toMatch(/\b(fetch|XMLHttpRequest|EventSource|WebSocket|importScripts)\s*\(/);
    expect(html).not.toMatch(/new\s+(Worker|SharedWorker|Image)\b/);
    expect(html).not.toMatch(/<(img|iframe|video|audio|source|embed|object)\b/i);
  });

  // All eight challenges have to survive bundling, copy and all: a module that
  // silently misses the bundle is a level that cannot be played.
  it('contains all 8 captcha modules', () => {
    const ids = Object.keys(CAPTCHA_MODULES);
    expect(ids.sort()).toEqual([...CAPTCHA_ORDER].sort());

    for (const id of CAPTCHA_ORDER) {
      const module = CAPTCHA_MODULES[id];
      expect(html, `${id}: module file missing from the bundle`)
        .toContain(`// scripts/captchas/${id}.js`);
      expect(html, `${id}: id missing`).toContain(`id: '${id}'`);
      expect(html, `${id}: title missing`).toContain(module.title);
      expect(html, `${id}: instruction missing`).toContain(module.instruction);
    }
  });

  it('inlines every src/styles/*.css file', () => {
    const files = listFiles('src/styles/*.css');
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const css = readFileSync(file, 'utf8').trim();
      expect(html, `missing css from ${file}`).toContain(css);
    }
  });

  it('inlines every src/scripts/**/*.js module', () => {
    const files = listFiles('src/scripts/**/*.js');
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      for (const line of bodyLines(readFileSync(file, 'utf8'))) {
        expect(html, `missing line from ${file}: ${line}`).toContain(line);
      }
    }
  });
});

// Everything ships inside one <script> and one <style>, so the source is being
// pasted into an HTML context. Two ways that goes wrong, neither of which any
// source file triggers today, which is exactly why they need a guard.
describe('inline block escaping', () => {
  it('defuses a closing tag that appears inside the source', () => {
    // HTML tokenisation ends the block at the first `</script`, wherever it is:
    // inside a string, inside a comment, it does not matter.
    expect(escapeInline('const s = "</script>";')).toBe('const s = "<\\/script>";');
    expect(escapeInline('/* see </style> */')).toBe('/* see <\\/style> */');
    expect(escapeInline('</SCRIPT bar')).toBe('<\\/SCRIPT bar');
    expect(escapeInline('a</script>b</script>c')).toBe('a<\\/script>b<\\/script>c');
  });

  it('leaves every other angle bracket alone', () => {
    expect(escapeInline('a < b && c > d')).toBe('a < b && c > d');
    expect(escapeInline('</div></span>')).toBe('</div></span>');
    expect(escapeInline('scriptish </scripts')).toBe('scriptish <\\/scripts');
  });

  it('treats the payload as text, not as a replacement pattern', () => {
    // String.prototype.replace reads `$&` and friends in the replacement as
    // substitution syntax, so a `$&` in any source file would paste the marker
    // back into the bundle.
    expect(inject('a<!-- X -->b', '<!-- X -->', 'p$&q')).toBe('ap$&qb');
    expect(inject('a<!-- X -->b', '<!-- X -->', "$`$'$1")).toBe("a$`$'$1b");
  });

  it('closes each inline block exactly once in the built file', () => {
    expect(html.match(/<\/script>/gi)).toHaveLength(1);
    expect(html.match(/<\/style>/gi)).toHaveLength(1);
  });
});

// The app makes no requests of any kind. The tests above assert that about the
// source; this makes the browser enforce it about the page.
describe('content security policy', () => {
  const policy = () =>
    html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/i)?.[1];

  it('locks the page down to nothing by default', () => {
    expect(policy(), 'no CSP meta tag in the built file').toBeTruthy();
    expect(policy()).toContain("default-src 'none'");
    expect(policy()).toContain("base-uri 'none'");
    expect(policy()).toContain("form-action 'none'");
  });

  // The app sets element.style throughout and hashes do not cover style
  // attributes, so this one genuinely has to stay open.
  it('allows the inline stylesheet', () => {
    expect(policy()).toContain("style-src 'unsafe-inline'");
  });

  it('hashes the script that is actually in the file, so the two cannot drift', () => {
    const script = html.match(/<script type="module">([\s\S]*?)<\/script>/);
    expect(script, 'no inline module script').toBeTruthy();
    const digest = createHash('sha256').update(script[1], 'utf8').digest('base64');
    expect(policy(), 'the CSP hash does not match the inline script').toContain(
      `script-src 'sha256-${digest}'`
    );
  });

  it('declares the policy before the script it governs', () => {
    expect(html.indexOf('Content-Security-Policy')).toBeGreaterThan(-1);
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(
      html.indexOf('<script type="module">')
    );
  });
});
