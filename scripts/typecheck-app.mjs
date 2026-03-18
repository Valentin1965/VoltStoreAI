import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// "Report-only" TypeScript check:
// - prints all TS errors
// - never fails CI/build by exiting non-zero
const tscBin =
  process.platform === 'win32' ? 'node_modules/.bin/tsc.cmd' : 'node_modules/.bin/tsc';

const cmd = existsSync(tscBin) ? resolve(tscBin) : 'tsc';

const result =
  process.platform === 'win32'
    ? spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-Command',
          `& '${cmd.replaceAll("'", "''")}' -p tsconfig.appcheck.json --noEmit`,
        ],
        { encoding: 'utf8' },
      )
    : spawnSync(cmd, ['-p', 'tsconfig.appcheck.json', '--noEmit'], { encoding: 'utf8' });

if (result.error) {
  process.stderr.write(`[TypeScript] Failed to run tsc: ${String(result.error)}\n`);
}
if (result.stdout) process.stdout.write(result.stdout);
if (result.stderr) process.stderr.write(result.stderr);

// Always succeed; this script is for visibility only.
if (result.status && result.status !== 0) {
  process.stdout.write(`\n[TypeScript] Found errors (exit ${result.status}). Report-only mode: not failing.\n`);
}
process.exitCode = 0;

