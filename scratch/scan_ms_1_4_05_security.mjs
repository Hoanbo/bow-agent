import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('src/core/actionProposal');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

const forbiddenExecutable = [
  'child_process',
  'execSync',
  'exec(',
  'spawn(',
  'fork(',
  'eval(',
  'new Function',
  'powershell',
  'cmd.exe',
  '/bin/sh',
  '/bin/bash',
  'fetch(',
  'autoApprove',
  'bypassPDP',
  'bypassPEP',
  'skipAuthorization',
  'forceAllow',
];

let violations = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let inDefenseBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes('FORBIDDEN_SHELL_PATTERNS = [') || line.includes('bypassFields = [')) {
      inDefenseBlock = true;
      continue;
    }
    if (inDefenseBlock) {
      if (line.includes(']')) {
        inDefenseBlock = false;
      }
      continue;
    }

    if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
      continue;
    }

    for (const pattern of forbiddenExecutable) {
      if (line.includes(pattern)) {
        console.error(`SECURITY VIOLATION in ${file}:${i + 1} -> ${pattern}`);
        violations++;
      }
    }
  }
}

if (violations === 0) {
  console.log('SECURITY STATIC SCAN PASSED: 0 executable violations found across MS-1.4.05 components.');
} else {
  console.error(`SECURITY STATIC SCAN FAILED: ${violations} violations found.`);
  process.exit(1);
}
