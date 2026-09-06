// src/core/lifecycle/lifecycleStates.ts
// BOWCON V4.0 — MILESTONE 1.3.13: AGENT LIFECYCLE STATES & CATEGORIZATION
//
// EN:
// Authoritative sets and categorization helpers for Agent Lifecycle States.
// Distinguishes active operational flows from terminal, blocked, and recovery states.
//
// VI:
// Các tập hợp có thẩm quyền và hàm bổ trợ phân loại cho các Trạng thái Vòng đời Agent.
// Phân biệt luồng hoạt động tích cực với các trạng thái kết thúc, bị chặn và phục hồi.
/**
 * EN: Operational lifecycle states representing progressive agent processing stages.
 * VI: Các trạng thái vòng đời hoạt động thể hiện các giai đoạn xử lý lũy tiến của agent.
 */
export const OPERATIONAL_STATES = Object.freeze(new Set([
    'INITIALIZING',
    'READY',
    'RECEIVING',
    'CONTEXT_LOADING',
    'UNDERSTANDING',
    'PLANNING',
    'DECIDING',
    'ORCHESTRATING',
    'AWAITING_APPROVAL',
    'EXECUTING',
    'VERIFYING',
    'COMMITTING',
    'RESPONDING',
    'VOICE_PENDING',
    'COMPLETED',
]));
/**
 * EN: Terminal lifecycle states that strictly forbid further progression without controlled restart.
 * VI: Các trạng thái vòng đời kết thúc nghiêm cấm tiến trình tiếp theo nếu không khởi động lại có kiểm soát.
 */
export const TERMINAL_STATES = Object.freeze(new Set([
    'COMPLETED',
    'REJECTED',
    'BLOCKED',
    'CANCELLED',
    'NO_ACTION',
]));
/**
 * EN: Controlled exit and exception states representing non-standard or branched execution paths.
 * VI: Các trạng thái thoát có kiểm soát và ngoại lệ đại diện cho các nhánh thực thi phi chuẩn.
 */
export const CONTROLLED_EXIT_STATES = Object.freeze(new Set([
    'NO_ACTION',
    'CLARIFICATION_REQUIRED',
    'DEFERRED',
    'BLOCKED',
    'REJECTED',
    'FAILED',
    'RECOVERABLE',
    'RECOVERY_PENDING',
    'CANCELLED',
]));
/**
 * EN: Determines whether a state is terminal.
 * VI: Kiểm tra xem một trạng thái có phải là trạng thái kết thúc hay không.
 */
export function isTerminalState(state) {
    return TERMINAL_STATES.has(state);
}
/**
 * EN: Determines whether a state is an active operational state.
 * VI: Kiểm tra xem một trạng thái có phải là trạng thái hoạt động tích cực hay không.
 */
export function isOperationalState(state) {
    return OPERATIONAL_STATES.has(state);
}
/**
 * EN: Determines whether a state is a controlled exit state.
 * VI: Kiểm tra xem một trạng thái có phải là trạng thái thoát có kiểm soát hay không.
 */
export function isControlledExitState(state) {
    return CONTROLLED_EXIT_STATES.has(state);
}
/**
 * EN: Maps an authoritative lifecycle state to its corresponding high-level stage.
 * VI: Ánh xạ một trạng thái vòng đời có thẩm quyền sang giai đoạn cấp cao tương ứng.
 */
export function mapStateToStage(state) {
    switch (state) {
        case 'INITIALIZING':
        case 'READY':
            return 'INITIALIZATION';
        case 'RECEIVING':
        case 'CONTEXT_LOADING':
            return 'CONTEXT';
        case 'UNDERSTANDING':
            return 'INTENT';
        case 'PLANNING':
            return 'PLANNING';
        case 'DECIDING':
            return 'DECISION';
        case 'ORCHESTRATING':
            return 'ORCHESTRATION';
        case 'AWAITING_APPROVAL':
            return 'APPROVAL';
        case 'EXECUTING':
            return 'EXECUTION';
        case 'VERIFYING':
            return 'VERIFICATION';
        case 'COMMITTING':
            return 'COMMIT';
        case 'RESPONDING':
            return 'RESPONSE';
        case 'VOICE_PENDING':
            return 'VOICE';
        case 'COMPLETED':
        case 'NO_ACTION':
        case 'CLARIFICATION_REQUIRED':
        case 'DEFERRED':
        case 'BLOCKED':
        case 'REJECTED':
        case 'FAILED':
        case 'RECOVERABLE':
        case 'RECOVERY_PENDING':
        case 'CANCELLED':
            return 'TERMINAL';
    }
}
