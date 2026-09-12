// src/core/policyEvidence/policyEvidenceQueryEngine.ts
// BOWCON V4.0 — MS-1.3.63: GOVERNED POLICY EVIDENCE QUERY,
// AUDIT CORRELATION & INTEGRITY VERIFICATION LAYER
//
// Governed Policy Evidence Query Engine (Component 723).
// Read-only query execution engine with deterministic pagination, strict tenant isolation,
// bounded query limits, and fail-closed security.
// Zero autonomous authority. Zero mutation.
//
// Động cơ truy vấn bằng chứng chính sách có quản trị (Thành phần 723).
// Động cơ thực thi truy vấn chỉ đọc với phân trang xác định, cô lập người thuê nghiêm ngặt,
// giới hạn truy vấn có cận và bảo mật đóng an toàn.
// Không có thẩm quyền tự động. Không có đột biến.
//
// Authority Invariants:
// - Level 0 Read-Only Query Engine
// - QUERY != MUTATION
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE
// - ZERO_AUTONOMOUS_APPROVAL
// - ZERO_AUTONOMOUS_PROMOTION
// - ZERO_AUTONOMOUS_ROLLBACK
// - USER_STOP > ALL_QUERY_OPERATIONS
// - STRICT_TENANT_ISOLATION: All queries validated through resolveUserPartition
// - FAIL_CLOSED: Anonymous or unauthorized queries fail closed

import crypto from 'node:crypto';
import path from 'node:path';
import {
  type EvidenceQueryId,
  type EvidenceQueryFilter,
  type EvidenceQueryResult,
  createEvidenceQueryId,
} from './policyEvidenceQueryTypes.js';
import type { PolicyEvidenceRecord } from '../policyObservability/policyObservabilityTypes.js';
import { PolicyEvidenceCollector, globalPolicyEvidenceCollector } from '../policyObservability/policyEvidenceCollector.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export const DEFAULT_QUERY_LIMIT = 50;
export const MAX_QUERY_LIMIT = 100;

export interface PolicyEvidenceQueryEngineOptions {
  readonly evidenceCollector?: PolicyEvidenceCollector;
  readonly isUserStopActive?: () => boolean;
  readonly defaultLimit?: number;
  readonly maxLimit?: number;
}

export class PolicyEvidenceQueryEngine {
  private readonly evidenceCollector: PolicyEvidenceCollector;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly defaultLimit: number;
  private readonly maxLimit: number;

  constructor(options?: PolicyEvidenceQueryEngineOptions) {
    this.evidenceCollector = options?.evidenceCollector ?? globalPolicyEvidenceCollector;
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.defaultLimit = options?.defaultLimit ?? DEFAULT_QUERY_LIMIT;
    this.maxLimit = options?.maxLimit ?? MAX_QUERY_LIMIT;
  }

  /**
   * Generates a deterministic or uniquely prefixed query ID.
   * Tạo EvidenceQueryId có tiền tố duy nhất.
   */
  private generateQueryId(): EvidenceQueryId {
    return createEvidenceQueryId(`eqry_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`);
  }

