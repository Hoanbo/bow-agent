// src/core/commit/commitStates.ts
// BOWCON V4.0 — MILESTONE 1.3.15: COMMIT LIFECYCLE STATES & MATRIX
//
// EN:
// Strongly typed commit lifecycle states and state classification sets.
// Defines explicit progression: COMMIT_PREPARING -> COMMIT_VALIDATING -> COMMIT_READY -> COMMITTING -> COMMIT_CONFIRMED -> COMMIT_COMPLETE.
//
// VI:
// Các trạng thái vòng đời commit định kiểu chặt chẽ và tập phân loại trạng thái.
// Định nghĩa tiến trình tường minh: COMMIT_PREPARING -> COMMIT_VALIDATING -> COMMIT_READY -> COMMITTING -> COMMIT_CONFIRMED -> COMMIT_COMPLETE.
/**
 * EN: Operational progression states before terminal completion.
 * VI: Các trạng thái tiến trình vận hành trước khi kết thúc hoàn toàn.
 */
export const COMMIT_OPERATIONAL_STATES = Object.freeze(new Set([
    'COMMIT_PREPARING',
    'COMMIT_VALIDATING',
    'COMMIT_READY',
    'COMMITTING',
    'COMMIT_CONFIRMED',
    'ROLLBACK_PENDING',
]));
/**
 * EN: Terminal commit states with zero permitted outgoing operational transitions.
 * VI: Các trạng thái commit kết thúc tuyệt đối không cho phép chuyển trạng thái ra ngoài.
 */
export const COMMIT_TERMINAL_STATES = Object.freeze(new Set([
    'COMMIT_COMPLETE',
    'COMMIT_REJECTED',
    'ROLLED_BACK',
]));
/**
 * EN: Checks if a commit state is terminal.
 * VI: Kiểm tra xem trạng thái commit có phải là trạng thái kết thúc hay không.
 */
export function isCommitTerminalState(state) {
    return COMMIT_TERMINAL_STATES.has(state);
}
/**
 * EN: Checks if a commit state is operational.
 * VI: Kiểm tra xem trạng thái commit có thuộc tiến trình vận hành hay không.
 */
export function isCommitOperationalState(state) {
    return COMMIT_OPERATIONAL_STATES.has(state);
}
