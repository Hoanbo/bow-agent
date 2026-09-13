// scratch/scan_ms_1_4_10_security.mjs
// BOWCON V4.0 — MS-1.4.10: SECURITY SCANNER FOR PRODUCTION AGENT LOOP FAÇADE

import fs from 'node:fs';
import path from 'node:path';

const targetDir = path.resolve(process.cwd(), 'src', 'core', 'agentLoopFacade');
const forbiddenTokens = [
  'child_process',
  'execSync',
  'exec(',
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
  'forceExecute',
  'skipPDP',
  'skipPEP',
  'bypassApproval',
  'skipUserStop',
  'bypassVerification',
  'bypassCommit',
  'unboundedLoop',
  'while(true)',
  'while (true)',
  'MS-1.4.11',
  '1.4.11',
  'ms_1_4_11',
];

if (!fs.existsSync(targetDir)) {
  console.error(`Target directory not found: ${targetDir}`);
  process.exit(1);
}

const files = fs.readdirSync(targetDir).filter((f) => f.endsWith('.ts'));
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
  console.log('SECURITY SCAN PASSED: Zero forbidden process, dynamic execution, network, bypass, or future-milestone tokens found.');
  process.exit(0);
} else {
  console.error(`SECURITY SCAN FAILED: ${totalViolations} violations detected.`);
  process.exit(1);
}
