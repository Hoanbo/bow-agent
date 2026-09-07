import type { EventLifecycleState } from './eventStates.js';
/**
 * EN: Authoritative mapping of permitted event state transitions.
 * VI: Bản đồ có thẩm quyền về các bước chuyển trạng thái sự kiện được phép.
 */
export declare const VALID_EVENT_TRANSITIONS: ReadonlyMap<EventLifecycleState, ReadonlySet<EventLifecycleState>>;
/**
 * EN: Validates whether a transition from one event state to another is permitted.
 * VI: Kiểm tra xem bước chuyển trạng thái từ trạng thái này sang trạng thái khác có được phép không.
 */
export declare function isValidEventTransition(from: EventLifecycleState, to: EventLifecycleState): boolean;
/**
 * EN: Detailed transition validation returning validity and explanation.
 * VI: Kiểm tra chi tiết bước chuyển trạng thái trả về tính hợp lệ và lý do giải thích.
 */
export declare function validateEventTransition(from: EventLifecycleState, to: EventLifecycleState): {
    valid: boolean;
    reason?: string;
};
/**
 * EN: Asserts valid transition, throwing a fail-closed error on illegal jumps.
 * VI: Khẳng định chuyển đổi hợp lệ, ném lỗi fail-closed nếu nhảy trạng thái trái phép.
 */
export declare function assertValidEventTransition(from: EventLifecycleState, to: EventLifecycleState): void;
