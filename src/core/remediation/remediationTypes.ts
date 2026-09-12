// src/core/remediation/remediationTypes.ts
// BOWCON V4.0 — MS-1.3.55: GOVERNED INCIDENT REMEDIATION, AUTHORIZED RECOVERY EXECUTION & CLOSED-LOOP POST-MITIGATION VERIFICATION
//
// Canonical TypeScript contracts, branded identifiers, and fail-closed state machines
// for authorized post-incident remediation execution, atomic snapshots, and closed-loop verification.
// Các hợp đồng TypeScript chuẩn tắc, định danh thương hiệu và máy trạng thái đóng khi thất bại
// cho việc thực thi khắc phục sự cố được ủy quyền, ảnh chụp nhanh nguyên tử và xác minh vòng lặp kín.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - NO_TOKEN_NO_EXECUTION: Remediation CANNOT proceed without a valid, unexpired, single-use AuthorizationToken.
// - DIAGNOSIS != EXECUTION: Diagnosis findings confer ZERO remediation authority.
// - RECOMMENDATION != AUTHORIZATION: Advisory decision packages require explicit human approval.
// - USER_STOP_SUPREMACY: USER_STOP immediately halts any in-progress remediation.
// - ATOMIC_PRE_SNAPSHOT: Every physical mutation requires a verified pre-remediation snapshot.
// - VERIFIED_SUCCESS_ONLY: SUCCESS is declared ONLY if post-mitigation verification satisfies all invariants.
// - FAIL_SAFE_ROLLBACK: Verification failure or critical drift triggers automatic snapshot restoration.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
// - ZERO SHELL PRIMITIVES: child_process, execSync, spawn, and fork are permanently prohibited.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import type { AuthorizationToken } from '../world-action/worldActionTypes.js';
import type { ObservabilityHealthState } from '../observability/observabilityTypes.js';
import type { IncidentId, DecisionPackageId } from '../diagnosis/diagnosisTypes.js';

// ---------------------------------------------------------------------------
// 1. BRANDED IDENTIFIERS / ĐỊNH DANH THƯƠNG HIỆU
// ---------------------------------------------------------------------------

export type RemediationPlanId = string & { readonly __brand: unique symbol };
export type RemediationExecutionId = string & { readonly __brand: unique symbol };
export type RemediationSnapshotId = string & { readonly __brand: unique symbol };

export function createRemediationPlanId(raw: string): RemediationPlanId {
  return raw as RemediationPlanId;
}

export function createRemediationExecutionId(raw: string): RemediationExecutionId {
  return raw as RemediationExecutionId;
}

export function createRemediationSnapshotId(raw: string): RemediationSnapshotId {
  return raw as RemediationSnapshotId;
}

// ---------------------------------------------------------------------------
// 2. ENUMS & STATE MACHINES / LIỆT KÊ & MÁY TRẠNG THÁI
// ---------------------------------------------------------------------------

/**
 * Explicit lifecycle state machine for governed incident remediation.
 * Máy trạng thái vòng đời rõ ràng cho việc khắc phục sự cố có quản trị.
 */
export type RemediationLifecycleState =
  | 'PENDING_AUTHORIZATION'
  | 'AUTHORIZED'
  | 'SNAPSHOTTING'
  | 'SNAPSHOT_READY'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'SUCCESS'
  | 'ROLLING_BACK'
  | 'ROLLED_BACK'
  | 'FAILED'
  | 'ESCALATED'
  | 'ABORTED'
  | 'SECURITY_VIOLATION';

/**
 * Predefined supported remediation action classes.
 * Strictly limited to internal typed capability handlers (zero shell primitives).
 * Các lớp hành động khắc phục được hỗ trợ định sẵn.
 * Giới hạn nghiêm ngặt trong các bộ xử lý năng lực định kiểu nội bộ (không có lệnh shell).
 */
export type RemediationActionClass =
  | 'ROLLBACK'
  | 'CONFIG_SYNC'
  | 'PROCESS_RESTART'
  | 'TRAFFIC_DRAIN';

// ---------------------------------------------------------------------------
// 3. REMEDIATION PLAN CONTRACTS / HỢP ĐỒNG KẾ HOẠCH KHẮC PHỤC
// ---------------------------------------------------------------------------

/**
 * Governed remediation plan derived from an approved supervisor decision package.
 * Kế hoạch khắc phục có quản trị bắt nguồn từ gói quyết định giám sát viên đã được phê duyệt.
 */
export interface GovernedRemediationPlan {
  readonly planId: RemediationPlanId;
  readonly incidentId: IncidentId;
  readonly packageId: DecisionPackageId;
  readonly actionId: string;
  readonly actionClass: RemediationActionClass;
  readonly targetId: string;
  readonly targetPath?: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly riskScore: number;
  readonly requiresHumanApproval: true;
  readonly isAutomatedExecutionPermitted: false;
  readonly timeoutMs: number;
  readonly createdTimestamp: number;
}

// ---------------------------------------------------------------------------
// 4. PRE-REMEDIATION SNAPSHOT SCHEMAS / LƯỢC ĐỒ ẢNH CHỤP TRƯỚC KHẮC PHỤC
// ---------------------------------------------------------------------------

/**
 * File backup entry recorded in atomic pre-remediation snapshot.
 * Mục sao lưu tệp được ghi lại trong ảnh chụp nhanh nguyên tử trước khắc phục.
 */
export interface SnapshotFileEntry {
  readonly relativePath: string;
  readonly originalSha256: string;
  readonly backupContent: string;
  readonly sizeBytes: number;
}

/**
 * Item captured in pre-remediation snapshot.
 * Mục được chụp lại trong ảnh chụp nhanh trước khắc phục.
 */
