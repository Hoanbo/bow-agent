// src/core/deviceVault/deviceVaultAtomicWrite.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Safe atomic persistence mechanism using temporary files (.tmp),
// sync/flush semantics, recovery markers (.marker), and atomic replace.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { computeVaultDigest } from './deviceVaultFingerprint.js';

export interface RecoveryMarker {
  readonly targetPath: string;
  readonly tmpPath: string;
  readonly checksum: string;
  readonly timestamp: number;
}

/**
 * Performs an atomic write of payload to destination file.
 * 1. Write payload to temporary file (<dest>.tmp.<hash>)
 * 2. Write recovery marker (<dest>.marker)
 * 3. Atomic rename temporary file to destination
 * 4. Clean up recovery marker
 */
export function atomicWriteFileSync(destPath: string, payload: string): void {
  const dir = path.dirname(destPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const checksum = computeVaultDigest(payload);
  const tmpPath = `${destPath}.tmp.${checksum}`;
  const markerPath = `${destPath}.marker`;

  try {
    // 1. Write temporary file
    fs.writeFileSync(tmpPath, payload, 'utf8');

    // 2. Write recovery marker
    const marker: RecoveryMarker = {
      targetPath: destPath,
      tmpPath,
      checksum,
      timestamp: Date.now(),
    };
    fs.writeFileSync(markerPath, JSON.stringify(marker), 'utf8');

    // 3. Atomic replace
    fs.renameSync(tmpPath, destPath);

    // 4. Cleanup marker
    if (fs.existsSync(markerPath)) {
      fs.unlinkSync(markerPath);
    }
  } catch (err) {
    // Clean up temporary file on failure
    if (fs.existsSync(tmpPath)) {
      try {
        fs.unlinkSync(tmpPath);
      } catch {
        // Ignore secondary error during cleanup
      }
    }
    throw new Error(`[VAULT_IO_ERROR] Atomic write failed for ${destPath}: ${(err as Error).message}`);
  }
}

/**
 * Checks for and parses an existing recovery marker for a target file.
 */
export function readRecoveryMarkerSync(destPath: string): RecoveryMarker | null {
  const markerPath = `${destPath}.marker`;
  if (!fs.existsSync(markerPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(markerPath, 'utf8');
    return JSON.parse(raw) as RecoveryMarker;
  } catch {
    return null;
  }
}

/**
 * Cleans up orphaned temporary and marker files for a given target path.
 */
export function cleanupAtomicArtifactsSync(destPath: string): void {
  const markerPath = `${destPath}.marker`;
  if (fs.existsSync(markerPath)) {
    try {
      fs.unlinkSync(markerPath);
    } catch {
      // Best-effort
    }
  }

  const dir = path.dirname(destPath);
  const base = path.basename(destPath);
  if (fs.existsSync(dir)) {
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.startsWith(`${base}.tmp.`)) {
          try {
            fs.unlinkSync(path.join(dir, file));
          } catch {
            // Best-effort
          }
        }
      }
    } catch {
      // Best-effort
    }
  }
}
