import fs from 'node:fs';
import path from 'node:path';

// Master Ecosystem Synchronizer
// Synchronizes freshly compiled @bow/agent (dist & types) across all BOW projects safely

const rootDir = path.resolve('C:/BOW');
const sourceDist = path.join(rootDir, 'bow-agent', 'dist');
const sourcePkg = path.join(rootDir, 'bow-agent', 'package.json');

const targets = [
  path.join(rootDir, 'shopofbow', 'node_modules', '@bow', 'agent', 'dist'),
  path.join(rootDir, 'bow-test', 'node_modules', '@bow', 'agent', 'dist'),
  path.join(rootDir, 'bow-mobile', 'node_modules', '@bow', 'agent', 'dist'),
];

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
