import { readFileSync, existsSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { repoPath } from './helpers/paths.js';

describe('SPEC.md', () => {
  it('exists', () => {
    expect(existsSync(repoPath('SPEC.md'))).toBe(true);
  });

  it('is non-empty', () => {
    const spec = readFileSync(repoPath('SPEC.md'), 'utf8');
    expect(spec.trim().length).toBeGreaterThan(0);
  });
});
