// src/core/deliberation/deliberationPersistenceRecoveryEngine.ts
// BOWCON V4.0 — MS-1.5.05: DELIBERATION PERSISTENCE & RECOVERY ENGINE
// Component 1026 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// DELIBERATION != AUTHORIZATION
// DELIBERATION != EXECUTION
// USER_STOP > ALL MUTATION
// WORKING STATE != DURABLE TRUTH
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// STRICT_TENANT_ISOLATION == TRUE
// CRASH_SAFE_ATOMIC_PERSISTENCE == TRUE

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  type DeliberationSessionDocument,
  DeliberationUserStopError,
  DeliberationConcurrencyError,
  CrossTenantDeliberationError,
  DeliberationIntegrityError,
  DeliberationValidationError,
  computeSessionProvenanceHash,
} from './deliberationTypes.js';
import { DeliberationValidator } from './deliberationValidator.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface DeliberationPersistenceOptions {
  readonly baseDir?: string;
  readonly userStopProvider?: () => boolean;
}

export class DeliberationPersistenceRecoveryEngine {
  private readonly baseDir: string;
  private readonly userStopProvider: () => boolean;

  constructor(options?: DeliberationPersistenceOptions) {
    this.baseDir = options?.baseDir
      ? path.resolve(options.baseDir)
      : path.resolve(process.cwd(), 'data', 'partitions_deliberation');
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * Resolves the isolated directory for a specific tenant.
   */
  public getTenantSessionDir(tenantId: string): string {
    const partition = resolveUserPartition(tenantId.trim(), this.baseDir);
    const tenantDir = path.resolve(this.baseDir, partition.partitionKey, 'sessions');
    if (!fs.existsSync(tenantDir)) {
      fs.mkdirSync(tenantDir, { recursive: true });
    }
    return tenantDir;
  }

  /**
   * Crash-safe atomic persistence:
   * serialize -> write .tmp.<random> -> validate -> snapshot .bak -> atomic rename
   */
  public saveSession(
    doc: DeliberationSessionDocument,
    expectedVersion?: number,
    activeTenantId?: string
  ): void {
    // 1. Synchronous USER_STOP check
    if (this.userStopProvider()) {
      throw new DeliberationUserStopError('save_deliberation_session');
    }

    // 2. Tenant isolation check
    if (activeTenantId && doc.tenantId !== activeTenantId) {
      throw new CrossTenantDeliberationError(doc.tenantId, activeTenantId);
    }

    // 3. Schema and boundaries validation
    DeliberationValidator.validateSession(doc);

    // 4. Cryptographic provenance verification
    const expectedHash = computeSessionProvenanceHash(doc);
    if (doc.provenanceHash !== expectedHash) {
      throw new DeliberationIntegrityError(
        `Session provenance mismatch: document hash '${doc.provenanceHash}' does not match computed hash '${expectedHash}'`,
        { sessionId: doc.sessionId }
      );
    }

    const tenantDir = this.getTenantSessionDir(doc.tenantId);
    const safeSessionId = this.sanitizeFileName(doc.sessionId);
    const targetFile = path.resolve(tenantDir, `${safeSessionId}.json`);
    const backupFile = path.resolve(tenantDir, `${safeSessionId}.json.bak`);
    const tempFile = path.resolve(tenantDir, `${safeSessionId}.tmp.${crypto.randomBytes(6).toString('hex')}`);

    // 5. Concurrency check against existing file if present
    if (fs.existsSync(targetFile)) {
      try {
        const existingRaw = fs.readFileSync(targetFile, 'utf8');
        const existingDoc = JSON.parse(existingRaw) as DeliberationSessionDocument;
        if (expectedVersion !== undefined && existingDoc.sessionVersion !== expectedVersion) {
          throw new DeliberationConcurrencyError(expectedVersion, existingDoc.sessionVersion, {
            sessionId: doc.sessionId,
            targetFile,
          });
        }
      } catch (err) {
        if (err instanceof DeliberationConcurrencyError) {
          throw err;
        }
        // If file exists but is corrupted, continue to allow overwrite/recovery
      }
    }

    // 6. Serialize canonical state
    const serialized = JSON.stringify(doc, null, 2);

    // 7. Write to temp file
    fs.writeFileSync(tempFile, serialized, 'utf8');

    // 8. Validate temp file content integrity
    const readBack = fs.readFileSync(tempFile, 'utf8');
    if (readBack !== serialized) {
      try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
      throw new DeliberationIntegrityError('Integrity validation failed on serialized deliberation temporary file');
    }

    // 9. Snapshot current state to .bak if target exists
    if (fs.existsSync(targetFile)) {
      try {
        fs.copyFileSync(targetFile, backupFile);
      } catch {
        // Continue if backup copy fails
      }
    }

    // 10. Atomic rename
    fs.renameSync(tempFile, targetFile);
  }

  /**
   * Loads a session from disk with provenance integrity checking and fallback to .bak.
   */
  public loadSession(sessionId: string, tenantId: string): DeliberationSessionDocument {
    if (this.userStopProvider()) {
      throw new DeliberationUserStopError('load_deliberation_session');
    }

    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new DeliberationValidationError('tenantId is required', ['invalid_tenantId']);
    }

    const tenantDir = this.getTenantSessionDir(tenantId);
    const safeSessionId = this.sanitizeFileName(sessionId);
    const targetFile = path.resolve(tenantDir, `${safeSessionId}.json`);
    const backupFile = path.resolve(tenantDir, `${safeSessionId}.json.bak`);

    if (!fs.existsSync(targetFile) && !fs.existsSync(backupFile)) {
      throw new DeliberationIntegrityError(`Deliberation session not found: '${sessionId}' for tenant '${tenantId}'`);
    }

    // Attempt loading primary file
    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        const doc = JSON.parse(raw) as DeliberationSessionDocument;

        if (doc.tenantId !== tenantId.trim()) {
          throw new CrossTenantDeliberationError(doc.tenantId, tenantId);
        }

        DeliberationValidator.validateSession(doc);
        const computedHash = computeSessionProvenanceHash(doc);
        if (doc.provenanceHash !== computedHash) {
          throw new DeliberationIntegrityError('Primary session document provenance hash mismatch');
        }

        return Object.freeze(doc);
      } catch (err) {
        if (err instanceof CrossTenantDeliberationError) {
          throw err;
        }
        // Primary failed or corrupted -> attempt backup recovery
      }
    }

    // Fallback to backup
    if (fs.existsSync(backupFile)) {
      try {
        const rawBak = fs.readFileSync(backupFile, 'utf8');
        const bakDoc = JSON.parse(rawBak) as DeliberationSessionDocument;

        if (bakDoc.tenantId !== tenantId.trim()) {
          throw new CrossTenantDeliberationError(bakDoc.tenantId, tenantId);
        }

        DeliberationValidator.validateSession(bakDoc);
        const computedHash = computeSessionProvenanceHash(bakDoc);
        if (bakDoc.provenanceHash !== computedHash) {
          throw new DeliberationIntegrityError('Backup session document provenance hash mismatch');
        }

        const recovered: DeliberationSessionDocument = Object.freeze({
          ...bakDoc,
          recoveredFromBackup: true,
        });

        // Restore backup to primary atomically
        try {
          fs.copyFileSync(backupFile, targetFile);
        } catch {
          // ignore
        }

        return recovered;
      } catch (err) {
        if (err instanceof CrossTenantDeliberationError) {
          throw err;
        }
        throw new DeliberationIntegrityError(`Both primary and backup deliberation documents corrupted for session '${sessionId}'`);
      }
    }

    throw new DeliberationIntegrityError(`Failed to load or recover deliberation session '${sessionId}'`);
  }

  /**
   * Lists all session IDs belonging strictly to a tenant.
   */
  public listSessions(tenantId: string): readonly string[] {
    if (this.userStopProvider()) {
      throw new DeliberationUserStopError('list_deliberation_sessions');
    }

    const tenantDir = this.getTenantSessionDir(tenantId);
    if (!fs.existsSync(tenantDir)) {
      return Object.freeze([]);
    }

    const files = fs.readdirSync(tenantDir);
    const sessionIds = files
      .filter((f) => f.endsWith('.json') && !f.includes('.tmp.') && !f.endsWith('.bak'))
      .map((f) => f.replace(/\.json$/, ''));

    return Object.freeze(sessionIds);
  }

  /**
   * Deletes a session document and its backup for a tenant.
   */
  public deleteSession(sessionId: string, tenantId: string): void {
    if (this.userStopProvider()) {
      throw new DeliberationUserStopError('delete_deliberation_session');
    }

    const tenantDir = this.getTenantSessionDir(tenantId);
    const safeSessionId = this.sanitizeFileName(sessionId);
    const targetFile = path.resolve(tenantDir, `${safeSessionId}.json`);
    const backupFile = path.resolve(tenantDir, `${safeSessionId}.json.bak`);

    if (fs.existsSync(targetFile)) {
      try { fs.unlinkSync(targetFile); } catch { /* ignore */ }
    }
    if (fs.existsSync(backupFile)) {
      try { fs.unlinkSync(backupFile); } catch { /* ignore */ }
    }
  }

  private sanitizeFileName(name: string): string {
    const clean = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (clean.length === 0 || clean.startsWith('.')) {
      return `session_${crypto.createHash('sha256').update(name).digest('hex').slice(0, 12)}`;
    }
    return clean;
  }
}

export const globalDeliberationPersistenceRecoveryEngine = new DeliberationPersistenceRecoveryEngine();
