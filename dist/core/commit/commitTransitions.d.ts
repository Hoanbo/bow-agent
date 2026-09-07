import type { CommitState } from './commitStates.js';
/**
 * EN: Explicit map of allowed target states for every commit lifecycle state.
 * VI: Bảng ánh xạ tường minh các trạng thái đích được phép đối với từng trạng thái vòng đời commit.
 */
export declare const VALID_COMMIT_TRANSITIONS: ReadonlyMap<CommitState, ReadonlySet<CommitState>>;
/**
 * EN: Checks whether a transition between two commit states is strictly legal.
 * VI: Kiểm tra xem việc chuyển đổi giữa hai trạng thái commit có hoàn toàn hợp lệ hay không.
 */
export declare function isValidCommitTransition(from: CommitState, to: CommitState): boolean;
/**
 * EN: Validates a commit transition and returns a structured validation outcome.
 * VI: Xác thực chuyển đổi commit và trả về kết quả cấu trúc.
 */
export declare function validateCommitTransition(from: CommitState, to: CommitState): {
    valid: boolean;
    reason?: string;
};
/**
 * EN: Asserts that a commit transition is valid, throwing an Error if illegal.
 * VI: Khẳng định chuyển đổi commit là hợp lệ, ném ra Error nếu bất hợp pháp.
 */
export declare function assertValidCommitTransition(from: CommitState, to: CommitState): void;
