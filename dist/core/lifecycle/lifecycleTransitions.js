// src/core/lifecycle/lifecycleTransitions.ts
// BOWCON V4.0 — MILESTONE 1.3.13: DETERMINISTIC STATE TRANSITION MATRIX
//
// EN:
// Defines the authoritative, deterministic state transition rules.
// Enforces INV-STATE-01 (No invalid transitions), INV-STATE-05 (No arbitrary jumps),
// and INV-STATE-06 (Terminal state protection).
//
// VI:
// Định nghĩa các quy tắc chuyển đổi trạng thái tất định, có thẩm quyền.
// Thực thi INV-STATE-01 (Không chuyển trạng thái không hợp lệ), INV-STATE-05 (Không nhảy cóc tùy ý),
// và INV-STATE-06 (Bảo vệ trạng thái kết thúc).
import { isTerminalState } from './lifecycleStates.js';
/**
 * EN: Explicit map of allowed target states for every lifecycle state.
 * VI: Bảng ánh xạ tường minh các trạng thái đích được phép đối với từng trạng thái vòng đời.
 */
export const VALID_TRANSITIONS = Object.freeze(new Map([
    // Operational forward pipeline
    ['INITIALIZING', Object.freeze(new Set(['READY', 'FAILED']))],
    ['READY', Object.freeze(new Set(['RECEIVING', 'CANCELLED', 'FAILED']))],
    ['RECEIVING', Object.freeze(new Set(['CONTEXT_LOADING', 'CLARIFICATION_REQUIRED', 'NO_ACTION', 'CANCELLED', 'FAILED']))],
    ['CONTEXT_LOADING', Object.freeze(new Set(['UNDERSTANDING', 'CLARIFICATION_REQUIRED', 'DEFERRED', 'CANCELLED', 'FAILED']))],
    ['UNDERSTANDING', Object.freeze(new Set(['PLANNING', 'CLARIFICATION_REQUIRED', 'NO_ACTION', 'DEFERRED', 'BLOCKED', 'REJECTED', 'CANCELLED', 'FAILED']))],
    ['PLANNING', Object.freeze(new Set(['DECIDING', 'CLARIFICATION_REQUIRED', 'NO_ACTION', 'DEFERRED', 'BLOCKED', 'REJECTED', 'CANCELLED', 'FAILED']))],
    ['DECIDING', Object.freeze(new Set(['ORCHESTRATING', 'CLARIFICATION_REQUIRED', 'NO_ACTION', 'DEFERRED', 'BLOCKED', 'REJECTED', 'CANCELLED', 'FAILED']))],
    ['ORCHESTRATING', Object.freeze(new Set(['AWAITING_APPROVAL', 'EXECUTING', 'NO_ACTION', 'DEFERRED', 'BLOCKED', 'REJECTED', 'CANCELLED', 'FAILED']))],
    ['AWAITING_APPROVAL', Object.freeze(new Set(['EXECUTING', 'REJECTED', 'DEFERRED', 'CANCELLED', 'FAILED']))],
    ['EXECUTING', Object.freeze(new Set(['VERIFYING', 'FAILED', 'RECOVERABLE', 'CANCELLED']))],
    ['VERIFYING', Object.freeze(new Set(['COMMITTING', 'FAILED', 'RECOVERABLE', 'CANCELLED']))],
    ['COMMITTING', Object.freeze(new Set(['RESPONDING', 'FAILED', 'CANCELLED']))],
    ['RESPONDING', Object.freeze(new Set(['VOICE_PENDING', 'COMPLETED', 'FAILED', 'CANCELLED']))],
    ['VOICE_PENDING', Object.freeze(new Set(['COMPLETED', 'FAILED', 'CANCELLED']))],
    // Controlled exits & branch states
    ['CLARIFICATION_REQUIRED', Object.freeze(new Set(['COMPLETED', 'READY', 'RECEIVING', 'CANCELLED']))],
    ['DEFERRED', Object.freeze(new Set(['COMPLETED', 'READY', 'CANCELLED']))],
    ['NO_ACTION', Object.freeze(new Set(['COMPLETED']))],
    // Failure and recovery progression
    ['FAILED', Object.freeze(new Set(['RECOVERABLE', 'RECOVERY_PENDING', 'CANCELLED']))],
    ['RECOVERABLE', Object.freeze(new Set(['RECOVERY_PENDING', 'CANCELLED']))],
    ['RECOVERY_PENDING', Object.freeze(new Set([
            'READY',
            'RECEIVING',
            'CONTEXT_LOADING',
            'UNDERSTANDING',
            'PLANNING',
            'DECIDING',
            'ORCHESTRATING',
            'EXECUTING',
            'FAILED',
            'CANCELLED',
        ]))],
    // Terminal states — Zero outgoing transitions permitted (INV-STATE-06)
    ['COMPLETED', Object.freeze(new Set([]))],
    ['REJECTED', Object.freeze(new Set([]))],
    ['BLOCKED', Object.freeze(new Set([]))],
    ['CANCELLED', Object.freeze(new Set([]))],
]));
/**
 * EN: Checks whether a transition between two states is strictly legal.
 * VI: Kiểm tra xem việc chuyển đổi giữa hai trạng thái có hoàn toàn hợp lệ hay không.
 */
export function isValidTransition(from, to) {
    if (isTerminalState(from)) {
        return false; // Terminal states can NEVER transition out (INV-STATE-06)
    }
    const allowed = VALID_TRANSITIONS.get(from);
    return allowed ? allowed.has(to) : false;
}
/**
 * EN: Validates a requested transition and returns a structured validation result.
 * VI: Xác thực một yêu cầu chuyển trạng thái và trả về kết quả có cấu trúc.
 */
export function validateStateTransition(from, to) {
    if (isTerminalState(from)) {
        return {
            valid: false,
            from,
            to,
            error: `TERMINAL_STATE_LOCKED: Current state "${from}" is terminal. Outgoing transitions are forbidden (INV-STATE-06).`,
        };
    }
    const allowed = VALID_TRANSITIONS.get(from);
    if (!allowed || !allowed.has(to)) {
        return {
            valid: false,
            from,
            to,
            error: `ILLEGAL_TRANSITION: Cannot transition directly from "${from}" to "${to}". Arbitrary state jump forbidden (INV-STATE-01, INV-STATE-05).`,
        };
    }
    return {
        valid: true,
        from,
        to,
    };
}
/**
 * EN: Asserts that a state transition is valid, throwing an explicit Error if illegal.
 * VI: Khẳng định rằng chuyển trạng thái là hợp lệ, ném ngoại lệ tường minh nếu không hợp lệ.
 */
export function assertValidTransition(from, to, reason) {
    const result = validateStateTransition(from, to);
    if (!result.valid) {
        const detail = reason ? ` (Reason: "${reason}")` : '';
        throw new Error(`${result.error}${detail}`);
    }
}
