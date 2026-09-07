// src/core/synchronization/eventTransitions.ts
// BOWCON V4.0 — MILESTONE 1.3.18: BRAIN EVENT STATE TRANSITIONS
//
// EN:
// Authoritative transition matrix and fail-closed validation for Brain Event states.
//
// VI:
// Ma trận chuyển đổi có thẩm quyền và kiểm tra an toàn đóng kín cho các trạng thái sự kiện Não bộ.
import { isEventTerminal } from './eventStates.js';
/**
 * EN: Authoritative mapping of permitted event state transitions.
 * VI: Bản đồ có thẩm quyền về các bước chuyển trạng thái sự kiện được phép.
 */
export const VALID_EVENT_TRANSITIONS = Object.freeze(new Map([
    [
        'CREATED',
        Object.freeze(new Set([
            'VALIDATED',
            'REJECTED',
            'STALE',
            'CONFLICTED',
        ])),
    ],
    [
        'VALIDATED',
        Object.freeze(new Set([
            'PUBLISHED',
            'REJECTED',
            'STALE',
            'CONFLICTED',
        ])),
    ],
    [
        'PUBLISHED',
        Object.freeze(new Set([
            'OBSERVED',
            'ACKNOWLEDGED',
            'SUPERSEDED',
            'STALE',
            'CONFLICTED',
        ])),
    ],
    [
        'OBSERVED',
        Object.freeze(new Set([
            'ACKNOWLEDGED',
            'SUPERSEDED',
            'STALE',
            'CONFLICTED',
        ])),
    ],
    [
        'ACKNOWLEDGED',
        Object.freeze(new Set([
            'SUPERSEDED',
            'STALE',
        ])),
    ],
    ['REJECTED', Object.freeze(new Set())],
    ['STALE', Object.freeze(new Set())],
    ['CONFLICTED', Object.freeze(new Set())],
    ['SUPERSEDED', Object.freeze(new Set())],
]));
/**
 * EN: Validates whether a transition from one event state to another is permitted.
 * VI: Kiểm tra xem bước chuyển trạng thái từ trạng thái này sang trạng thái khác có được phép không.
 */
export function isValidEventTransition(from, to) {
    if (from === to) {
        return true; // No-op idempotent transition
    }
    if (isEventTerminal(from)) {
        return false;
    }
    const allowed = VALID_EVENT_TRANSITIONS.get(from);
    return allowed ? allowed.has(to) : false;
}
/**
 * EN: Detailed transition validation returning validity and explanation.
 * VI: Kiểm tra chi tiết bước chuyển trạng thái trả về tính hợp lệ và lý do giải thích.
 */
export function validateEventTransition(from, to) {
    if (from === to) {
        return { valid: true };
    }
    if (isEventTerminal(from)) {
        return {
            valid: false,
            reason: `Cannot transition from terminal event state "${from}" to "${to}".`,
        };
    }
    const allowed = VALID_EVENT_TRANSITIONS.get(from);
    if (!allowed || !allowed.has(to)) {
        return {
            valid: false,
            reason: `Illegal event state transition from "${from}" to "${to}". Allowed targets: [${allowed ? Array.from(allowed).join(', ') : 'none'}].`,
        };
    }
    return { valid: true };
}
/**
 * EN: Asserts valid transition, throwing a fail-closed error on illegal jumps.
 * VI: Khẳng định chuyển đổi hợp lệ, ném lỗi fail-closed nếu nhảy trạng thái trái phép.
 */
export function assertValidEventTransition(from, to) {
    const check = validateEventTransition(from, to);
    if (!check.valid) {
        throw new Error(`[SYNCHRONIZATION_TRANSITION_ERROR] ${check.reason}`);
    }
}
