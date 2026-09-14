// src/core/governedExecution/executionPersistenceRecoveryEngine.ts
// BOWCON V4.0 — MS-1.5.09: EXECUTION PERSISTENCE & RECOVERY ENGINE
// Component 1066 — REAL
//
// EN: Multi-tenant, crash-safe persistence and recovery engine for execution sessions.
//     Enforces atomic write sequences (.tmp -> .bak -> rename), OCC CAS versioning, and provenance validation.
// VI: Động cơ lưu trữ và phục hồi đa bên thuê, an toàn khi gặp sự cố cho các phiên thực thi.
//     Thực thi chuỗi ghi nguyên tử (.tmp -> .bak -> đổi tên), kiểm soát phiên bản OCC CAS và xác thực nguồn gốc.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import {
  type GovernedExecutionSessionDocument,
  type GovernedExecutionResultEnvelope,
  type ExecutionLease,
  ExecutionPersistenceError,
  ExecutionConcurrencyError,
  ExecutionUserStopError,
  ExecutionTenantIsolationError,
  ExecutionSessionIsolationError,
  computeExecutionSessionDocumentHash,
  GOVERNED_EXECUTION_SCHEMA_VERSION,
} from './executionTypes.js';
import { ExecutionRequestValidator } from './executionRequestValidator.js';

export interface PersistenceEngineOptions {
  readonly baseDirectory?: string;
  readonly userStopProvider?: () => boolean;
}

export class ExecutionPersistenceRecoveryEngine {
  private readonly baseDirectory: string;
  private readonly userStopProvider: () => boolean;

