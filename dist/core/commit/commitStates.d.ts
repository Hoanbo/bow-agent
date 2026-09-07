/**
 * EN: Authoritative commit lifecycle states.
 * VI: Các trạng thái vòng đời commit có thẩm quyền.
 */
export type CommitState = 'COMMIT_PREPARING' | 'COMMIT_VALIDATING' | 'COMMIT_READY' | 'COMMITTING' | 'COMMIT_CONFIRMED' | 'COMMIT_COMPLETE' | 'COMMIT_FAILED' | 'COMMIT_REJECTED' | 'ROLLBACK_PENDING' | 'ROLLED_BACK';
/**
 * EN: Operational progression states before terminal completion.
 * VI: Các trạng thái tiến trình vận hành trước khi kết thúc hoàn toàn.
 */
export declare const COMMIT_OPERATIONAL_STATES: ReadonlySet<CommitState>;
/**
 * EN: Terminal commit states with zero permitted outgoing operational transitions.
 * VI: Các trạng thái commit kết thúc tuyệt đối không cho phép chuyển trạng thái ra ngoài.
 */
export declare const COMMIT_TERMINAL_STATES: ReadonlySet<CommitState>;
/**
 * EN: Checks if a commit state is terminal.
 * VI: Kiểm tra xem trạng thái commit có phải là trạng thái kết thúc hay không.
 */
export declare function isCommitTerminalState(state: CommitState): boolean;
/**
 * EN: Checks if a commit state is operational.
 * VI: Kiểm tra xem trạng thái commit có thuộc tiến trình vận hành hay không.
 */
export declare function isCommitOperationalState(state: CommitState): boolean;
