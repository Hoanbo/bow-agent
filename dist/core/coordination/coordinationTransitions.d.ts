import type { SurfaceStatus } from './coordinationStates.js';
/**
 * EN: Authoritative transition map defining valid destinations for each surface status.
 * VI: Bản đồ chuyển đổi có thẩm quyền xác định các đích hợp lệ cho từng trạng thái bề mặt.
 */
export declare const VALID_SURFACE_TRANSITIONS: Readonly<Record<SurfaceStatus, readonly SurfaceStatus[]>>;
/**
 * EN: Checks if a requested transition between surface states is valid.
 * VI: Kiểm tra xem một chuyển đổi yêu cầu giữa các trạng thái bề mặt có hợp lệ hay không.
 */
export declare function isValidSurfaceTransition(from: SurfaceStatus, to: SurfaceStatus): boolean;
/**
 * EN: Validates a surface transition and returns structured result.
 * VI: Xác thực một chuyển đổi bề mặt và trả về kết quả có cấu trúc.
 */
export declare function validateSurfaceTransition(from: SurfaceStatus, to: SurfaceStatus): {
    valid: boolean;
    error?: string;
};
/**
 * EN: Asserts that a surface transition is valid, throwing an error if rejected.
 * VI: Khẳng định rằng chuyển đổi bề mặt là hợp lệ, ném ngoại lệ nếu bị từ chối.
 */
export declare function assertValidSurfaceTransition(from: SurfaceStatus, to: SurfaceStatus): void;
