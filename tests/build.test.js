import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, it, expect, beforeAll } from 'vitest';
import { globSync } from 'node:fs';
import { repoPath } from './helpers/paths.js';
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
