// src/core/lifecycle/lifecycleTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.13: AGENT STATE & LIFECYCLE MANAGEMENT TYPES
//
// EN:
// Authoritative type definitions for the Agent State & Lifecycle Management subsystem.
// Enforces explicit operational states, terminal states, transitions, checkpoints,
// failure classification, and recovery metadata.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền cho phân hệ Quản lý Trạng thái & Vòng đời Agent.
// Thực thi các trạng thái hoạt động tường minh, trạng thái kết thúc, chuyển trạng thái,
// điểm kiểm tra (checkpoint), phân loại lỗi và metadata phục hồi.

import type { PlanRiskLevel } from '../planning/planningTypes.js';

/**
 * EN: Authoritative, exhaustive union of all agent lifecycle states.
 * VI: Tập hợp tường minh và đầy đủ của tất cả các trạng thái vòng đời agent.
 */
export type LifecycleState =
  // Operational States (Trạng thái Hoạt động)
  | 'INITIALIZING'
  | 'READY'
  | 'RECEIVING'
  | 'CONTEXT_LOADING'
  | 'UNDERSTANDING'
  | 'PLANNING'
  | 'DECIDING'
  | 'ORCHESTRATING'
  | 'AWAITING_APPROVAL'
  | 'EXECUTING'
  | 'VERIFYING'
  | 'COMMITTING'
  | 'RESPONDING'
  | 'VOICE_PENDING'
  | 'COMPLETED'
  // Terminal / Controlled Exit States (Trạng thái Kết thúc / Thoát có kiểm soát)
  | 'NO_ACTION'
  | 'CLARIFICATION_REQUIRED'
  | 'DEFERRED'
  | 'BLOCKED'
  | 'REJECTED'
  | 'FAILED'
  | 'RECOVERABLE'
  | 'RECOVERY_PENDING'
  | 'CANCELLED';

/**
 * EN: High-level lifecycle stage classification.
 * VI: Phân loại giai đoạn vòng đời cấp cao.
 */
export type LifecycleStage =
  | 'INITIALIZATION'
  | 'CONTEXT'
  | 'INTENT'
  | 'PLANNING'
  | 'DECISION'
  | 'ORCHESTRATION'
  | 'APPROVAL'
  | 'EXECUTION'
  | 'VERIFICATION'
  | 'COMMIT'
  | 'RESPONSE'
  | 'VOICE'
  | 'TERMINAL';

/**
 * EN: Categories for classifying agent failures deterministically.
 * VI: Các danh mục để phân loại sự cố agent một cách tất định.
 */
export type FailureCategory =
  | 'VALIDATION_FAILURE'
  | 'CONTEXT_FAILURE'
  | 'INTENT_FAILURE'
  | 'PLANNING_FAILURE'
  | 'DECISION_FAILURE'
  | 'ORCHESTRATION_FAILURE'
  | 'AUTHORIZATION_FAILURE'
  | 'EXECUTION_FAILURE'
  | 'VERIFICATION_FAILURE'
  | 'COMMIT_FAILURE'
  | 'VOICE_FAILURE'
  | 'INTERNAL_FAILURE';

/**
 * EN: Safe, sanitized failure metadata containing zero secrets.
 * VI: Metadata lỗi an toàn, đã được khử trùng và không chứa bất kỳ bí mật nào.
 */
export interface FailureMetadata {
  readonly category: FailureCategory;
  readonly message: string;
  readonly recoverable: boolean;
  readonly stage: LifecycleStage;
  readonly state: LifecycleState;
  readonly fingerprint: string;
  readonly timestamp: number;
  readonly details?: Readonly<Record<string, unknown>>;
}

/**
 * EN: Data-only recovery descriptor that dictates recovery policy without executing actions.
 * VI: Bộ mô tả phục hồi thuần dữ liệu quy định chính sách phục hồi mà không trực tiếp thực thi.
 */
export interface RecoveryMetadata {
  readonly recoverable: boolean;
  readonly retryAllowed: boolean;
  readonly retryReason?: string;
  readonly failedState: LifecycleState;
  readonly recoveryState: LifecycleState;
  readonly attemptNumber: number;
  readonly maxAttempts: number;
  readonly previousFingerprint: string;
  readonly recoveryFingerprint: string;
}

/**
 * EN: Immutable record capturing an authoritative state transition event.
 * VI: Bản ghi bất biến lưu lại một sự kiện chuyển đổi trạng thái có thẩm quyền.
 */
export interface TransitionRecord {
  readonly transitionId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly from: LifecycleState;
  readonly to: LifecycleState;
  readonly stage: LifecycleStage;
  readonly sequence: number;
  readonly reason: string;
  readonly timestamp: number;
  readonly fingerprint: string;
  readonly safeMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * EN: Immutable point-in-time lifecycle checkpoint snapshot.
 * VI: Snapshot điểm kiểm tra (checkpoint) vòng đời bất biến tại một thời điểm.
 */
export interface LifecycleCheckpoint {
  readonly checkpointId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly state: LifecycleState;
  readonly stage: LifecycleStage;
  readonly sequence: number;
  readonly correlationId?: string;
  readonly decisionId?: string;
  readonly executionId?: string;
  readonly fingerprint: string;
  readonly timestamp: number;
  readonly safeMetadata?: Readonly<Record<string, unknown>>;
}

/**
 * EN: Result of validating a requested state transition.
 * VI: Kết quả xác thực một yêu cầu chuyển đổi trạng thái.
 */
export interface TransitionValidationResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly from: LifecycleState;
  readonly to: LifecycleState;
}

/**
 * EN: Authoritative, immutable Agent Lifecycle State representation.
 * VI: Biểu diễn Trạng thái Vòng đời Agent có thẩm quyền và bất biến.
 */
export interface AgentLifecycleState {
  readonly stateId: string;
  readonly userId: string;
  readonly sessionId: string;
  readonly currentState: LifecycleState;
  readonly previousState?: LifecycleState;
  readonly stage: LifecycleStage;
  readonly sequence: number;
  readonly transitionReason?: string;
  readonly timestamp: number;
  readonly correlationId?: string;
  readonly decisionId?: string;
  readonly executionId?: string;
  readonly checkpointId?: string;
  readonly riskLevel?: PlanRiskLevel | string;
  readonly governanceRequired?: boolean;
  readonly approvalRequired?: boolean;
  readonly failure?: FailureMetadata;
  readonly recovery?: RecoveryMetadata;
  readonly safeMetadata?: Readonly<Record<string, unknown>>;
  readonly version: string;
  readonly fingerprint: string;
}
