import { type EvidenceQueryFilter, type EvidenceQueryResult } from './policyEvidenceQueryTypes.js';
import { PolicyEvidenceCollector } from '../policyObservability/policyEvidenceCollector.js';
export declare const DEFAULT_QUERY_LIMIT = 50;
export declare const MAX_QUERY_LIMIT = 100;
export interface PolicyEvidenceQueryEngineOptions {
    readonly evidenceCollector?: PolicyEvidenceCollector;
    readonly isUserStopActive?: () => boolean;
    readonly defaultLimit?: number;
    readonly maxLimit?: number;
}
export declare class PolicyEvidenceQueryEngine {
    private readonly evidenceCollector;
    private readonly isUserStopActiveFn?;
    private readonly defaultLimit;
    private readonly maxLimit;
    constructor(options?: PolicyEvidenceQueryEngineOptions);
    /**
     * Generates a deterministic or uniquely prefixed query ID.
     * Tạo EvidenceQueryId có tiền tố duy nhất.
     */
    private generateQueryId;
    /**
     * Asserts USER_STOP is not active; fails closed if active.
     * Khẳng định USER_STOP không hoạt động; đóng an toàn nếu đang hoạt động.
     */
    private assertUserStopInactive;
    /**
     * Validates tenant partition using resolveUserPartition to prevent traversal, null bytes, and anonymous access.
     * Xác thực phân vùng người thuê sử dụng resolveUserPartition để ngăn chặn duyệt đường dẫn, byte null và truy cập ẩn danh.
     */
    private validateTenant;
    /**
     * Executes a bounded, deterministic read-only query for policy evidence records.
     * Thực thi truy vấn chỉ đọc có giới hạn, xác định cho các bản ghi bằng chứng chính sách.
     */
    queryEvidence(filter: EvidenceQueryFilter): EvidenceQueryResult;
    /**
     * Convenience query for records matching a specific correlation ID.
     * Truy vấn thuận tiện cho các bản ghi khớp với một ID tương quan cụ thể.
     */
    queryByCorrelationId(tenantPartition: string, correlationId: string, limit?: number): EvidenceQueryResult;
    /**
     * Convenience query for records matching a specific canary candidate.
     * Truy vấn thuận tiện cho các bản ghi khớp với một ứng viên canary cụ thể.
     */
    queryByCandidate(tenantPartition: string, candidateId: any, limit?: number): EvidenceQueryResult;
}
export declare const globalPolicyEvidenceQueryEngine: PolicyEvidenceQueryEngine;
