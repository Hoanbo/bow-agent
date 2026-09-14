// src/core/vision/visionPersistenceRecoveryEngine.ts
// BOWCON V4.0 — MS-1.5.06: VISION PERSISTENCE & RECOVERY ENGINE
// Component 1036 — REAL
//
// EN: Local-first, crash-safe atomic persistence, .bak snapshot recovery, OCC concurrency control,
//     and tenant isolation for visual session metadata (raw buffers remain ephemeral).
// VI: Lưu trữ cục bộ an toàn trước sự cố, phục hồi từ bản sao lưu .bak, kiểm soát đồng thời OCC,
//     và cô lập khách thuê cho siêu dữ liệu phiên thị giác (bộ đệm thô duy trì tạm thời).

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  type VisualSessionDocument,
  type VisualObservation,
  type VisualGroundingResult,
  type VisualSecurityAlert,
  VISION_SCHEMA_VERSION,
  computeSessionDocumentHash,
  VisionUserStopError,
  VisionConcurrencyError,
  CrossTenantVisionError,
  VisionIntegrityError,
  VisionValidationError,
} from './visionTypes.js';
import { VisionInputValidator } from './visionInputValidator.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface VisionPersistenceOptions {
  readonly baseDir?: string;
  readonly userStopProvider?: () => boolean;
}

export class VisionPersistenceRecoveryEngine {
  private readonly baseDir: string;
  private readonly userStopProvider: () => boolean;

  constructor(options?: VisionPersistenceOptions) {
    this.baseDir = options?.baseDir
      ? path.resolve(options.baseDir)
      : path.resolve(process.cwd(), 'data', 'partitions_vision');
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Resolves isolated directory for a specific tenant and session.
   * VI: Xác định thư mục cô lập cho một khách thuê và phiên cụ thể.
   */
  public getSessionDir(tenantId: string, sessionId: string): string {
    const partition = resolveUserPartition(tenantId.trim(), this.baseDir);
    const safeSessionId = this.sanitizeFileName(sessionId);
    const sessionDir = path.resolve(this.baseDir, partition.partitionKey, 'sessions', safeSessionId);
    if (!fs.existsSync(sessionDir)) {
      fs.mkdirSync(sessionDir, { recursive: true });
    }
    return sessionDir;
  }

  /**
   * EN: Creates a new VisualSessionDocument in initial state.
   * VI: Tạo tài liệu VisualSessionDocument mới ở trạng thái khởi tạo.
   */
  public createSessionDocument(
    tenantId: string,
    sessionId: string
  ): VisualSessionDocument {
    if (this.userStopProvider()) {
      throw new VisionUserStopError('create_vision_session');
    }

    if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new VisionValidationError('tenantId is required', ['invalid_tenantId']);
    }
    if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new VisionValidationError('sessionId is required', ['invalid_sessionId']);
    }

    const now = new Date().toISOString();
    const draft = {
      schemaVersion: VISION_SCHEMA_VERSION,
      sessionId: sessionId.trim(),
      tenantId: tenantId.trim(),
      sessionVersion: 1,
      observations: Object.freeze([]),
      groundingResults: Object.freeze([]),
      securityAlerts: Object.freeze([]),
      createdAt: now,
      updatedAt: now,
    };

    const provenanceHash = computeSessionDocumentHash(draft);
    const doc: VisualSessionDocument = Object.freeze({
      ...draft,
      provenanceHash,
    });

