// src/core/commit/commitTransitions.ts
// BOWCON V4.0 — MILESTONE 1.3.15: COMMIT STATE TRANSITION MATRIX
//
// EN:
// Authoritative, deterministic commit state transition matrix.
// Strictly prevents arbitrary jumps, enforces terminal state protection, and controls rollback paths.
//
// VI:
// Ma trận chuyển trạng thái commit có thẩm quyền, tất định.
// Ngăn chặn nghiêm ngặt việc nhảy cóc tùy ý, thực thi bảo vệ trạng thái kết thúc và kiểm soát luồng rollback.
import { isCommitTerminalState } from './commitStates.js';
/**
 * EN: Explicit map of allowed target states for every commit lifecycle state.
 * VI: Bảng ánh xạ tường minh các trạng thái đích được phép đối với từng trạng thái vòng đời commit.
 */
export const VALID_COMMIT_TRANSITIONS = Object.freeze(new Map([
    ['COMMIT_PREPARING', Object.freeze(new Set(['COMMIT_VALIDATING', 'COMMIT_FAILED', 'COMMIT_REJECTED']))],
    ['COMMIT_VALIDATING', Object.freeze(new Set(['COMMIT_READY', 'COMMIT_FAILED', 'COMMIT_REJECTED']))],
    ['COMMIT_READY', Object.freeze(new Set(['COMMITTING', 'COMMIT_FAILED', 'COMMIT_REJECTED']))],
    ['COMMITTING', Object.freeze(new Set(['COMMIT_CONFIRMED', 'COMMIT_FAILED']))],
    ['COMMIT_CONFIRMED', Object.freeze(new Set(['COMMIT_COMPLETE', 'COMMIT_FAILED']))],
    ['COMMIT_FAILED', Object.freeze(new Set(['ROLLBACK_PENDING', 'COMMIT_REJECTED']))],
    ['ROLLBACK_PENDING', Object.freeze(new Set(['ROLLED_BACK', 'COMMIT_FAILED']))],
    // Terminal states — Zero outgoing transitions permitted
    ['COMMIT_COMPLETE', Object.freeze(new Set([]))],
    ['COMMIT_REJECTED', Object.freeze(new Set([]))],
    ['ROLLED_BACK', Object.freeze(new Set([]))],
]));
/**
 * EN: Checks whether a transition between two commit states is strictly legal.
 * VI: Kiểm tra xem việc chuyển đổi giữa hai trạng thái commit có hoàn toàn hợp lệ hay không.
 */
export function isValidCommitTransition(from, to) {
    if (isCommitTerminalState(from)) {
        return false; // Terminal states can NEVER transition out
    }
    const allowed = VALID_COMMIT_TRANSITIONS.get(from);
    return allowed ? allowed.has(to) : false;
}
/**
 * EN: Validates a commit transition and returns a structured validation outcome.
 * VI: Xác thực chuyển đổi commit và trả về kết quả cấu trúc.
 */
export function validateCommitTransition(from, to) {
    if (isCommitTerminalState(from)) {
        return {
            valid: false,
            reason: `TERMINAL_STATE_LOCKED: Cannot transition from terminal commit state "${from}"`,
        };
    }
    const allowed = VALID_COMMIT_TRANSITIONS.get(from);
    if (!allowed || !allowed.has(to)) {
        return {
            valid: false,
            reason: `INVALID_COMMIT_TRANSITION: Transition from "${from}" to "${to}" is not permitted`,
        };
    }
    return { valid: true };
}
/**
 * EN: Asserts that a commit transition is valid, throwing an Error if illegal.
 * VI: Khẳng định chuyển đổi commit là hợp lệ, ném ra Error nếu bất hợp pháp.
 */
export function assertValidCommitTransition(from, to) {
    const result = validateCommitTransition(from, to);
    if (!result.valid) {
        throw new Error(result.reason);
    }
}
