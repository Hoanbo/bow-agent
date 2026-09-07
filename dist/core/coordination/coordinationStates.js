// src/core/coordination/coordinationStates.ts
// BOWCON V4.0 — MILESTONE 1.3.17: BRAIN COORDINATION & CONTINUITY STATES
//
// EN:
// Authoritative definitions and classification sets for Surface Status and Surface Types.
// Supports multi-surface presentation and embodiment surfaces for ONE central Brain.
//
// VI:
// Định nghĩa có thẩm quyền và các tập hợp phân loại cho Trạng thái Bề mặt và Loại Bề mặt.
// Hỗ trợ trình bày đa bề mặt và các bề mặt hiện thân cho MỘT Não bộ trung tâm duy nhất.
/**
 * EN: Surfaces that are actively receiving input or rendering output.
 * VI: Các bề mặt đang tích cực nhận đầu vào hoặc hiển thị đầu ra.
 */
export const SURFACE_ACTIVE_STATES = Object.freeze(new Set(['ACTIVE']));
/**
 * EN: Surfaces that are connected, healthy, and ready to accept activation or handoff.
 * VI: Các bề mặt đã kết nối, lành mạnh và sẵn sàng nhận kích hoạt hoặc handoff.
 */
export const SURFACE_AVAILABLE_STATES = Object.freeze(new Set(['AVAILABLE', 'ACTIVE', 'IDLE']));
/**
 * EN: Operational surface states representing non-terminal attachments.
 * VI: Các trạng thái bề mặt hoạt động đại diện cho các gắn kết chưa kết thúc.
 */
export const SURFACE_OPERATIONAL_STATES = Object.freeze(new Set([
    'REGISTERED',
    'ATTACHED',
    'AVAILABLE',
    'ACTIVE',
    'IDLE',
    'UNAVAILABLE',
    'DETACHING',
]));
/**
 * EN: Terminal surface states that cannot transition further without re-registration/re-attachment.
 * VI: Các trạng thái bề mặt kết thúc không thể chuyển đổi tiếp mà không đăng ký/gắn kết lại.
 */
export const SURFACE_TERMINAL_STATES = Object.freeze(new Set(['BLOCKED']));
/**
 * EN: Checks if a surface is actively engaged.
 * VI: Kiểm tra xem bề mặt có đang hoạt động tích cực hay không.
 */
export function isSurfaceActive(status) {
    return SURFACE_ACTIVE_STATES.has(status);
}
/**
 * EN: Checks if a surface is available for interaction or handoff.
 * VI: Kiểm tra xem bề mặt có sẵn sàng để tương tác hoặc nhận bàn giao hay không.
 */
export function isSurfaceAvailable(status) {
    return SURFACE_AVAILABLE_STATES.has(status);
}
/**
 * EN: Checks if a surface is in an operational (non-terminal) state.
 * VI: Kiểm tra xem bề mặt có đang ở trạng thái hoạt động (chưa kết thúc) hay không.
 */
export function isSurfaceOperational(status) {
    return SURFACE_OPERATIONAL_STATES.has(status);
}
/**
 * EN: Checks if a surface status is permanently terminal/blocked.
 * VI: Kiểm tra xem trạng thái bề mặt có phải là trạng thái kết thúc vĩnh viễn/bị khóa hay không.
 */
export function isSurfaceTerminal(status) {
    return SURFACE_TERMINAL_STATES.has(status);
}
