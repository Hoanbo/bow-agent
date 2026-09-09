import fs from 'node:fs';
import path from 'node:path';

// Master Ecosystem Synchronizer
// Synchronizes freshly compiled @bow/agent (dist & types) across all BOW projects safely

const currentDir = process.cwd();
const parentDir = path.dirname(currentDir);
const candidateRoots = [parentDir, path.resolve('C:/BOW')];
const activeRootDir = candidateRoots.find(r => fs.existsSync(path.join(r, 'bow-agent', 'package.json'))) || currentDir;

const sourceDist = fs.existsSync(path.join(currentDir, 'dist'))
  ? path.join(currentDir, 'dist')
  : path.join(activeRootDir, 'bow-agent', 'dist');
const sourcePkg = fs.existsSync(path.join(currentDir, 'package.json'))
  ? path.join(currentDir, 'package.json')
  : path.join(activeRootDir, 'bow-agent', 'package.json');

const targets = [];
for (const root of candidateRoots) {
  // CRITICAL INVARIANT: Never target C:\BOW\shopofbow (READS=0, WRITES=0, IMPORTS=0, TOUCHES=0)
  targets.push(
    path.join(root, 'bow-test', 'node_modules', '@bow', 'agent', 'dist'),
    path.join(root, 'bow-mobile', 'node_modules', '@bow', 'agent', 'dist')
  );
}

console.log('[ECOSYSTEM-SYNC] Checking source build at:', sourceDist);

if (!fs.existsSync(sourceDist)) {
  console.error('[ECOSYSTEM-SYNC] Error: bow-agent/dist does not exist. Run "npm run build" first.');
  process.exit(1);
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

let syncCount = 0;
for (const target of targets) {
  try {
    const parentDir = path.dirname(target);
    if (fs.existsSync(path.dirname(parentDir))) {
      copyRecursive(sourceDist, target);
      // Also copy package.json so imports resolve correctly
      const targetPkg = path.join(parentDir, 'package.json');
      if (fs.existsSync(sourcePkg)) {
        fs.copyFileSync(sourcePkg, targetPkg);
      }
      console.log(`[ECOSYSTEM-SYNC] ✓ Synced -> ${target}`);
      syncCount++;
    }
  } catch (err) {
    console.warn(`[ECOSYSTEM-SYNC] ⚠ Warning syncing to ${target}:`, err.message);
  }
}

console.log(`[ECOSYSTEM-SYNC] Done! Synchronized @bow/agent to ${syncCount} ecosystem targets.`);
