// src/core/recovery/recoveryTransitions.ts
// BOWCON V4.0 — MILESTONE 1.3.16: RECOVERY STATE TRANSITIONS
//
// EN:
// Authoritative state transition matrix and validation predicates for Brain Recovery.
// Strictly enforces deterministic recovery progression and guards terminal states.
//
// VI:
// Ma trận chuyển đổi trạng thái có thẩm quyền và các vị từ xác thực cho Phục hồi Não bộ.
// Thực thi nghiêm ngặt tiến trình phục hồi tất định và bảo vệ các trạng thái kết thúc.

import type { RecoveryState } from './recoveryStates.js';
import { isRecoveryTerminalState } from './recoveryStates.js';

/**
 * EN: Authoritative transition map defining valid destinations for each recovery state.
 * VI: Bản đồ chuyển đổi có thẩm quyền xác định các đích hợp lệ cho từng trạng thái phục hồi.
 */
export const VALID_RECOVERY_TRANSITIONS: Readonly<Record<RecoveryState, readonly RecoveryState[]>> = Object.freeze({
  RECOVERY_REQUIRED: Object.freeze<RecoveryState[]>(['RECOVERY_INSPECTING', 'RECOVERY_FAILED']),
  RECOVERY_INSPECTING: Object.freeze<RecoveryState[]>(['RECOVERY_RECONSTRUCTING', 'RECOVERY_BLOCKED', 'RECOVERY_FAILED', 'RECOVERY_STOPPED']),
  RECOVERY_RECONSTRUCTING: Object.freeze<RecoveryState[]>(['RECOVERY_VALIDATING', 'RECOVERY_BLOCKED', 'RECOVERY_FAILED', 'RECOVERY_STOPPED']),
  RECOVERY_VALIDATING: Object.freeze<RecoveryState[]>(['RECOVERY_RESUMABLE', 'RECOVERY_STOPPED', 'RECOVERY_BLOCKED', 'RECOVERY_FAILED']),
  RECOVERY_RESUMABLE: Object.freeze<RecoveryState[]>(['RECOVERY_COMPLETED', 'RECOVERY_STOPPED', 'RECOVERY_FAILED']),
  RECOVERY_STOPPED: Object.freeze<RecoveryState[]>([]),
  RECOVERY_BLOCKED: Object.freeze<RecoveryState[]>([]),
  RECOVERY_COMPLETED: Object.freeze<RecoveryState[]>([]),
  RECOVERY_FAILED: Object.freeze<RecoveryState[]>([]),
});

/**
 * EN: Checks if a requested transition between recovery states is mathematically valid.
 * VI: Kiểm tra xem một chuyển đổi yêu cầu giữa các trạng thái phục hồi có hợp lệ về mặt toán học hay không.
 */
export function isValidRecoveryTransition(from: RecoveryState, to: RecoveryState): boolean {
  if (isRecoveryTerminalState(from)) {
    return false;
  }
  const allowed = VALID_RECOVERY_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

/**
 * EN: Validates a recovery transition and returns a structured validation result.
 * VI: Xác thực một chuyển đổi phục hồi và trả về kết quả xác thực có cấu trúc.
 */
export function validateRecoveryTransition(
  from: RecoveryState,
  to: RecoveryState,
): { valid: boolean; error?: string } {
  if (isRecoveryTerminalState(from)) {
    return {
      valid: false,
      error: `TERMINAL_STATE_LOCKED: Cannot transition from terminal recovery state "${from}" to "${to}"`,
    };
  }

  if (!isValidRecoveryTransition(from, to)) {
    return {
      valid: false,
      error: `INVALID_RECOVERY_TRANSITION: Transition from "${from}" to "${to}" is not permitted by authoritative matrix`,
    };
  }

  return { valid: true };
}

/**
 * EN: Asserts that a recovery transition is valid, throwing an error if rejected.
 * VI: Khẳng định rằng chuyển đổi phục hồi là hợp lệ, ném ngoại lệ nếu bị từ chối.
 */
export function assertValidRecoveryTransition(from: RecoveryState, to: RecoveryState): void {
  const result = validateRecoveryTransition(from, to);
  if (!result.valid) {
    throw new Error(result.error || 'INVALID_RECOVERY_TRANSITION');
  }
}
