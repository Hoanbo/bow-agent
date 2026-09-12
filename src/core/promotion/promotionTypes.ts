// src/core/promotion/promotionTypes.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Canonical type contracts, schemas, and state machine for governed change promotion.
// Hợp đồng định kiểu chuẩn tắc, lược đồ và máy trạng thái cho việc xúc tiến thay đổi có quản trị.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - TASK != AUTHORITY
// - SANDBOX != AUTHORITY
// - WORKTREE != AUTHORITY
// - DIFF != AUTHORIZATION
// - VALIDATION != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - VERIFICATION != AUTHORIZATION
// - PROMOTION_PROPOSAL != PROMOTION_AUTHORIZATION
// - PROMOTION != OWNER_APPROVAL
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - AGENT_COUNT != AUTHORITY_COUNT
// - CAPABILITY != AUTHORIZATION
// - DELEGATION != EXECUTION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import type {
  SandboxId,
  WorktreeId,
  SandboxManifest,
  SandboxDiff,
  SandboxChange,
} from '../sandbox/sandboxTypes.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

export const PROMOTION_SCHEMA_VERSION = '4.0.0' as const;

/**
 * Branded identifier for a promotion proposal.
 * Định danh thương hiệu cho một đề xuất xúc tiến.
 */
export type PromotionId = string & { readonly __brand: unique symbol };

/**
 * Factory helper to create a branded PromotionId.
 * Hàm trợ giúp tạo một PromotionId có thương hiệu.
 */
export function createPromotionId(id: string): PromotionId {
  return id as PromotionId;
}

/**
 * Lifecycle states of a promotion lifecycle.
 * Các trạng thái vòng đời của quy trình xúc tiến.
 */
export type PromotionState =
  | 'DRAFT'
  | 'PROPOSED'
  | 'VALIDATING'
  | 'VALIDATED'
  | 'REVIEW_PENDING'
  | 'APPROVAL_PENDING'
  | 'APPROVED'
  | 'PROMOTING'
  | 'PROMOTED'
  | 'REJECTED'
  | 'BLOCKED'
  | 'CONFLICTED'
  | 'STALE'
  | 'ROLLED_BACK'
  | 'REVOKED'
  | 'EXPIRED'
  | 'FAILED'
  | 'CANCELLED';

/**
 * Permitted conflict types detected during promotion validation.
 * Các loại xung đột được phát hiện trong quá trình xác thực xúc tiến.
 */
export type PromotionConflictType =
  | 'TARGET_MODIFIED_CONCURRENTLY'
  | 'BASE_HASH_MISMATCH'
  | 'FILE_CONTENT_COLLISION'
  | 'DELETED_FILE_MODIFIED_IN_TARGET'
  | 'RENAMED_FILE_MISSING_IN_TARGET'
  | 'OVERLAPPING_PROMOTION_ACTIVE'
  | 'STALE_SOURCE_DIFF';

/**
 * Structure of a detected promotion conflict.
 * Cấu trúc của một xung đột xúc tiến được phát hiện.
 */
export interface PromotionConflict {
  readonly conflictId: string;
  readonly type: PromotionConflictType;
  readonly relativePath: string;
  readonly details: string;
  readonly expectedHash?: string;
  readonly actualHash?: string;
  readonly detectedAt: number;
}

/**
 * Scope constraints governing promotion target and boundaries.
 * Các ràng buộc phạm vi quản trị mục tiêu và ranh giới xúc tiến.
 */
export interface PromotionScope {
  readonly allowedTargetRoots: readonly string[];
  readonly targetProjectRoot: string;
  readonly maxFileChanges?: number;
  readonly maxPromotionSizeBytes?: number;
  readonly allowedFileExtensions?: readonly string[];
  readonly deniedFilePatterns?: readonly string[];
}

/**
 * Target project descriptor for promotion.
 * Bộ mô tả dự án mục tiêu để xúc tiến.
 */
export interface PromotionTarget {
  readonly projectRoot: string;
  readonly baseManifestHash: string;
  readonly currentManifestHash: string;
  readonly isClean: boolean;
}

/**
 * Complete provenance record linking proposal to its originating lineage.
 * Bản ghi nguồn gốc hoàn chỉnh liên kết đề xuất với nguồn gốc phát sinh.
 */
