import type { RecoveryState } from './recoveryStates.js';
/**
 * EN: Authoritative transition map defining valid destinations for each recovery state.
 * VI: Bản đồ chuyển đổi có thẩm quyền xác định các đích hợp lệ cho từng trạng thái phục hồi.
 */
export declare const VALID_RECOVERY_TRANSITIONS: Readonly<Record<RecoveryState, readonly RecoveryState[]>>;
/**
 * EN: Checks if a requested transition between recovery states is mathematically valid.
 * VI: Kiểm tra xem một chuyển đổi yêu cầu giữa các trạng thái phục hồi có hợp lệ về mặt toán học hay không.
 */
export declare function isValidRecoveryTransition(from: RecoveryState, to: RecoveryState): boolean;
/**
 * EN: Validates a recovery transition and returns a structured validation result.
 * VI: Xác thực một chuyển đổi phục hồi và trả về kết quả xác thực có cấu trúc.
 */
export declare function validateRecoveryTransition(from: RecoveryState, to: RecoveryState): {
    valid: boolean;
    error?: string;
};
/**
 * EN: Asserts that a recovery transition is valid, throwing an error if rejected.
 * VI: Khẳng định rằng chuyển đổi phục hồi là hợp lệ, ném ngoại lệ nếu bị từ chối.
 */
export declare function assertValidRecoveryTransition(from: RecoveryState, to: RecoveryState): void;
