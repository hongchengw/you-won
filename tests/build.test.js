import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, it, expect, beforeAll } from 'vitest';
import { globSync } from 'node:fs';
import { repoPath } from './helpers/paths.js';

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
