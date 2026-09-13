// scratch/scan_ms_1_4_08_security.mjs
import fs from 'node:fs';
import path from 'node:path';

const targetDir = path.resolve(process.cwd(), 'src', 'core', 'durableCommit');
const forbiddenTokens = [
  'child_process',
  'execSync',
  'exec(',
  'spawn(',
  'fork(',
  'eval(',
  'new Function',
  'forceCommit',
  'allowUnverifiedCommit',
  'skipUserStop',
  'bypassPDP',
  'bypassPEP',
  'skipAuthorization',
  'forceAllow',
  'commitWithoutVerification',
  'autoApprove',
  'disableGovernance',
  'fetch(',
  'axios',
  'http.request',
  'https.request',
];

const files = fs.readdirSync(targetDir).filter(f => f.endsWith('.ts'));
let totalViolations = 0;

console.log(`Scanning ${files.length} files in ${targetDir} for forbidden security patterns...\n`);

for (const file of files) {
  const filePath = path.join(targetDir, file);
  const content = fs.readFileSync(filePath, 'utf8');

  for (const token of forbiddenTokens) {
    if (content.includes(token)) {
      console.error(`[SECURITY_VIOLATION] Found forbidden token "${token}" in ${file}`);
      totalViolations++;
    }
  }
}

if (totalViolations === 0) {
  console.log('SECURITY SCAN PASSED: Zero forbidden execution, dynamic evaluation, network, or authority bypass tokens found.');
  process.exit(0);
} else {
  console.error(`SECURITY SCAN FAILED: ${totalViolations} violations detected.`);
  process.exit(1);
}
