import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const baseline = JSON.parse(readFileSync(new URL('../.eslint-baseline.json', import.meta.url), 'utf8'));
const allowedWarnings = Number(baseline?.warnings ?? 0);

const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';

// Use a single command string so glob patterns work in shells.
const eslintCmd = `eslint "src/**/*.{ts,tsx}" "api/**/*.{ts,tsx}" "scripts/**/*.{js,mjs,ts}" -f json`;
const res = spawnSync(`${cmd} ${eslintCmd}`, { encoding: 'utf8', shell: true });

// If ESLint writes JSON to stdout, parse it and count warnings/errors.
let errors = 0;
let warnings = 0;
try {
  const arr = JSON.parse((res.stdout || '').trim() || '[]');
  for (const f of arr) {
    errors += f.errorCount || 0;
    warnings += f.warningCount || 0;
  }
} catch {
  // Fallback: treat as failure if we can't parse JSON output
  process.stderr.write(res.stdout || '');
  process.stderr.write(res.stderr || '');
  process.exit(2);
}

process.stdout.write(`[lint-ci] errors=${errors} warnings=${warnings} (allowed warnings <= ${allowedWarnings})\n`);

if (errors > 0) process.exit(1);
if (warnings > allowedWarnings) process.exit(1);
process.exit(0);

