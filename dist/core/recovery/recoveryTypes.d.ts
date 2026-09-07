import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { LifecycleState, LifecycleStage, LifecycleCheckpoint } from '../lifecycle/lifecycleTypes.js';
import type { VerificationStatus } from '../verification/verificationStatus.js';
import type { CommitStatus } from '../commit/commitTypes.js';
import type { RecoveryState } from './recoveryStates.js';
export type { RecoveryState };
/**
 * EN: Authoritative crash consistency condition classification.
 * VI: Phân loại điều kiện nhất quán sự cố có thẩm quyền.
 */
export type CrashConsistencyCondition = 'NO_ACTIVE_OPERATION' | 'INTERRUPTED_BEFORE_EXECUTION' | 'INTERRUPTED_DURING_EXECUTION' | 'INTERRUPTED_DURING_VERIFICATION' | 'INTERRUPTED_DURING_COMMIT' | 'COMMIT_CONFIRMED_BEFORE_CRASH' | 'UNKNOWN_DURABLE_STATE' | 'CONFLICTING_DURABLE_STATE';
/**
 * EN: Classification of an interrupted operation.
 * VI: Phân loại thao tác bị gián đoạn.
 */
export type InterruptedOperationClassification = 'NO_OPERATION' | 'SAFE_TO_RESUME' | 'RESUME_REQUIRES_GOVERNANCE' | 'RESUME_REQUIRES_VERIFICATION' | 'RESUME_BLOCKED' | 'DUPLICATE_ALREADY_COMMITTED' | 'PARTIAL_COMMIT' | 'UNKNOWN_STATE' | 'CONFLICTING_STATE' | 'TERMINAL_STATE_RECOVERED';
/**
 * EN: Explicit safe recovery decision indicating what is valid to do next.
 * VI: Quyết định phục hồi an toàn tường minh cho biết điều gì là hợp lệ để làm tiếp.
 */
export type RecoveryDecision = 'SAFE_TO_READY' | 'SAFE_TO_RESUME' | 'REQUIRE_GOVERNANCE' | 'REQUIRE_VERIFICATION' | 'REQUIRE_APPROVAL' | 'BLOCK_RECOVERY' | 'REQUIRE_OPERATOR_INTERVENTION';
/**
 * EN: Approval recovery status evaluation.
 * VI: Đánh giá trạng thái phục hồi phê duyệt.
 */
export type ApprovalRecoveryStatus = 'APPROVAL_UNKNOWN' | 'APPROVAL_PENDING' | 'APPROVAL_VALID_BUT_NOT_CONSUMED' | 'APPROVAL_ALREADY_CONSUMED' | 'APPROVAL_INVALID' | 'APPROVAL_EXPIRED_OR_UNAVAILABLE';
/**
 * EN: Failure categories for recovery breakdowns.
 * VI: Các danh mục lỗi cho các sự cố phục hồi.
 */
export type RecoveryFailureCategory = 'RECOVERY_STATE_MISSING' | 'RECOVERY_CHECKPOINT_INVALID' | 'RECOVERY_SCOPE_FAILURE' | 'RECOVERY_FINGERPRINT_FAILURE' | 'RECOVERY_SEQUENCE_FAILURE' | 'RECOVERY_COMMIT_CONFLICT' | 'RECOVERY_VERIFICATION_CONFLICT' | 'RECOVERY_GOVERNANCE_CONFLICT' | 'RECOVERY_RISK_MISMATCH' | 'RECOVERY_APPROVAL_CONFLICT' | 'RECOVERY_PARTIAL_STATE' | 'RECOVERY_UNKNOWN_STATE' | 'RECOVERY_TERMINAL_STATE' | 'RECOVERY_INTERNAL_FAILURE';
/**
 * EN: Recovery journal event classifications.
 * VI: Phân loại sự kiện nhật ký phục hồi.
 */
export type RecoveryJournalEventType = 'RECOVERY_STARTED' | 'STATE_INSPECTED' | 'CHECKPOINT_SELECTED' | 'COMMIT_DISCOVERED' | 'VERIFICATION_DISCOVERED' | 'CONSISTENCY_EVALUATED' | 'CLASSIFICATION_DETERMINED' | 'DECISION_RECORDED' | 'RECOVERY_FINISHED';
/**
 * EN: Immutable representation of the Last Known Good State derived from durable evidence.
 * VI: Đại diện bất biến của Trạng thái Tốt được Biết Cuối cùng bắt nguồn từ bằng chứng bền vững.
 */
