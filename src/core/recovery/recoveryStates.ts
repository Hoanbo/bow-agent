// src/core/recovery/recoveryStates.ts
// BOWCON V4.0 — MILESTONE 1.3.16: BRAIN RECOVERY & CRASH CONSISTENCY ENGINE
//
// EN:
// Authoritative definitions and classification sets for Brain Recovery States.
// Manages the state machine during post-crash or restart state reconstruction.
//
// VI:
// Định nghĩa có thẩm quyền và các tập hợp phân loại cho các Trạng thái Phục hồi Não bộ.
// Quản lý máy trạng thái trong quá trình tái thiết lập trạng thái sau sự cố hoặc khởi động lại.

/**
 * EN: Strongly typed recovery states governing the state reconstruction pipeline.
 * VI: Các trạng thái phục hồi định kiểu mạnh chi phối pipeline tái thiết lập trạng thái.
 */
export type RecoveryState =
  | 'RECOVERY_REQUIRED'
  | 'RECOVERY_INSPECTING'
  | 'RECOVERY_RECONSTRUCTING'
  | 'RECOVERY_VALIDATING'
  | 'RECOVERY_RESUMABLE'
  | 'RECOVERY_BLOCKED'
  | 'RECOVERY_STOPPED'
  | 'RECOVERY_COMPLETED'
  | 'RECOVERY_FAILED';

/**
 * EN: Operational recovery states that actively progress through reconstruction.
 * VI: Các trạng thái phục hồi hoạt động lũy tiến qua quá trình tái thiết lập.
 */
export const RECOVERY_OPERATIONAL_STATES: ReadonlySet<RecoveryState> = Object.freeze(
  new Set<RecoveryState>([
    'RECOVERY_REQUIRED',
    'RECOVERY_INSPECTING',
    'RECOVERY_RECONSTRUCTING',
    'RECOVERY_VALIDATING',
    'RECOVERY_RESUMABLE',
  ]),
);

/**
 * EN: Terminal recovery states that strictly prohibit further state progression.
 * VI: Các trạng thái phục hồi kết thúc nghiêm cấm tiến trình tiếp theo.
 */
export const RECOVERY_TERMINAL_STATES: ReadonlySet<RecoveryState> = Object.freeze(
  new Set<RecoveryState>([
    'RECOVERY_COMPLETED',
    'RECOVERY_FAILED',
    'RECOVERY_BLOCKED',
    'RECOVERY_STOPPED',
  ]),
);

/**
 * EN: Blocked recovery states indicating uncertain, conflicting, or unrecoverable conditions.
 * VI: Các trạng thái phục hồi bị chặn cho biết điều kiện không chắc chắn, xung đột hoặc không thể phục hồi.
 */
export const RECOVERY_BLOCKED_STATES: ReadonlySet<RecoveryState> = Object.freeze(
  new Set<RecoveryState>([
    'RECOVERY_BLOCKED',
    'RECOVERY_FAILED',
  ]),
);

/**
 * EN: Checks if a recovery state is actively operational.
 * VI: Kiểm tra xem một trạng thái phục hồi có đang hoạt động hay không.
 */
export function isRecoveryOperationalState(state: RecoveryState): boolean {
  return RECOVERY_OPERATIONAL_STATES.has(state);
}

/**
 * EN: Checks if a recovery state is terminal.
 * VI: Kiểm tra xem một trạng thái phục hồi đã kết thúc hay chưa.
 */
export function isRecoveryTerminalState(state: RecoveryState): boolean {
  return RECOVERY_TERMINAL_STATES.has(state);
}

/**
 * EN: Checks if a recovery state is blocked.
 * VI: Kiểm tra xem một trạng thái phục hồi có bị chặn hay không.
 */
export function isRecoveryBlockedState(state: RecoveryState): boolean {
  return RECOVERY_BLOCKED_STATES.has(state);
}
