// src/core/commit/commitTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.15: COMMIT & STATE CONSISTENCY TYPES
//
// EN:
// Authoritative type definitions for the Durable Commit & State Consistency Engine.
// Establishes immutable contracts for commit plans, pre/post snapshots, consistency validation, and rollback metadata.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền cho Động cơ Commit Bền vững & Tính Nhất quán Trạng thái.
// Thiết lập các hợp đồng bất biến cho kế hoạch commit, snapshot trước/sau, kiểm tra nhất quán và metadata rollback.

import type { PlanRiskLevel } from '../planning/planningTypes.js';

/**
 * EN: Explicit commit status classification.
 * VI: Phân loại trạng thái commit tường minh.
 */
export type CommitStatus =
  | 'COMMITTED'
  | 'ALREADY_COMMITTED'
  | 'REJECTED'
  | 'FAILED'
  | 'ROLLBACK_REQUIRED'
  | 'ROLLED_BACK'
  | 'INCONSISTENT'
  | 'UNKNOWN';

/**
 * EN: Deterministic failure categories for commit breakdowns.
 * VI: Các danh mục lỗi tất định cho các trường hợp thất bại commit.
 */
export type CommitFailureCategory =
  | 'COMMIT_VALIDATION_FAILURE'
  | 'COMMIT_AUTHORIZATION_FAILURE'
  | 'COMMIT_CONFLICT'
  | 'COMMIT_PERSISTENCE_FAILURE'
  | 'COMMIT_CONSISTENCY_FAILURE'
  | 'COMMIT_PARTIAL_FAILURE'
  | 'COMMIT_REPLAY'
  | 'COMMIT_SCOPE_FAILURE'
  | 'COMMIT_INTEGRITY_FAILURE'
  | 'COMMIT_UNKNOWN_FAILURE';

/**
 * EN: Authoritative consistency issue classifications.
 * VI: Các phân loại vấn đề nhất quán có thẩm quyền.
 */
export type ConsistencyIssueType =
  | 'STATE_MATCH'
  | 'EXPECTED_STATE_MISSING'
  | 'UNEXPECTED_STATE_CHANGE'
  | 'SEQUENCE_MISMATCH'
  | 'IDENTITY_MISMATCH'
  | 'VERIFICATION_MISMATCH'
  | 'COMMIT_FINGERPRINT_MISMATCH'
  | 'USER_SCOPE_MISMATCH'
  | 'SESSION_SCOPE_MISMATCH'
  | 'GOVERNANCE_MISMATCH'
  | 'RISK_MISMATCH'
  | 'APPROVAL_METADATA_MISMATCH'
  | 'PARTIAL_COMMIT'
  | 'UNKNOWN_COMMIT_STATE';

/**
 * EN: Types of atomic state mutation operations performed during commit.
 * VI: Các loại thao tác đột biến trạng thái nguyên tử được thực hiện khi commit.
 */
export type CommitOperationType =
  | 'SESSION_TURN_APPEND'
  | 'DURABLE_RULE_RECORD'
  | 'DURABLE_HABIT_RECORD'
  | 'STATE_SNAPSHOT_COMMIT'
  | 'GENERIC_MUTATION';

/**
 * EN: Individual atomic operation within a commit plan.
 * VI: Thao tác nguyên tử đơn lẻ trong kế hoạch commit.
 */
export interface CommitOperation {
  readonly operationId: string;
  readonly type: CommitOperationType;
  readonly targetDomain: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly applied?: boolean;
}

/**
 * EN: Immutable snapshot of state captured immediately before commit execution.
 * VI: Ảnh chụp bất biến của trạng thái được ghi lại ngay trước khi thực thi commit.
 */
export interface PreCommitSnapshot {
  readonly snapshotId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly currentState: string;
  readonly sequence: number;
  readonly correlationId?: string;
  readonly decisionId?: string;
  readonly executionId?: string;
  readonly verificationId: string;
  readonly verificationFingerprint: string;
  readonly stateFingerprint: string;
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

/**
 * EN: Immutable snapshot of state captured immediately after commit execution.
 * VI: Ảnh chụp bất biến của trạng thái được ghi lại ngay sau khi hoàn tất commit.
 */
export interface PostCommitSnapshot {
  readonly snapshotId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly committedState: string;
  readonly sequence: number;
  readonly commitId: string;
  readonly commitFingerprint: string;
  readonly appliedOperations: readonly string[];
  readonly metadata: Readonly<Record<string, unknown>>;
  readonly committedAt: string;
}

/**
 * EN: Prepared, immutable commit plan detailing atomic operations and pre-state.
 * VI: Kế hoạch commit đã chuẩn bị, bất biến, chi tiết hóa các thao tác nguyên tử và trạng thái trước.
 */
export interface CommitPlan {
  readonly planId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly verificationId: string;
  readonly operations: readonly CommitOperation[];
  readonly riskLevel: PlanRiskLevel;
  readonly governanceRequired: boolean;
  readonly approvalRequired: boolean;
  readonly preCommitSnapshot: PreCommitSnapshot;
  readonly fingerprint: string;
}

/**
 * EN: Outcome of state consistency evaluation comparing pre-commit and post-commit state.
 * VI: Kết quả đánh giá tính nhất quán trạng thái so sánh trạng thái trước commit và sau commit.
 */
export interface ConsistencyValidationResult {
  readonly consistent: boolean;
  readonly issues: readonly ConsistencyIssueType[];
  readonly details: readonly string[];
  readonly fingerprint: string;
}

/**
 * EN: Secret-scrubbed, structured commit failure descriptor.
 * VI: Bộ mô tả lỗi commit có cấu trúc, đã được tẩy sạch bí mật.
 */
export interface CommitFailure {
  readonly category: CommitFailureCategory;
  readonly message: string;
  readonly recoverable: boolean;
  readonly fingerprint: string;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * EN: Descriptive rollback metadata specifying recovery context.
 * VI: Metadata rollback mang tính mô tả chỉ rõ ngữ cảnh phục hồi.
 */
export interface RollbackMetadata {
  readonly rollbackId: string;
  readonly commitId: string;
  readonly verificationId: string;
  readonly affectedState: string;
  readonly reason: string;
  readonly eligible: boolean;
  readonly status: 'ROLLBACK_PENDING' | 'ROLLED_BACK' | 'NOT_ELIGIBLE';
  readonly fingerprint: string;
  readonly createdAt: string;
}

/**
 * EN: Authoritative request submitted to CommitService.
 * VI: Yêu cầu có thẩm quyền gửi tới CommitService.
 */
export interface CommitRequest {
  readonly requestId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly verificationResult: {
    readonly verificationId: string;
    readonly status: string;
    readonly taskSucceeded: boolean;
    readonly riskLevel?: PlanRiskLevel;
    readonly fingerprint?: string;
  };
  readonly operations: readonly CommitOperation[];
  readonly sequence?: number;
  readonly correlationId?: string;
  readonly decisionId?: string;
  readonly executionId?: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly timestamp?: string;
}

/**
 * EN: Comprehensive, deeply immutable outcome of the commit process.
 * VI: Kết quả toàn diện, bất biến sâu của quy trình commit.
 */
export interface CommitResult {
  readonly commitId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly status: CommitStatus;
  readonly isReplay: boolean;
  readonly plan: CommitPlan;
  readonly postCommitSnapshot?: PostCommitSnapshot;
  readonly consistency: ConsistencyValidationResult;
  readonly failure?: CommitFailure;
  readonly rollback?: RollbackMetadata;
  readonly fingerprint: string;
  readonly committedAt?: string;
}