export interface LastKnownGoodState {
    readonly checkpointId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly sequence: number;
    readonly lifecycleState: LifecycleState;
    readonly stage: LifecycleStage;
    readonly verified: boolean;
    readonly committed: boolean;
    readonly timestamp: number;
    readonly fingerprint: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
/**
 * EN: Immutable reconstructed state capturing authoritative post-crash evidence.
 * VI: Trạng thái tái thiết lập bất biến lưu lại bằng chứng sau sự cố có thẩm quyền.
 */
export interface ReconstructedState {
    readonly userId: string;
    readonly sessionId: string;
    readonly correlationId: string;
    readonly requestId?: string;
    readonly lastDurableCheckpointId?: string;
    readonly lifecycleState: LifecycleState;
    readonly stage: LifecycleStage;
    readonly sequence: number;
    readonly risk: PlanRiskLevel;
    readonly governanceMetadata?: Readonly<Record<string, unknown>>;
    readonly approvalMetadata?: Readonly<Record<string, unknown>>;
    readonly approvalStatus: ApprovalRecoveryStatus;
    readonly verificationEvidence?: {
        readonly verificationId?: string;
        readonly status: VerificationStatus;
        readonly taskSucceeded: boolean;
        readonly fingerprint?: string;
    };
    readonly commitEvidence?: {
        readonly commitId?: string;
        readonly status: CommitStatus;
        readonly isPartial: boolean;
        readonly fingerprint?: string;
    };
    readonly crashCondition: CrashConsistencyCondition;
    readonly classification: InterruptedOperationClassification;
    readonly fingerprint: string;
}
/**
 * EN: Immutable failure descriptor for recovery errors.
 * VI: Bộ mô tả sự cố bất biến cho các lỗi phục hồi.
 */
export interface RecoveryFailure {
    readonly category: RecoveryFailureCategory;
    readonly message: string;
    readonly fingerprint: string;
    readonly timestamp: number;
    readonly recoverable: boolean;
    readonly details?: Readonly<Record<string, unknown>>;
}
/**
 * EN: Immutable entry in the append-only recovery journal.
 * VI: Bản ghi bất biến trong nhật ký phục hồi chỉ-nối-thêm.
 */
export interface RecoveryJournalRecord {
    readonly eventId: string;
    readonly recoveryId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly eventType: RecoveryJournalEventType;
    readonly timestamp: number;
    readonly state: RecoveryState;
    readonly fingerprint: string;
    readonly details?: Readonly<Record<string, unknown>>;
}
/**
 * EN: Request submitted to RecoveryService for evaluating and reconstructing state.
 * VI: Yêu cầu gửi tới RecoveryService để đánh giá và tái thiết lập trạng thái.
 */
export interface RecoveryRequest {
    readonly userId: string;
    readonly sessionId: string;
    readonly checkpoints?: readonly LifecycleCheckpoint[];
    readonly verificationRecord?: {
        readonly verificationId: string;
        readonly status: VerificationStatus;
        readonly taskSucceeded: boolean;
        readonly fingerprint?: string;
    };
    readonly commitRecord?: {
        readonly commitId: string;
        readonly status: CommitStatus;
        readonly isPartial?: boolean;
        readonly fingerprint?: string;
    };
    readonly activeLifecycleState?: LifecycleState;
    readonly requestId?: string;
    readonly correlationId?: string;
    readonly risk?: PlanRiskLevel;
    readonly governanceMetadata?: Readonly<Record<string, unknown>>;
    readonly approvalMetadata?: Readonly<Record<string, unknown>>;
}
/**
 * EN: Final immutable result of a recovery operation.
 * VI: Kết quả bất biến cuối cùng của một thao tác phục hồi.
 */
export interface RecoveryResult {
    readonly recoveryId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly state: RecoveryState;
    readonly decision: RecoveryDecision;
    readonly classification: InterruptedOperationClassification;
    readonly crashCondition: CrashConsistencyCondition;
    readonly reconstructedState: ReconstructedState;
    readonly lastKnownGoodState: LastKnownGoodState | null;
    readonly failure?: RecoveryFailure;
    readonly journal: readonly RecoveryJournalRecord[];
    readonly fingerprint: string;
    readonly timestamp: number;
}