export interface PromotionProvenance {
  readonly taskId: string;
  readonly agentId: string;
  readonly deviceId: string;
  readonly sessionId: string;
  readonly delegationId: string;
  readonly capabilityLeaseId: string;
  readonly sandboxId: SandboxId;
  readonly worktreeId?: WorktreeId;
  readonly manifestHash: string;
  readonly diffHash: string;
  readonly proposalHash: string;
  readonly timestamp: number;
}

/**
 * Proposal containing the structured changes to be reviewed and promoted.
 * Đề xuất chứa các thay đổi có cấu trúc để xem xét và xúc tiến.
 */
export interface PromotionProposal {
  readonly promotionId: PromotionId;
  readonly sandboxId: SandboxId;
  readonly worktreeId?: WorktreeId;
  readonly taskId: string;
  readonly delegationId: string;
  readonly capabilityLeaseId: string;
  readonly agentId: string;
  readonly deviceId: string;
  readonly sessionId: string;
  readonly baseManifestHash: string;
  readonly currentManifestHash: string;
  readonly diffHash: string;
  readonly targetProjectRoot: string;
  readonly proposedChanges: readonly SandboxChange[];
  readonly provenance: PromotionProvenance;
  readonly state: PromotionState;
  readonly stateReason?: string;
  readonly createdAt: number;
  readonly expiresAt: number;
  readonly scope: PromotionScope;
}

/**
 * Result of promotion validation engine.
 * Kết quả từ động cơ xác thực xúc tiến.
 */
export interface PromotionValidationResult {
  readonly valid: boolean;
  readonly state: PromotionState;
  readonly reason?: string;
  readonly conflicts: readonly PromotionConflict[];
  readonly isStale: boolean;
  readonly validatedAt: number;
}

/**
 * Record of supervisory or owner review decision.
 * Bản ghi quyết định đánh giá của người giám sát hoặc Owner.
 */
export interface PromotionApprovalRecord {
  readonly promotionId: PromotionId;
  readonly reviewerId: string;
  readonly reviewerType: 'SUPERVISOR' | 'MASTER_OWNER';
  readonly isOwnerApproval: boolean;
  readonly decision: 'APPROVED' | 'REJECTED';
  readonly humanGateRequestId?: string;
  readonly authorizationTokenId?: string;
  readonly reviewedAt: number;
  readonly rationale: string;
}

/**
 * Result of executing a controlled promotion.
 * Kết quả thực thi một lần xúc tiến có kiểm soát.
 */
export interface PromotionExecutionResult {
  readonly promotionId: PromotionId;
  readonly targetProjectRoot: string;
  readonly status: 'PROMOTED' | 'FAILED' | 'BLOCKED';
  readonly appliedChanges: readonly SandboxChange[];
  readonly previousManifestHash: string;
  readonly promotedManifestHash: string;
  readonly executedAt: number;
  readonly executedBy: string;
  readonly auditRecordId: string;
}

/**
 * Backup state required for deterministic rollback of promoted changes.
 * Trạng thái sao lưu cần thiết để hoàn tác tất định các thay đổi đã xúc tiến.
 */
export interface PromotionRollbackBackup {
  readonly relativePath: string;
  readonly previousContent?: string;
  readonly previousExists: boolean;
}

/**
 * Record of a promotion rollback execution.
 * Bản ghi thực thi việc hoàn tác một lần xúc tiến.
 */
export interface PromotionRollbackResult {
  readonly rollbackId: string;
  readonly promotionId: PromotionId;
  readonly targetProjectRoot: string;
  readonly restoredFiles: readonly string[];
  readonly previousManifestHash: string;
  readonly rollbackManifestHash: string;
  readonly rolledBackAt: number;
  readonly rolledBackBy: string;
  readonly reason: string;
  readonly auditRecordId: string;
}

/**
 * Canonical evidence bundle for an exported promotion.
 * Gói bằng chứng chuẩn tắc cho một lần xúc tiến đã xuất.
 */
export interface PromotionEvidenceBundle {
  readonly promotionId: PromotionId;
  readonly evidenceHash: string;
  readonly proposalHash: string;
  readonly diffHash: string;
  readonly prePromotionManifestHash: string;
  readonly postPromotionManifestHash: string;
  readonly provenance: PromotionProvenance;
  readonly approvalRecord: PromotionApprovalRecord;
  readonly authorizationTokenId?: string;
  readonly createdAt: number;
}

/**
 * Structured error class for the promotion subsystem.
 * Lớp lỗi có cấu trúc cho phân hệ xúc tiến.
 */
export class PromotionError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'PromotionError';
  }
}
