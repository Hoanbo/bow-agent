// src/core/coordination/coordinationTransitions.ts
// BOWCON V4.0 — MILESTONE 1.3.17: SURFACE TRANSITIONS & VALIDATION
//
// EN:
// Authoritative transition matrix and predicates for presentation/embodiment surfaces.
// Strictly guards surface lifecycle progression and prevents arbitrary or unmanaged state jumps.
//
// VI:
// Ma trận chuyển đổi và các vị từ có thẩm quyền cho các bề mặt trình bày/hiện thân.
// Thực thi nghiêm ngặt tiến trình vòng đời bề mặt và ngăn chặn các bước nhảy trạng thái tùy tiện.
import { isSurfaceTerminal } from './coordinationStates.js';
/**
 * EN: Authoritative transition map defining valid destinations for each surface status.
 * VI: Bản đồ chuyển đổi có thẩm quyền xác định các đích hợp lệ cho từng trạng thái bề mặt.
 */
export const VALID_SURFACE_TRANSITIONS = Object.freeze({
    REGISTERED: Object.freeze(['ATTACHED', 'BLOCKED', 'FAILED']),
    ATTACHED: Object.freeze(['AVAILABLE', 'DETACHING', 'DETACHED', 'FAILED']),
    AVAILABLE: Object.freeze(['ACTIVE', 'IDLE', 'UNAVAILABLE', 'DETACHING', 'DETACHED', 'FAILED']),
    ACTIVE: Object.freeze(['AVAILABLE', 'IDLE', 'UNAVAILABLE', 'DETACHING', 'DETACHED', 'FAILED']),
    IDLE: Object.freeze(['AVAILABLE', 'ACTIVE', 'UNAVAILABLE', 'DETACHING', 'DETACHED', 'FAILED']),
    UNAVAILABLE: Object.freeze(['AVAILABLE', 'ATTACHED', 'DETACHING', 'DETACHED', 'FAILED']),
    DETACHING: Object.freeze(['DETACHED', 'FAILED']),
    DETACHED: Object.freeze(['ATTACHED', 'FAILED']),
    FAILED: Object.freeze(['REGISTERED', 'ATTACHED']),
    BLOCKED: Object.freeze([]),
});
/**
 * EN: Checks if a requested transition between surface states is valid.
 * VI: Kiểm tra xem một chuyển đổi yêu cầu giữa các trạng thái bề mặt có hợp lệ hay không.
 */
export function isValidSurfaceTransition(from, to) {
    if (isSurfaceTerminal(from)) {
        return false;
    }
    const allowed = VALID_SURFACE_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
}
/**
 * EN: Validates a surface transition and returns structured result.
 * VI: Xác thực một chuyển đổi bề mặt và trả về kết quả có cấu trúc.
 */
export function validateSurfaceTransition(from, to) {
    if (isSurfaceTerminal(from)) {
        return {
            valid: false,
            error: `TERMINAL_SURFACE_LOCKED: Cannot transition from terminal surface state "${from}" to "${to}"`,
        };
    }
    if (!isValidSurfaceTransition(from, to)) {
        return {
            valid: false,
            error: `INVALID_SURFACE_TRANSITION: Transition from "${from}" to "${to}" is not permitted by authoritative matrix`,
        };
    }
    return { valid: true };
}
/**
 * EN: Asserts that a surface transition is valid, throwing an error if rejected.
 * VI: Khẳng định rằng chuyển đổi bề mặt là hợp lệ, ném ngoại lệ nếu bị từ chối.
 */
export function assertValidSurfaceTransition(from, to) {
    const result = validateSurfaceTransition(from, to);
    if (!result.valid) {
        throw new Error(result.error || 'INVALID_SURFACE_TRANSITION');
    }
}
