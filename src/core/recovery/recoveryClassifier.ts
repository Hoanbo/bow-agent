// src/core/recovery/recoveryClassifier.ts
// BOWCON V4.0 — MILESTONE 1.3.16: INTERRUPTED OPERATION CLASSIFIER
//
// EN:
// Authoritative classifier for interrupted operations post-crash.
// Analyzes crash conditions, risk levels, and approval states to categorize
// the interrupted operation without performing any execution.
//
// VI:
// Bộ phân loại có thẩm quyền cho các thao tác bị gián đoạn sau sự cố.
// Phân tích điều kiện sự cố, mức độ rủi ro và trạng thái phê duyệt để phân loại
// thao tác bị gián đoạn mà không thực hiện bất kỳ hành động nào.

import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { LifecycleState } from '../lifecycle/lifecycleTypes.js';
import type {
  CrashConsistencyCondition,
  InterruptedOperationClassification,
  ApprovalRecoveryStatus,
} from './recoveryTypes.js';

/**
 * EN: Classifies an interrupted operation based on crash consistency evaluation and governance context.
 * VI: Phân loại một thao tác bị gián đoạn dựa trên đánh giá nhất quán sự cố và ngữ cảnh quản trị.
 */
export function classifyInterruptedOperation(
  crashCondition: CrashConsistencyCondition,
  activeLifecycleState?: LifecycleState,
  risk: PlanRiskLevel = 'LOW',
  approvalStatus: ApprovalRecoveryStatus = 'APPROVAL_UNKNOWN',
  isPartialCommit = false,
): InterruptedOperationClassification {
  // 1. Conflicting records
  if (crashCondition === 'CONFLICTING_DURABLE_STATE') {
    return 'CONFLICTING_STATE';
  }

  // 2. Already committed
  if (crashCondition === 'COMMIT_CONFIRMED_BEFORE_CRASH') {
    return 'DUPLICATE_ALREADY_COMMITTED';
  }

  // 3. Partial or failed commit
  if (isPartialCommit || crashCondition === 'INTERRUPTED_DURING_COMMIT') {
    return 'PARTIAL_COMMIT';
  }

  // 4. Terminal state already reached
  if (
    activeLifecycleState &&
    ['COMPLETED', 'NO_ACTION', 'REJECTED', 'CANCELLED', 'BLOCKED'].includes(activeLifecycleState)
  ) {
    return 'TERMINAL_STATE_RECOVERED';
  }

  // 5. No active operation
  if (crashCondition === 'NO_ACTIVE_OPERATION') {
    return 'NO_OPERATION';
  }

  // 6. Interrupted during active tool execution
  if (crashCondition === 'INTERRUPTED_DURING_EXECUTION') {
    // Re-executing blindly is strictly prohibited. Block resume until evidence verifies whether it executed.
    return 'RESUME_BLOCKED';
  }

  // 7. Interrupted during verification
  if (crashCondition === 'INTERRUPTED_DURING_VERIFICATION') {
    return 'RESUME_REQUIRES_VERIFICATION';
  }

  // 8. Interrupted before execution (planning, understanding, awaiting approval)
  if (crashCondition === 'INTERRUPTED_BEFORE_EXECUTION') {
    if (activeLifecycleState === 'AWAITING_APPROVAL' || approvalStatus === 'APPROVAL_PENDING') {
      return 'RESUME_REQUIRES_GOVERNANCE';
    }
    if (risk === 'HIGH' || risk === 'CRITICAL') {
      return 'RESUME_REQUIRES_GOVERNANCE';
    }
    return 'SAFE_TO_RESUME';
  }

  // 9. Unknown durable state
  return 'UNKNOWN_STATE';
}

/**
 * EN: Evaluates approval recovery status from metadata without fabricating validity.
 * VI: Đánh giá trạng thái phục hồi phê duyệt từ metadata mà không tự ý tạo ra tính hợp lệ.
 */
export function evaluateApprovalRecoveryStatus(
  approvalMetadata?: Readonly<Record<string, unknown>>,
  lifecycleState?: LifecycleState,
): ApprovalRecoveryStatus {
  if (!approvalMetadata) {
    return 'APPROVAL_UNKNOWN';
  }

  const status = approvalMetadata.status as string | undefined;
  const consumed = approvalMetadata.consumed as boolean | undefined;
  const expired = approvalMetadata.expired as boolean | undefined;

  if (expired === true) {
    return 'APPROVAL_EXPIRED_OR_UNAVAILABLE';
  }

  if (consumed === true || lifecycleState === 'EXECUTING' || lifecycleState === 'VERIFYING' || lifecycleState === 'COMMITTING') {
    return 'APPROVAL_ALREADY_CONSUMED';
  }

  if (status === 'APPROVED' && !consumed) {
    return 'APPROVAL_VALID_BUT_NOT_CONSUMED';
  }

  if (status === 'PENDING' || lifecycleState === 'AWAITING_APPROVAL') {
    return 'APPROVAL_PENDING';
  }

  if (status === 'REJECTED' || status === 'INVALID') {
    return 'APPROVAL_INVALID';
  }

  return 'APPROVAL_UNKNOWN';
}
