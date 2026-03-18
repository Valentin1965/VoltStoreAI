import { spawnSync } from 'node:child_process';

// Report-only Prettier check:
// - prints formatting issues
// - never fails CI/build
const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const res = spawnSync(`${cmd} prettier . --check`, { encoding: 'utf8', shell: true });

if (res.stdout) process.stdout.write(res.stdout);
if (res.stderr) process.stderr.write(res.stderr);

if (res.status && res.status !== 0) {
  process.stdout.write('\n[prettier] Formatting issues found. Report-only mode: not failing.\n');
}
process.exit(0);

