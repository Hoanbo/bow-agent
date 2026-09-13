// scratch/scan_ms_1_4_11_security.mjs
// BOWCON V4.0 — MS-1.4.11 SECURITY SCANNER
// Scans src/core/agentObservability/ for prohibited process, dynamic, network, bypass, loop, or future tokens

import fs from 'node:fs';
import path from 'node:path';

const TARGET_DIR = path.resolve('src/core/agentObservability');

const FORBIDDEN_TOKENS = [
  'child_process',
  'execSync',
  'spawn(',
  'fork(',
  'eval(',
  'new Function',
  'fetch(',
  'axios',
  'http.request',
  'https.request',
  'net.connect',
  'tls.connect',
  'skipPDP',
  'skipPEP',
  'bypassApproval',
  'skipUserStop',
  'bypassVerification',
  'bypassCommit',
  'forceExecute',
  'while(true)',
  'while (true)',
  'unboundedLoop',
  'setInterval',
  'setImmediate',
  'MS-1.4.12',
  'MS-1.4.13',
  'Milestone 1.4.12',
  'Milestone 1.4.13',
];

if (!fs.existsSync(TARGET_DIR)) {
  console.error(`ERROR: Target directory does not exist: ${TARGET_DIR}`);
  process.exit(1);
}

const files = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
let totalViolations = 0;

console.log(`Scanning ${files.length} files in ${TARGET_DIR} for forbidden security patterns...\n`);

for (const file of files) {
  const filePath = path.join(TARGET_DIR, file);
  const content = fs.readFileSync(filePath, 'utf8');

  for (const token of FORBIDDEN_TOKENS) {
    if (content.includes(token)) {
      console.error(`[SECURITY VIOLATION] File ${file} contains forbidden token: "${token}"`);
      totalViolations++;
    }
  }
}

if (totalViolations > 0) {
  console.error(`\nSECURITY SCAN FAILED: Found ${totalViolations} forbidden tokens in MS-1.4.11.`);
  process.exit(1);
}

console.log('SECURITY SCAN PASSED: Zero forbidden process, dynamic execution, network, bypass, or future-milestone tokens found.\n');
process.exit(0);
