import type { LifecycleState, LifecycleStage, FailureCategory } from './lifecycleTypes.js';
/**
 * EN: Computes deterministic fingerprint for an Agent Lifecycle State.
 * VI: Tính toán fingerprint tất định cho một Trạng thái Vòng đời Agent.
 */
export declare function computeStateFingerprint(userId: string, sessionId: string, state: LifecycleState, sequence: number, riskLevel?: string, correlationId?: string): string;
/**
 * EN: Computes deterministic fingerprint for a state transition record.
 * VI: Tính toán fingerprint tất định cho bản ghi chuyển đổi trạng thái.
 */
export declare function computeTransitionFingerprint(userId: string, sessionId: string, from: LifecycleState, to: LifecycleState, sequence: number, reason?: string): string;
/**
 * EN: Computes deterministic fingerprint for a lifecycle checkpoint.
 * VI: Tính toán fingerprint tất định cho một checkpoint vòng đời.
 */
export declare function computeCheckpointFingerprint(userId: string, sessionId: string, state: LifecycleState, sequence: number, correlationId?: string): string;
/**
 * EN: Computes deterministic fingerprint for a failure event.
 * VI: Tính toán fingerprint tất định cho một sự kiện lỗi.
 */
export declare function computeFailureFingerprint(userId: string, sessionId: string, category: FailureCategory, stage: LifecycleStage, state: LifecycleState): string;
/**
 * EN: Computes deterministic fingerprint for recovery metadata.
 * VI: Tính toán fingerprint tất định cho metadata phục hồi.
 */
export declare function computeRecoveryFingerprint(userId: string, sessionId: string, failedState: LifecycleState, recoveryState: LifecycleState, attemptNumber: number): string;
