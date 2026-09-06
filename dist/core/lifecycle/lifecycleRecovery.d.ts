import type { LifecycleState, RecoveryMetadata } from './lifecycleTypes.js';
export interface CreateRecoveryParams {
    readonly userId: string;
    readonly sessionId: string;
    readonly recoverable: boolean;
    readonly failedState: LifecycleState;
    readonly recoveryState: LifecycleState;
    readonly attemptNumber?: number;
    readonly maxAttempts?: number;
    readonly retryReason?: string;
    readonly previousFingerprint?: string;
}
/**
 * EN: Creates an immutable RecoveryMetadata descriptor.
 * VI: Tạo một bộ mô tả RecoveryMetadata bất biến.
 */
export declare function createRecoveryMetadata(params: CreateRecoveryParams): RecoveryMetadata;
