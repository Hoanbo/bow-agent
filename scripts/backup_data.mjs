// scripts/backup_data.mjs
// BOWCON V4.0 — AUTOMATED SNAPSHOT BACKUP SCRIPT

import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = process.cwd();
const DATA_DIR = path.resolve(ROOT_DIR, 'data');
const BACKUP_DIR = path.resolve(ROOT_DIR, 'data', 'snapshots');

function runBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetSnapshotDir = path.join(BACKUP_DIR, `snapshot_${timestamp}`);

  if (!fs.existsSync(DATA_DIR)) {
    console.error(`[BACKUP-ERROR] Data directory does not exist: ${DATA_DIR}`);
    process.exit(1);
  }

  if (!fs.existsSync(targetSnapshotDir)) {
    fs.mkdirSync(targetSnapshotDir, { recursive: true });
  }

  const items = fs.readdirSync(DATA_DIR);
  let backedUpCount = 0;

  for (const item of items) {
    if (item === 'snapshots' || item === 'certs' || item.startsWith('.')) continue;

    const sourcePath = path.join(DATA_DIR, item);
    const destPath = path.join(targetSnapshotDir, item);

    try {
      const stat = fs.statSync(sourcePath);
      if (stat.isFile()) {
        fs.copyFileSync(sourcePath, destPath);
        backedUpCount++;
      } else if (stat.isDirectory()) {
        fs.cpSync(sourcePath, destPath, { recursive: true });
        backedUpCount++;
      }
    } catch (err) {
      console.warn(`[BACKUP-WARN] Could not backup item: ${item}`, err);
    }
  }

  console.log(`[BACKUP-SUCCESS] Created snapshot with ${backedUpCount} items at: ${targetSnapshotDir}`);
}

runBackup();
