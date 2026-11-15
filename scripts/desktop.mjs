import { spawnSync } from 'node:child_process';

const [operation, expectedPlatform] = process.argv.slice(2);
if (expectedPlatform && process.platform !== expectedPlatform) {
  throw new Error(`This command requires ${expectedPlatform}.`);
}
if (!['prepare', 'package'].includes(operation)) throw new Error('Use prepare or package.');
const windows = process.platform === 'win32';
if (!windows && process.platform !== 'darwin') {
  throw new Error('Desktop packaging currently supports macOS arm64 and Windows x64.');
}
const script =
  operation === 'prepare' ? 'prepare-backend' : `package-${windows ? 'windows' : 'macos'}`;
const result = spawnSync(
  windows ? 'powershell.exe' : 'bash',
  windows ? ['-NoProfile', '-File', `scripts/${script}.ps1`] : [`scripts/${script}.sh`],
  { stdio: 'inherit' },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
