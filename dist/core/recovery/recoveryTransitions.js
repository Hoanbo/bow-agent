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
import { isRecoveryTerminalState } from './recoveryStates.js';
/**
 * EN: Authoritative transition map defining valid destinations for each recovery state.
 * VI: Bản đồ chuyển đổi có thẩm quyền xác định các đích hợp lệ cho từng trạng thái phục hồi.
 */
export const VALID_RECOVERY_TRANSITIONS = Object.freeze({
    RECOVERY_REQUIRED: Object.freeze(['RECOVERY_INSPECTING', 'RECOVERY_FAILED']),
    RECOVERY_INSPECTING: Object.freeze(['RECOVERY_RECONSTRUCTING', 'RECOVERY_BLOCKED', 'RECOVERY_FAILED', 'RECOVERY_STOPPED']),
    RECOVERY_RECONSTRUCTING: Object.freeze(['RECOVERY_VALIDATING', 'RECOVERY_BLOCKED', 'RECOVERY_FAILED', 'RECOVERY_STOPPED']),
    RECOVERY_VALIDATING: Object.freeze(['RECOVERY_RESUMABLE', 'RECOVERY_STOPPED', 'RECOVERY_BLOCKED', 'RECOVERY_FAILED']),
    RECOVERY_RESUMABLE: Object.freeze(['RECOVERY_COMPLETED', 'RECOVERY_STOPPED', 'RECOVERY_FAILED']),
    RECOVERY_STOPPED: Object.freeze([]),
    RECOVERY_BLOCKED: Object.freeze([]),
    RECOVERY_COMPLETED: Object.freeze([]),
    RECOVERY_FAILED: Object.freeze([]),
});
/**
 * EN: Checks if a requested transition between recovery states is mathematically valid.
 * VI: Kiểm tra xem một chuyển đổi yêu cầu giữa các trạng thái phục hồi có hợp lệ về mặt toán học hay không.
 */
export function isValidRecoveryTransition(from, to) {
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
export function validateRecoveryTransition(from, to) {
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
export function assertValidRecoveryTransition(from, to) {
    const result = validateRecoveryTransition(from, to);
    if (!result.valid) {
        throw new Error(result.error || 'INVALID_RECOVERY_TRANSITION');
    }
}