  /**
   * Asserts USER_STOP is not active; fails closed if active.
   * Khẳng định USER_STOP không hoạt động; đóng an toàn nếu đang hoạt động.
   */
  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Policy evidence queries suspended by USER_STOP supremacy');
    }
  }

  /**
   * Validates tenant partition using resolveUserPartition to prevent traversal, null bytes, and anonymous access.
   * Xác thực phân vùng người thuê sử dụng resolveUserPartition để ngăn chặn duyệt đường dẫn, byte null và truy cập ẩn danh.
   */
  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('EVIDENCE_QUERY_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    // Confine tenant partition via resolveUserPartition validation / Giới hạn qua resolveUserPartition
    resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
  }

  /**
   * Executes a bounded, deterministic read-only query for policy evidence records.
   * Thực thi truy vấn chỉ đọc có giới hạn, xác định cho các bản ghi bằng chứng chính sách.
   */
  public queryEvidence(filter: EvidenceQueryFilter): EvidenceQueryResult {
    // 1. Fail-closed on USER_STOP / Đóng an toàn khi USER_STOP
    this.assertUserStopInactive();

    // 2. Enforce strict tenant isolation / Thực thi cô lập người thuê nghiêm ngặt
    this.validateTenant(filter.tenantPartition);

    // 3. Validate pagination parameters / Xác thực tham số phân trang
    const offset = filter.offset ?? 0;
    if (offset < 0 || !Number.isFinite(offset) || !Number.isInteger(offset)) {
      throw new Error(`INVALID_QUERY_PAGINATION: offset must be a non-negative integer (got ${offset})`);
    }

    const requestedLimit = filter.limit ?? this.defaultLimit;
    if (requestedLimit <= 0 || !Number.isFinite(requestedLimit) || !Number.isInteger(requestedLimit)) {
      throw new Error(`INVALID_QUERY_PAGINATION: limit must be a positive integer (got ${requestedLimit})`);
    }
    if (requestedLimit > this.maxLimit) {
      throw new Error(`QUERY_LIMIT_EXCEEDED: Requested limit ${requestedLimit} exceeds maximum allowed of ${this.maxLimit}`);
    }

    const queryId = filter.queryId ?? this.generateQueryId();

    // 4. Retrieve all tenant records from the collector / Lấy tất cả bản ghi người thuê từ bộ thu thập
    const allTenantRecords = this.evidenceCollector.getAll(filter.tenantPartition);

    // 5. Apply deterministic filters / Áp dụng các bộ lọc xác định
    let matches = [...allTenantRecords];

    if (filter.candidateId) {
      matches = matches.filter(r => 'candidateId' in r && r.candidateId === filter.candidateId);
    }

    if (filter.candidatePolicyVersion) {
      matches = matches.filter(r => {
        if ('candidatePolicyVersion' in r && r.candidatePolicyVersion) {
          return r.candidatePolicyVersion === filter.candidatePolicyVersion;
        }
        return false;
      });
    }

    if (filter.eventTypes && filter.eventTypes.length > 0) {
      const typeSet = new Set<string>(filter.eventTypes);
      matches = matches.filter(r => typeSet.has(r.eventType));
    }

    if (filter.rings && filter.rings.length > 0) {
      const ringSet = new Set<string>(filter.rings);
      matches = matches.filter(r => {
        if ('currentRing' in r && r.currentRing) {
          return ringSet.has(r.currentRing);
        }
        if ('rolledBackRing' in r && r.rolledBackRing) {
          return ringSet.has(r.rolledBackRing);
        }
        if ('targetRing' in r && r.targetRing) {
          return ringSet.has(r.targetRing);
        }
        return false;
      });
    }

    if (filter.correlationId) {
      matches = matches.filter(r => 'correlationId' in r && r.correlationId === filter.correlationId);
    }

    if (filter.fromTimestamp) {
      matches = matches.filter(r => r.timestamp >= filter.fromTimestamp!);
    }

    if (filter.toTimestamp) {
      matches = matches.filter(r => r.timestamp <= filter.toTimestamp!);
    }

    // 6. Deterministic sort: chronological timestamp ASC, then evidenceId ASC
    // Sắp xếp xác định: mốc thời gian tăng dần, sau đó là evidenceId tăng dần
    matches.sort((a, b) => {
      const timeCmp = a.timestamp.localeCompare(b.timestamp);
      if (timeCmp !== 0) return timeCmp;
      return a.evidenceId.localeCompare(b.evidenceId);
    });

    const totalMatches = matches.length;
    const paginatedSlice = matches.slice(offset, offset + requestedLimit);
    const hasMore = offset + requestedLimit < totalMatches;

    return Object.freeze({
      queryId,
      tenantPartition: filter.tenantPartition,
      totalMatches,
      returnedCount: paginatedSlice.length,
      offset,
      limit: requestedLimit,
      hasMore,
      records: Object.freeze(paginatedSlice),
      queriedAt: new Date().toISOString(),
    });
  }

  /**
   * Convenience query for records matching a specific correlation ID.
   * Truy vấn thuận tiện cho các bản ghi khớp với một ID tương quan cụ thể.
   */
  public queryByCorrelationId(
    tenantPartition: string,
    correlationId: string,
    limit?: number
  ): EvidenceQueryResult {
    return this.queryEvidence({
      tenantPartition,
      correlationId,
      limit: limit ?? this.defaultLimit,
    });
  }

  /**
   * Convenience query for records matching a specific canary candidate.
   * Truy vấn thuận tiện cho các bản ghi khớp với một ứng viên canary cụ thể.
   */
  public queryByCandidate(
    tenantPartition: string,
    candidateId: any,
    limit?: number
  ): EvidenceQueryResult {
    return this.queryEvidence({
      tenantPartition,
      candidateId,
      limit: limit ?? this.defaultLimit,
    });
  }
}

export const globalPolicyEvidenceQueryEngine = new PolicyEvidenceQueryEngine();
