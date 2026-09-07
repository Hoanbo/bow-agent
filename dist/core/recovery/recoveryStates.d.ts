/**
 * EN: Strongly typed recovery states governing the state reconstruction pipeline.
 * VI: Các trạng thái phục hồi định kiểu mạnh chi phối pipeline tái thiết lập trạng thái.
 */
export type RecoveryState = 'RECOVERY_REQUIRED' | 'RECOVERY_INSPECTING' | 'RECOVERY_RECONSTRUCTING' | 'RECOVERY_VALIDATING' | 'RECOVERY_RESUMABLE' | 'RECOVERY_BLOCKED' | 'RECOVERY_STOPPED' | 'RECOVERY_COMPLETED' | 'RECOVERY_FAILED';
/**
 * EN: Operational recovery states that actively progress through reconstruction.
 * VI: Các trạng thái phục hồi hoạt động lũy tiến qua quá trình tái thiết lập.
 */
export declare const RECOVERY_OPERATIONAL_STATES: ReadonlySet<RecoveryState>;
/**
 * EN: Terminal recovery states that strictly prohibit further state progression.
 * VI: Các trạng thái phục hồi kết thúc nghiêm cấm tiến trình tiếp theo.
 */
export declare const RECOVERY_TERMINAL_STATES: ReadonlySet<RecoveryState>;
/**
 * EN: Blocked recovery states indicating uncertain, conflicting, or unrecoverable conditions.
 * VI: Các trạng thái phục hồi bị chặn cho biết điều kiện không chắc chắn, xung đột hoặc không thể phục hồi.
 */
export declare const RECOVERY_BLOCKED_STATES: ReadonlySet<RecoveryState>;
/**
 * EN: Checks if a recovery state is actively operational.
 * VI: Kiểm tra xem một trạng thái phục hồi có đang hoạt động hay không.
 */
export declare function isRecoveryOperationalState(state: RecoveryState): boolean;
/**
 * EN: Checks if a recovery state is terminal.
 * VI: Kiểm tra xem một trạng thái phục hồi đã kết thúc hay chưa.
 */
export declare function isRecoveryTerminalState(state: RecoveryState): boolean;
/**
 * EN: Checks if a recovery state is blocked.
 * VI: Kiểm tra xem một trạng thái phục hồi có bị chặn hay không.
 */
export declare function isRecoveryBlockedState(state: RecoveryState): boolean;
