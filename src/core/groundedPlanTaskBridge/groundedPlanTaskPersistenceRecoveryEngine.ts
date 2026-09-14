// src/core/groundedPlanTaskBridge/groundedPlanTaskPersistenceRecoveryEngine.ts
// BOWCON V4.0 — MS-1.5.08: GROUNDED PLAN TASK PERSISTENCE RECOVERY ENGINE
// Component 1056 — REAL
//
// EN: Multi-tenant partitioned crash-safe atomic persistence engine with .bak backup
//     recovery fallback, OCC session CAS validation, and SHA-256 provenance verification.
// VI: Động cơ lưu trữ và phục hồi nguyên tử chống sự cố đa bên thuê với dự phòng sao lưu .bak,
//     xác thực phiên OCC CAS và xác minh provenance SHA-256.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import {
  type GroundedPlanTaskBinding,
  type GroundedPlanTaskSessionDocument,
  GROUNDED_PLAN_TASK_SCHEMA_VERSION,
  GroundedPlanTaskUserStopError,
  GroundedPlanTaskConcurrencyError,
  GroundedPlanTaskProvenanceError,
  GroundedPlanTaskRecoveryError,
  computeTaskBindingSessionHash,
} from './groundedPlanTaskTypes.js';

export interface GroundedPlanTaskPersistenceOptions {
  readonly baseDirectory?: string;
  readonly userStopProvider?: () => boolean;
}

export class GroundedPlanTaskPersistenceRecoveryEngine {
  private readonly baseDirectory: string;
  private readonly userStopProvider: () => boolean;

  constructor(options?: GroundedPlanTaskPersistenceOptions) {
    this.baseDirectory = path.resolve(
      options?.baseDirectory ?? path.join(process.cwd(), 'data', 'partitions_grounded_plan_task')
    );
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Resolves the multi-tenant directory path for a session.
   * VI: Giải quyết đường dẫn thư mục đa bên thuê cho một phiên.
   */
  public getSessionDir(tenantId: string, sessionId: string): string {
    const partition = resolveUserPartition(tenantId, this.baseDirectory);
    return path.resolve(this.baseDirectory, partition.partitionKey, 'sessions', sessionId);
  }

  /**
   * EN: Saves a GroundedPlanTaskBinding to the tenant session document atomically.
   * VI: Lưu một GroundedPlanTaskBinding vào tài liệu phiên bên thuê một cách nguyên tử.
   */
  public saveBinding(
    binding: GroundedPlanTaskBinding,
    expectedVersion?: number
  ): GroundedPlanTaskSessionDocument {
    if (this.userStopProvider()) {
      throw new GroundedPlanTaskUserStopError('save_binding');
    }

    const sessionDir = this.getSessionDir(binding.tenantId, binding.sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });

    let existingDoc: GroundedPlanTaskSessionDocument | null = null;
    try {
      existingDoc = this.loadSessionDocument(binding.tenantId, binding.sessionId);
    } catch {
      existingDoc = null;
    }

    const currentVersion = existingDoc ? existingDoc.sessionVersion : 0;
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new GroundedPlanTaskConcurrencyError(expectedVersion, currentVersion, {
        tenantId: binding.tenantId,
        sessionId: binding.sessionId,
      });
    }

    const newVersion = currentVersion + 1;
    const existingBindings = existingDoc ? existingDoc.bindings.filter(b => b.bindingId !== binding.bindingId) : [];
    const updatedBindings = Object.freeze([...existingBindings, binding]);

    const partialDoc = {
      schemaVersion: GROUNDED_PLAN_TASK_SCHEMA_VERSION,
      tenantId: binding.tenantId,
      sessionId: binding.sessionId,
      sessionVersion: newVersion,
      bindings: updatedBindings,
      activeBindingId: binding.bindingId,
      updatedAt: new Date().toISOString(),
    };

    const documentHash = computeTaskBindingSessionHash(partialDoc);
    const newDoc: GroundedPlanTaskSessionDocument = Object.freeze({
      ...partialDoc,
      documentHash,
    });

