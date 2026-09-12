// src/core/crossIncident/incidentHistoryArchiveStore.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Durable, tenant-partitioned historical incident archive store.
// Encapsulates crash-safe atomic persistence via DurableJsonStore and strict isolation via UserPartitionResolver.
// Enforces secret sanitization via DiagnosisSanitizer, deterministic idempotency, and bounded query safety.
// Kho lưu trữ sự cố lịch sử bền vững, được phân vùng theo người thuê.
// Đóng gói lưu trữ nguyên tử an toàn lỗi qua DurableJsonStore và cô lập nghiêm ngặt qua UserPartitionResolver.
// Thực thi làm sạch bí mật qua DiagnosisSanitizer, tính lũy thừa xác định và truy vấn an toàn có giới hạn.

import path from 'node:path';
import crypto from 'node:crypto';
import { DurableJsonStore, type ValidationResult } from '../persistence/durableJsonStore.js';
import { resolveUserPartition, DEFAULT_PRIMARY_USER_ID } from '../persistence/userPartitionResolver.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import {
  type ArchivedIncidentRecord,
  type IncidentArchiveQueryFilter,
  type IncidentArchiveQueryResult,
  type IncidentArchiveId,
  createIncidentArchiveId,
} from './crossIncidentTypes.js';
import type { RemediationActionClass } from '../remediation/remediationTypes.js';
import type { IncidentId } from '../diagnosis/diagnosisTypes.js';
import type {
  PostMortemReport,
  IncidentClosureRecord,
  RemediationEffectivenessMetrics,
} from '../incidentResilience/incidentResilienceTypes.js';

export interface IngestIncidentInput {
  readonly incidentId: IncidentId;
  readonly postMortemReport: PostMortemReport;
  readonly closureRecord: IncidentClosureRecord;
  readonly effectivenessMetrics: RemediationEffectivenessMetrics;
  readonly targetId: string;
  readonly failureCategory: string;
  readonly actionClass: RemediationActionClass;
  readonly userId?: string;
}

/**
 * Runtime schema validator for archived incident records.
 * Hàm xác thực lược đồ thời gian chạy cho các bản ghi sự cố đã lưu trữ.
 */
function validateArchivedIncidentRecords(data: unknown): ValidationResult<ArchivedIncidentRecord[]> {
  if (!Array.isArray(data)) {
    return { success: false, errors: ['Expected array of ArchivedIncidentRecord'] };
  }
  const isValid = data.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof (item as ArchivedIncidentRecord).archiveId === 'string' &&
      typeof (item as ArchivedIncidentRecord).incidentId === 'string' &&
      typeof (item as ArchivedIncidentRecord).deterministicIngestionId === 'string' &&
      typeof (item as ArchivedIncidentRecord).closureCertificateHash === 'string' &&
      typeof (item as ArchivedIncidentRecord).postMortemSha256 === 'string' &&
      typeof (item as ArchivedIncidentRecord).ingestedAt === 'number'
  );
  if (!isValid) {
    return { success: false, errors: ['Invalid item in ArchivedIncidentRecord array'] };
  }
  return { success: true, data: data as ArchivedIncidentRecord[] };
}

export class IncidentHistoryArchiveStore {
  private readonly baseDir: string;
  private readonly sanitizer: DiagnosisSanitizer;
  // In-memory partitioned stores cache: partitionKey -> DurableJsonStore<ArchivedIncidentRecord[]>
  private readonly stores = new Map<string, DurableJsonStore<ArchivedIncidentRecord[]>>();