export interface RemediationSnapshotItem {
  readonly itemKey: string;
  readonly targetPath?: string;
  readonly originalSha256?: string;
  readonly statePayload: unknown;
}

/**
 * Atomic pre-remediation state snapshot enabling deterministic rollback.
 * Ảnh chụp nhanh trạng thái nguyên tử trước khắc phục cho phép khôi phục xác định.
 */
export interface RemediationSnapshot {
  readonly snapshotId: RemediationSnapshotId;
  readonly planId: RemediationPlanId;
  readonly targetId: string;
  readonly targetPath?: string;
  readonly stateSnapshot?: Readonly<Record<string, unknown>>;
  readonly files?: readonly SnapshotFileEntry[];
  readonly items: readonly RemediationSnapshotItem[];
  readonly snapshotHash: string; // SHA-256
  readonly snapshotSha256: string; // SHA-256 alias
  readonly capturedAt: number;
  readonly createdAt?: number;
}

// ---------------------------------------------------------------------------
// 5. POST-MITIGATION VERIFICATION SCHEMAS / LƯỢC ĐỒ XÁC MINH SAU KHẮC PHỤC
// ---------------------------------------------------------------------------

/**
 * Verification result evaluating system stability after remediation execution.
 * Kết quả xác minh đánh giá sự ổn định của hệ thống sau khi thực thi khắc phục.
 */
export interface PostMitigationVerificationResult {
  readonly planId: RemediationPlanId;
  readonly verified: boolean;
  readonly passed: boolean; // Alias for verified
  readonly windowDurationMs: number;
  readonly verificationWindowMs?: number;
  readonly observedErrorRate: number;
  readonly observedLatencyP95Ms: number;
  readonly baselineLatencyP95Ms: number;
  readonly latencyVarianceRatio: number;
  readonly newInvariantViolationsCount: number;
  readonly postRemediationHealth: ObservabilityHealthState;
  readonly driftStatus: 'NO_DRIFT' | 'EXPECTED_DRIFT' | 'CRITICAL_DRIFT';
  readonly verificationSummary: string;
  readonly violationDetails: readonly string[];
  readonly verificationSha256: string;
  readonly verifiedAt: number;
  readonly checkedAt?: number;
  readonly observedMetrics?: {
    readonly errorRate: number;
    readonly latencyP95: number;
    readonly newInvariantViolationsCount: number;
    readonly driftClassification: string;
    readonly healthState: ObservabilityHealthState;
  };
}

// ---------------------------------------------------------------------------
// 6. FAIL-SAFE ROLLBACK SCHEMAS / LƯỢC ĐỒ KHÔI PHỤC AN TOÀN
// ---------------------------------------------------------------------------

/**
 * Result of executing an automatic or manual rollback to a snapshot.
 * Kết quả của việc thực thi khôi phục tự động hoặc thủ công về một ảnh chụp nhanh.
 */
export interface RemediationRollbackResult {
  readonly executionId: RemediationExecutionId;
  readonly planId: RemediationPlanId;
  readonly snapshotId: RemediationSnapshotId;
  readonly success: boolean;
  readonly reason: string;
  readonly startedAt: number;
  readonly completedAt: number;
  readonly restoredItems: readonly string[];
  readonly errors: readonly string[];
  readonly rollbackSha256: string;
}

// ---------------------------------------------------------------------------
// 7. REMEDIATION PROVENANCE SCHEMAS / LƯỢC ĐỒ NGUỒN GỐC KHẮC PHỤC
// ---------------------------------------------------------------------------

/**
 * Cryptographic provenance record binding the entire remediation lifecycle.
 * Bản ghi nguồn gốc mật mã ràng buộc toàn bộ vòng đời khắc phục.
 */
export interface RemediationProvenanceRecord {
  readonly executionId?: RemediationExecutionId;
  readonly planId: RemediationPlanId;
  readonly incidentId: IncidentId;
  readonly packageId: DecisionPackageId;
  readonly actionId: string;
  readonly tokenId: string;
  readonly operatorId?: string;
  readonly snapshotHash?: string;
  readonly snapshotSha256: string;
  readonly executionHash?: string;
  readonly executionSha256: string;
  readonly verificationHash?: string;
  readonly verificationSha256?: string;
  readonly rollbackHash?: string;
  readonly rollbackSha256?: string;
  readonly finalState?: RemediationLifecycleState;
  readonly timestamp: number;
  readonly signature?: string; // SHA-256
  readonly provenanceHash: string;
}

// ---------------------------------------------------------------------------
// 8. REMEDIATION EXECUTION RESULT DTO / DTO KẾT QUẢ THỰC THI KHẮC PHỤC
// ---------------------------------------------------------------------------

/**
 * Final execution result emitted by the RemediationRuntime.
 * Immutable DTO free of executable functions or callbacks.
 * Kết quả thực thi cuối cùng được phát ra bởi RemediationRuntime.
 * DTO bất biến không chứa hàm hoặc lệnh gọi lại có thể thực thi.
 */
export interface RemediationExecutionResult {
  readonly executionId: RemediationExecutionId;
  readonly planId: RemediationPlanId;
  readonly incidentId?: IncidentId;
  readonly actionClass: RemediationActionClass;
  readonly targetId: string;
  readonly state?: RemediationLifecycleState;
  readonly lifecycleState: RemediationLifecycleState;
  readonly isSuccess?: boolean;
  readonly appliedEffects?: readonly string[];
  readonly appliedChanges: readonly string[];
  readonly outputSummary: string;
  readonly snapshot?: RemediationSnapshot;
  readonly verification?: PostMitigationVerificationResult;
  readonly rollbackExecuted?: boolean;
  readonly error?: string;
  readonly provenance?: RemediationProvenanceRecord;
  readonly executionSha256: string;
  readonly startedAt: number;
  readonly completedAt: number;
}