    VisionInputValidator.validateSessionDocument(doc);
    return doc;
  }

  /**
   * EN: Crash-safe atomic persistence: serialize -> write .tmp -> validate -> snapshot .bak -> atomic rename.
   * VI: Lưu trữ nguyên tử an toàn trước sự cố: tuần tự hóa -> ghi .tmp -> xác thực -> chụp .bak -> đổi tên nguyên tử.
   */
  public saveSessionDocument(
    doc: VisualSessionDocument,
    expectedVersion?: number,
    activeTenantId?: string
  ): void {
    if (this.userStopProvider()) {
      throw new VisionUserStopError('save_vision_session');
    }

    if (activeTenantId && doc.tenantId !== activeTenantId.trim()) {
      throw new CrossTenantVisionError(doc.tenantId, activeTenantId);
    }

    VisionInputValidator.validateSessionDocument(doc);

    const expectedHash = computeSessionDocumentHash(doc);
    if (doc.provenanceHash !== expectedHash) {
      throw new VisionIntegrityError(
        `Session document provenance mismatch: given '${doc.provenanceHash}', computed '${expectedHash}'`,
        { sessionId: doc.sessionId }
      );
    }

    const sessionDir = this.getSessionDir(doc.tenantId, doc.sessionId);
    const targetFile = path.resolve(sessionDir, 'session.json');
    const backupFile = path.resolve(sessionDir, 'session.json.bak');
    const tempFile = path.resolve(sessionDir, `session.tmp.${crypto.randomBytes(6).toString('hex')}`);

    // Optimistic Concurrency Control (OCC) check against existing file
    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        const existing = JSON.parse(raw) as VisualSessionDocument;
        if (expectedVersion !== undefined && existing.sessionVersion !== expectedVersion) {
          throw new VisionConcurrencyError(expectedVersion, existing.sessionVersion, {
            sessionId: doc.sessionId,
            targetFile,
          });
        }
      } catch (err) {
        if (err instanceof VisionConcurrencyError) throw err;
      }
    }

    const serialized = JSON.stringify(doc, null, 2);

    // 1. Write to temp file
    fs.writeFileSync(tempFile, serialized, 'utf8');

    // 2. Validate temp file integrity
    const readBack = fs.readFileSync(tempFile, 'utf8');
    if (readBack !== serialized) {
      try { fs.unlinkSync(tempFile); } catch { /* ignore */ }
      throw new VisionIntegrityError('Integrity validation failed on serialized temporary visual file');
    }

    // 3. Snapshot current valid state to .bak
    if (fs.existsSync(targetFile)) {
      try {
        fs.copyFileSync(targetFile, backupFile);
      } catch {
        // Non-blocking snapshot
      }
    }

    // 4. Atomic rename
    fs.renameSync(tempFile, targetFile);
  }

  /**
   * EN: Loads a visual session document from disk with SHA-256 provenance verification and .bak recovery.
   * VI: Tải tài liệu phiên thị giác từ đĩa với xác minh nguồn gốc SHA-256 và phục hồi từ .bak.
   */
  public loadSessionDocument(
    sessionId: string,
    tenantId: string
  ): VisualSessionDocument {
    if (this.userStopProvider()) {
      throw new VisionUserStopError('load_vision_session');
    }

    if (!tenantId || !tenantId.trim()) {
      throw new VisionValidationError('tenantId is required', ['invalid_tenantId']);
    }

    const sessionDir = this.getSessionDir(tenantId, sessionId);
    const targetFile = path.resolve(sessionDir, 'session.json');
    const backupFile = path.resolve(sessionDir, 'session.json.bak');

    if (!fs.existsSync(targetFile) && !fs.existsSync(backupFile)) {
      throw new VisionIntegrityError(`Visual session document not found for '${sessionId}' under tenant '${tenantId}'`);
    }

    // 1. Attempt primary load (Thử tải tệp chính)
    if (fs.existsSync(targetFile)) {
      try {
        const raw = fs.readFileSync(targetFile, 'utf8');
        const parsed = JSON.parse(raw) as VisualSessionDocument;

        if (parsed.tenantId !== tenantId.trim()) {
          throw new CrossTenantVisionError(parsed.tenantId, tenantId);
        }

        VisionInputValidator.validateSessionDocument(parsed);
        const computed = computeSessionDocumentHash(parsed);
        if (parsed.provenanceHash !== computed) {
          throw new VisionIntegrityError('Primary visual session document provenance mismatch');
        }

        return Object.freeze({
          ...parsed,
          recoveredFromBackup: false,
        });
      } catch (err) {
        if (err instanceof CrossTenantVisionError) throw err;
        // Primary file corrupt, proceed to backup
      }
    }

    // 2. Attempt backup recovery (Thử phục hồi từ bản sao lưu .bak)
    if (fs.existsSync(backupFile)) {
      try {
        const rawBak = fs.readFileSync(backupFile, 'utf8');
        const parsedBak = JSON.parse(rawBak) as VisualSessionDocument;

        if (parsedBak.tenantId !== tenantId.trim()) {
          throw new CrossTenantVisionError(parsedBak.tenantId, tenantId);
        }

        VisionInputValidator.validateSessionDocument(parsedBak);
        const computed = computeSessionDocumentHash(parsedBak);
        if (parsedBak.provenanceHash !== computed) {
          throw new VisionIntegrityError('Backup visual session document provenance mismatch');
        }

        const recovered: VisualSessionDocument = Object.freeze({
          ...parsedBak,
          recoveredFromBackup: true,
        });

        // Restore backup file to primary atomically
        try {
          fs.copyFileSync(backupFile, targetFile);
        } catch {
          // ignore
        }

        return recovered;
      } catch (err) {
        if (err instanceof CrossTenantVisionError) throw err;
        throw new VisionIntegrityError(`Both primary and backup documents corrupted for session '${sessionId}'`);
      }
    }

    throw new VisionIntegrityError(`Failed to load or recover visual session '${sessionId}'`);
  }

  /**
   * EN: Deletes session partition files for cleanup.
   * VI: Xóa các tệp phân vùng phiên để dọn dẹp.
   */
  public deleteSessionDocument(sessionId: string, tenantId: string): void {
    if (this.userStopProvider()) {
      throw new VisionUserStopError('delete_vision_session');
    }

    const sessionDir = this.getSessionDir(tenantId, sessionId);
    const targetFile = path.resolve(sessionDir, 'session.json');
    const backupFile = path.resolve(sessionDir, 'session.json.bak');

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

export const globalVisionPersistenceRecoveryEngine = new VisionPersistenceRecoveryEngine();