  constructor(options?: {
    readonly baseDir?: string;
    readonly sanitizer?: DiagnosisSanitizer;
  }) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'incident-archive'));
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
  }

  /**
   * Resolves the isolated DurableJsonStore for the authenticated user partition.
   * Never bypasses UserPartitionResolver.
   * Giải quyết DurableJsonStore cô lập cho phân vùng người dùng đã xác thực.
   * Tuyệt đối không bỏ qua UserPartitionResolver.
   */
  private getStore(userId?: string): { store: DurableJsonStore<ArchivedIncidentRecord[]>; partitionKey: string } {
    const effectiveUserId = userId ?? DEFAULT_PRIMARY_USER_ID;
    const partition = resolveUserPartition(effectiveUserId, this.baseDir);

    let store = this.stores.get(partition.partitionKey);
    if (!store) {
      const partitionDir = path.resolve(this.baseDir, partition.partitionKey);
      const incidentsFilePath = path.resolve(partitionDir, 'incidents.json');

      store = new DurableJsonStore<ArchivedIncidentRecord[]>({
        filePath: incidentsFilePath,
        validator: validateArchivedIncidentRecords,
        defaultFactory: () => [],
        allowedBaseDir: this.baseDir,
        quarantineCorrupted: true,
      });
      this.stores.set(partition.partitionKey, store);
    }

    return { store, partitionKey: partition.partitionKey };
  }

  /**
   * Computes the deterministic ingestion identity:
   * incidentId + closureCertificateHash + postMortemSha256.
   * Tính toán định danh nhập liệu xác định: incidentId + closureCertificateHash + postMortemSha256.
   */
  public computeIngestionIdentity(
    incidentId: string,
    closureCertificateHash: string,
    postMortemSha256: string
  ): string {
    return crypto
      .createHash('sha256')
      .update(`${incidentId}::${closureCertificateHash}::${postMortemSha256}`)
      .digest('hex');
  }

  /**
   * Archives a closed incident record idempotently with secret sanitization.
   * Fails closed if incident artifacts are incomplete or invalid.
   * Lưu trữ một bản ghi sự cố đã đóng có tính lũy thừa và làm sạch bí mật.
   * Đóng khi thất bại nếu các hiện vật sự cố không hoàn chỉnh hoặc không hợp lệ.
   */
  public archiveIncident(input: IngestIncidentInput): ArchivedIncidentRecord {
    // 1. Fail closed validation
    if (!input.incidentId || typeof input.incidentId !== 'string') {
      throw new Error('ARCHIVE_VALIDATION_FAILED: incidentId must be a non-empty string');
    }
    if (!input.closureRecord || !input.closureRecord.closureCertificateHash) {
      throw new Error('ARCHIVE_VALIDATION_FAILED: Missing valid closureRecord with closureCertificateHash');
    }
    if (!input.postMortemReport || !input.postMortemReport.postMortemSha256) {
      throw new Error('ARCHIVE_VALIDATION_FAILED: Missing valid postMortemReport with postMortemSha256');
    }
    if (!input.effectivenessMetrics) {
      throw new Error('ARCHIVE_VALIDATION_FAILED: Missing effectivenessMetrics');
    }
    if (!input.targetId) {
      throw new Error('ARCHIVE_VALIDATION_FAILED: targetId must be specified');
    }
    if (!input.failureCategory) {
      throw new Error('ARCHIVE_VALIDATION_FAILED: failureCategory must be specified');
    }
    if (!input.actionClass) {
      throw new Error('ARCHIVE_VALIDATION_FAILED: actionClass must be specified');
    }

    const { store, partitionKey } = this.getStore(input.userId);

    // 2. Check deterministic ingestion identity for idempotency
    const deterministicId = this.computeIngestionIdentity(
      input.incidentId,
      input.closureRecord.closureCertificateHash,
      input.postMortemReport.postMortemSha256
    );

    const existingRecords = store.read();
    const existing = existingRecords.find((r) => r.deterministicIngestionId === deterministicId);
    if (existing) {
      // Return existing record idempotently without duplicate write
      return existing;
    }

    // 3. Apply DiagnosisSanitizer before disk persistence
    const sanitizedPostMortem = this.sanitizer.sanitize(input.postMortemReport) as PostMortemReport;
    const sanitizedClosure = this.sanitizer.sanitize(input.closureRecord) as IncidentClosureRecord;
    const sanitizedMetrics = this.sanitizer.sanitize(input.effectivenessMetrics) as RemediationEffectivenessMetrics;

    const archiveId = createIncidentArchiveId(`arc_${Date.now()}_${deterministicId.slice(0, 8)}`);

    const newRecord: ArchivedIncidentRecord = {
      archiveId,
      incidentId: input.incidentId,
      deterministicIngestionId: deterministicId,
      userPartition: partitionKey,
      targetId: input.targetId,
      failureCategory: input.failureCategory,
      actionClass: input.actionClass,
      postMortemReport: Object.freeze(sanitizedPostMortem),
      closureRecord: Object.freeze(sanitizedClosure),
      effectivenessMetrics: Object.freeze(sanitizedMetrics),
      closureCertificateHash: input.closureRecord.closureCertificateHash,
      postMortemSha256: input.postMortemReport.postMortemSha256,
      ingestedAt: Date.now(),
    };

    // 4. Atomic append to durable store
    const updatedRecords = [...existingRecords, Object.freeze(newRecord)];
    store.write(updatedRecords);

    return newRecord;
  }

  /**
   * Exact lookup of an archived incident by its incidentId.
   * Tra cứu chính xác một sự cố đã lưu trữ theo incidentId của nó.
   */
  public getIncidentById(incidentId: IncidentId | string, userId?: string): ArchivedIncidentRecord | null {
    if (!incidentId || typeof incidentId !== 'string') return null;
    const { store } = this.getStore(userId);
    const records = store.read();
    return records.find((r) => r.incidentId === incidentId) ?? null;
  }

  /**
   * Bounded query with cursor pagination.
   * Unbounded queries (e.g. getAllArchivedIncidents) are strictly prohibited.
   * Truy vấn có giới hạn với phân trang theo con trỏ cursor.
   * Tuyệt đối cấm các truy vấn không giới hạn.
   */
  public queryIncidents(
    filter: IncidentArchiveQueryFilter,
    userId?: string
  ): IncidentArchiveQueryResult {
    const { store } = this.getStore(userId);
    const allRecords = store.read();

    // Apply filtering
    let matched = allRecords.filter((record) => {
      if (filter.targetId && record.targetId !== filter.targetId) return false;
      if (filter.category && record.failureCategory !== filter.category) return false;
      if (filter.actionClass && record.actionClass !== filter.actionClass) return false;
      if (filter.timeWindow) {
        if (record.ingestedAt < filter.timeWindow.startMs || record.ingestedAt > filter.timeWindow.endMs) {
          return false;
        }
      }
      return true;
    });

    const totalMatching = matched.length;

    // Enforce bounded pagination limits: default 50, maximum 200
    const rawLimit = filter.limit ?? 50;
    const limit = Math.max(1, Math.min(rawLimit, 200));

    // Handle cursor (encoded as offset index)
    let startIndex = 0;
    if (filter.cursor) {
      try {
        const decoded = Buffer.from(filter.cursor, 'base64').toString('utf8');
        const parsed = parseInt(decoded, 10);
        if (!isNaN(parsed) && parsed >= 0) {
          startIndex = parsed;
        }
      } catch {
        startIndex = 0;
      }
    }

    const pagedSlice = matched.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + pagedSlice.length;
    const isTruncated = nextIndex < totalMatching;
    const nextCursor = isTruncated ? Buffer.from(String(nextIndex), 'utf8').toString('base64') : undefined;

    return {
      records: Object.freeze(pagedSlice),
      nextCursor,
      totalMatching,
      isTruncated,
    };
  }
}
