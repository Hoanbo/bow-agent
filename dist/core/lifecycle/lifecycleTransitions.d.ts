import type { LifecycleState, TransitionValidationResult } from './lifecycleTypes.js';
/**
 * EN: Explicit map of allowed target states for every lifecycle state.
 * VI: Bảng ánh xạ tường minh các trạng thái đích được phép đối với từng trạng thái vòng đời.
 */
export declare const VALID_TRANSITIONS: ReadonlyMap<LifecycleState, ReadonlySet<LifecycleState>>;
/**
 * EN: Checks whether a transition between two states is strictly legal.
 * VI: Kiểm tra xem việc chuyển đổi giữa hai trạng thái có hoàn toàn hợp lệ hay không.
 */
export declare function isValidTransition(from: LifecycleState, to: LifecycleState): boolean;
/**
 * EN: Validates a requested transition and returns a structured validation result.
 * VI: Xác thực một yêu cầu chuyển trạng thái và trả về kết quả có cấu trúc.
 */
export declare function validateStateTransition(from: LifecycleState, to: LifecycleState): TransitionValidationResult;
/**
 * EN: Asserts that a state transition is valid, throwing an explicit Error if illegal.
 * VI: Khẳng định rằng chuyển trạng thái là hợp lệ, ném ngoại lệ tường minh nếu không hợp lệ.
 */
export declare function assertValidTransition(from: LifecycleState, to: LifecycleState, reason?: string): void;