    this.atomicWriteDocument(sessionDir, newDoc);
    return newDoc;
  }

  /**
   * EN: Loads and verifies session document from canonical disk or .bak fallback.
   * VI: Tải và xác minh tài liệu phiên từ đĩa chuẩn tắc hoặc dự phòng .bak.
   */
  public loadSessionDocument(tenantId: string, sessionId: string): GroundedPlanTaskSessionDocument {
    const sessionDir = this.getSessionDir(tenantId, sessionId);
    const canonicalPath = path.join(sessionDir, 'task_bindings.json');
    const backupPath = path.join(sessionDir, 'task_bindings.json.bak');

    if (!fs.existsSync(canonicalPath)) {
      if (fs.existsSync(backupPath)) {
        return this.recoverFromBackup(backupPath);
      }
      throw new GroundedPlanTaskRecoveryError(`Session document not found at: ${canonicalPath}`);
    }

    try {
      const content = fs.readFileSync(canonicalPath, 'utf8');
      const doc = JSON.parse(content) as GroundedPlanTaskSessionDocument;
      this.verifyDocumentIntegrity(doc);
      return Object.freeze(doc);
    } catch (err: unknown) {
      // Canonical corrupted -> attempt fallback to backup
      if (fs.existsSync(backupPath)) {
        return this.recoverFromBackup(backupPath);
      }
      throw new GroundedPlanTaskRecoveryError(
        `Canonical corrupted and no backup found: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * EN: Performs atomic write sequence: .tmp -> .bak snapshot -> rename.
   * VI: Thực hiện chuỗi ghi nguyên tử: .tmp -> chụp ảnh .bak -> đổi tên.
   */
  private atomicWriteDocument(sessionDir: string, doc: GroundedPlanTaskSessionDocument): void {
    if (this.userStopProvider()) {
      throw new GroundedPlanTaskUserStopError('atomic_write_document');
    }

    const canonicalPath = path.join(sessionDir, 'task_bindings.json');
    const backupPath = path.join(sessionDir, 'task_bindings.json.bak');
    const tmpId = crypto.randomBytes(6).toString('hex');
    const tmpPath = path.join(sessionDir, `task_bindings.json.tmp.${tmpId}`);

    const serialized = JSON.stringify(doc, null, 2);

    // 1. Write to temporary file
    fs.writeFileSync(tmpPath, serialized, 'utf8');

    // 2. Snapshot existing canonical file to .bak if exists
    if (fs.existsSync(canonicalPath)) {
      try {
        fs.copyFileSync(canonicalPath, backupPath);
      } catch {
        // Continue if snapshot fails
      }
    }

    // 3. Atomic rename
    fs.renameSync(tmpPath, canonicalPath);
  }

  /**
   * EN: Recovers session document from .bak backup snapshot.
   * VI: Phục hồi tài liệu phiên từ ảnh sao lưu .bak.
   */
  private recoverFromBackup(backupPath: string): GroundedPlanTaskSessionDocument {
    try {
      const content = fs.readFileSync(backupPath, 'utf8');
      const doc = JSON.parse(content) as GroundedPlanTaskSessionDocument;
      this.verifyDocumentIntegrity(doc);
      return Object.freeze(doc);
    } catch (err: unknown) {
      throw new GroundedPlanTaskRecoveryError(
        `Backup recovery failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  /**
   * EN: Verifies SHA-256 provenance checksum of a session document.
   * VI: Xác minh tổng kiểm provenance SHA-256 của tài liệu phiên.
   */
  private verifyDocumentIntegrity(doc: GroundedPlanTaskSessionDocument): void {
    const expectedHash = computeTaskBindingSessionHash({
      schemaVersion: doc.schemaVersion,
      tenantId: doc.tenantId,
      sessionId: doc.sessionId,
      sessionVersion: doc.sessionVersion,
      bindings: doc.bindings,
      activeBindingId: doc.activeBindingId,
      updatedAt: doc.updatedAt,
    });

    if (doc.documentHash !== expectedHash) {
      throw new GroundedPlanTaskProvenanceError(
        `Provenance hash mismatch on session document: expected "${expectedHash}", got "${doc.documentHash}"`
      );
    }
  }
}