  constructor(options?: PersistenceEngineOptions) {
    this.baseDirectory = options?.baseDirectory ?? 'data/partitions_governed_execution';
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Resolves safe session directory under tenant partition.
   * VI: Giải quyết thư mục phiên an toàn dưới phân vùng bên thuê.
   */
  public getSessionDir(tenantId: string, sessionId: string): string {
    const partition = resolveUserPartition(tenantId.trim(), this.baseDirectory);
    const safeSessionId = this.sanitizeSessionId(sessionId);
    const sessionDir = path.resolve(this.baseDirectory, partition.partitionKey, 'sessions', safeSessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
  }

  private sanitizeSessionId(sessionId: string): string {
    return sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
  }

  /**
   * EN: Loads session document with automatic backup recovery upon corruption.
   * VI: Tải tài liệu phiên với khả năng phục hồi sao lưu tự động khi phát hiện tệp bị hỏng.
   */
  public loadSessionDocument(tenantId: string, sessionId: string): GovernedExecutionSessionDocument {
    const sessionDir = this.getSessionDir(tenantId, sessionId);
    const canonicalPath = path.join(sessionDir, 'execution_session.json');
    const backupPath = path.join(sessionDir, 'execution_session.json.bak');

    if (!fs.existsSync(canonicalPath)) {
      if (fs.existsSync(backupPath)) {
        return this.loadAndValidateFile(backupPath, tenantId, sessionId, true);
      }
      // Return fresh initial document
      return this.createInitialDocument(tenantId, sessionId);
    }

    try {
      return this.loadAndValidateFile(canonicalPath, tenantId, sessionId, false);
    } catch (canonicalErr) {
      if (fs.existsSync(backupPath)) {
        try {
          return this.loadAndValidateFile(backupPath, tenantId, sessionId, true);
        } catch (backupErr) {
          throw new ExecutionPersistenceError(
            `Both canonical and backup session files corrupted for tenant "${tenantId}", session "${sessionId}"`,
            { canonicalError: String(canonicalErr), backupError: String(backupErr) }
          );
        }
      }
      throw canonicalErr;
    }
  }

  private loadAndValidateFile(
    filePath: string,
    expectedTenantId: string,
    expectedSessionId: string,
    isBackup: boolean
  ): GovernedExecutionSessionDocument {
    const content = fs.readFileSync(filePath, 'utf8');
    const doc = JSON.parse(content) as GovernedExecutionSessionDocument;

    ExecutionRequestValidator.assertNoPrototypePollution(doc);
    ExecutionRequestValidator.assertNoCoTArtifacts(doc);

    if (doc.tenantId !== expectedTenantId) {
      throw new ExecutionTenantIsolationError(expectedTenantId, doc.tenantId);
    }
    if (doc.sessionId !== expectedSessionId) {
      throw new ExecutionSessionIsolationError(expectedSessionId, doc.sessionId);
    }

    const expectedHash = computeExecutionSessionDocumentHash({
      schemaVersion: doc.schemaVersion,
      tenantId: doc.tenantId,
      sessionId: doc.sessionId,
      sessionVersion: doc.sessionVersion,
      activeLeases: doc.activeLeases,
      executionResults: doc.executionResults,
      updatedAt: doc.updatedAt,
    });

    if (doc.documentHash !== expectedHash) {
      throw new ExecutionPersistenceError(
        `Document provenance hash mismatch in ${isBackup ? 'backup' : 'canonical'} file "${filePath}"`
      );
    }

    return Object.freeze(doc);
  }

  public createInitialDocument(tenantId: string, sessionId: string): GovernedExecutionSessionDocument {
    const now = new Date().toISOString();
    const raw = {
      schemaVersion: GOVERNED_EXECUTION_SCHEMA_VERSION,
      tenantId,
      sessionId,
      sessionVersion: 1,
      activeLeases: [] as readonly ExecutionLease[],
      executionResults: [] as readonly GovernedExecutionResultEnvelope[],
      updatedAt: now,
    };
    const documentHash = computeExecutionSessionDocumentHash(raw);
    return Object.freeze({
      ...raw,
      documentHash,
    });
  }

  /**
   * EN: Atomically saves an execution session document with OCC version CAS validation.
   * VI: Lưu nguyên tử một tài liệu phiên thực thi với xác thực phiên bản OCC CAS.
   */
  public saveSessionDocument(
    doc: GovernedExecutionSessionDocument,
    expectedVersion: number
  ): GovernedExecutionSessionDocument {
    if (this.userStopProvider()) {
      throw new ExecutionUserStopError('save_session_document');
    }

    if (doc.sessionVersion !== expectedVersion) {
      throw new ExecutionConcurrencyError(expectedVersion, doc.sessionVersion, {
        tenantId: doc.tenantId,
        sessionId: doc.sessionId,
      });
    }

    ExecutionRequestValidator.assertNoPrototypePollution(doc);
    ExecutionRequestValidator.assertNoCoTArtifacts(doc);

    const sessionDir = this.getSessionDir(doc.tenantId, doc.sessionId);
    const canonicalPath = path.join(sessionDir, 'execution_session.json');
    const backupPath = path.join(sessionDir, 'execution_session.json.bak');
    const tempPath = path.join(sessionDir, `execution_session.tmp.${crypto.randomUUID()}`);

    const newVersion = doc.sessionVersion + 1;
    const now = new Date().toISOString();

    const rawToSave = {
      schemaVersion: GOVERNED_EXECUTION_SCHEMA_VERSION,
      tenantId: doc.tenantId,
      sessionId: doc.sessionId,
      sessionVersion: newVersion,
      activeLeases: doc.activeLeases,
      executionResults: doc.executionResults,
      updatedAt: now,
    };

    const documentHash = computeExecutionSessionDocumentHash(rawToSave);
    const updatedDoc: GovernedExecutionSessionDocument = Object.freeze({
      ...rawToSave,
      documentHash,
    });

    const serialized = JSON.stringify(updatedDoc, null, 2);

    // Atomic write protocol: .tmp -> .bak -> rename
    try {
      fs.writeFileSync(tempPath, serialized, 'utf8');

      // Verify temp file checksum
      const writtenHash = crypto.createHash('sha256').update(fs.readFileSync(tempPath)).digest('hex');
      const expectedMemHash = crypto.createHash('sha256').update(serialized).digest('hex');
      if (writtenHash !== expectedMemHash) {
        throw new ExecutionPersistenceError('Temp file checksum mismatch prior to atomic rename');
      }

      // Snapshot existing canonical to .bak if exists
      if (fs.existsSync(canonicalPath)) {
        fs.copyFileSync(canonicalPath, backupPath);
      }

      // Atomic rename
      fs.renameSync(tempPath, canonicalPath);
    } catch (err: any) {
      if (fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch {
          // Ignore temp cleanup errors
        }
      }
      throw new ExecutionPersistenceError(`Failed atomic persistence: ${err?.message || 'Unknown error'}`);
    }

    return updatedDoc;
  }
}
