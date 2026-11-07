import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The planner belongs to its own company and must never be able to reach, or
 * be reached from, any other application (docs/decisions/0002). These checks
 * fail the build if code or docs reach outside the `planner` schema or refer
 * to the other application.
 */
function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|sql|md)$/.test(name)) out.push(full);
  }
  return out;
}

const ROOT = process.cwd();
const sources = walk(join(ROOT, 'src')).filter((f) => !f.endsWith('guardrails.test.ts'));
const docs = [
  ...walk(join(ROOT, 'docs')),
  ...['README.md', 'instructions.md', '.env.example'].map((f) => join(ROOT, f)),
];

describe('isolation from other applications', () => {
  it('declares every table and enum through the planner schema object', () => {
    const offenders = walk(join(ROOT, 'src', 'db', 'schema')).filter((f) =>
      /\bpgTable\(|\bpgEnum\(/.test(readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });

  it('never references the public schema in SQL or queries', () => {
    const offenders = sources.filter((f) =>
      /"public"\.|\bpublic\.[a-z_]+\b/.test(readFileSync(f, 'utf8'))
    );
    expect(offenders).toEqual([]);
  });

  it("never mentions the other company's application, in code or docs", () => {
    const pattern = /budget-site|finances\.raksimoni|finance app|finance project/i;
    const offenders = [...sources, ...docs].filter((f) => pattern.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
