// src/core/deviceVault/deviceVaultRecovery.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Recovery protocol for interrupted writes, orphaned temporary files,
// and recovery markers. Recovery MUST NOT silently grant trust.

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { VaultRecoveryRecord } from './deviceVaultTypes.js';
import { readRecoveryMarkerSync, cleanupAtomicArtifactsSync } from './deviceVaultAtomicWrite.js';
import { computeVaultDigest } from './deviceVaultFingerprint.js';

export interface RecoverFileResult {
  readonly recovered: boolean;
  readonly record: VaultRecoveryRecord;
  readonly error?: string;
}

/**
 * Recovers a target file from any pending atomic write recovery marker.
 * Strictly verifies checksum of temporary file before completing rename.
 * Discards incomplete writes and fails closed on unrecoverable corruption.
 */
export function recoverInterruptedWriteSync(destPath: string): RecoverFileResult {
  const now = Date.now();
  const marker = readRecoveryMarkerSync(destPath);

  if (!marker) {
    // Check for dangling tmp files without marker
    cleanupAtomicArtifactsSync(destPath);
    return {
      recovered: false,
      record: {
        recoveredAt: now,
        action: 'NO_MARKER_FOUND',
        restoredFrom: 'CANONICAL',
        recoveredEntries: 0,
        discardedFragments: 0,
      },
    };
  }

  // A marker was found: an interrupted write occurred!
  const tmpExists = fs.existsSync(marker.tmpPath);

  if (tmpExists) {
    try {
      const tmpContent = fs.readFileSync(marker.tmpPath, 'utf8');
      const actualChecksum = computeVaultDigest(tmpContent);

      if (actualChecksum === marker.checksum) {
        // Complete the atomic write that was interrupted right before rename
        fs.renameSync(marker.tmpPath, destPath);
        cleanupAtomicArtifactsSync(destPath);

        return {
          recovered: true,
          record: {
            recoveredAt: now,
            action: 'COMPLETED_INTERRUPTED_RENAME',
            restoredFrom: marker.tmpPath,
            recoveredEntries: 1,
            discardedFragments: 0,
            details: { checksum: actualChecksum },
          },
        };
      }
    } catch {
      // Fall through to discard corrupted tmp
    }
  }

  // If tmp is corrupted or missing, discard marker and tmp; prior canonical remains intact
  cleanupAtomicArtifactsSync(destPath);
  const canonicalExists = fs.existsSync(destPath);

  return {
    recovered: false,
    record: {
      recoveredAt: now,
      action: 'DISCARDED_CORRUPTED_TMP',
      restoredFrom: canonicalExists ? 'CANONICAL_PREVIOUS' : 'NONE',
      recoveredEntries: 0,
      discardedFragments: 1,
      details: {
        canonicalIntact: canonicalExists,
        markerChecksum: marker.checksum,
      },
    },
  };
}

/**
 * Scans an entire storage directory and recovers all interrupted writes.
 */
export function recoverStorageDirectorySync(storageDir: string): readonly VaultRecoveryRecord[] {
  if (!fs.existsSync(storageDir)) {
    return [];
  }

  const records: VaultRecoveryRecord[] = [];
  try {
    const files = fs.readdirSync(storageDir);
    for (const file of files) {
      if (file.endsWith('.marker')) {
        const destFile = file.slice(0, -'.marker'.length);
        const destPath = path.join(storageDir, destFile);
        const res = recoverInterruptedWriteSync(destPath);
        records.push(res.record);
      }
    }
  } catch {
    // Ignore directory scan errors
  }

  return Object.freeze(records);
}
