import type { FailureCategory, FailureMetadata, LifecycleStage, LifecycleState } from './lifecycleTypes.js';
export interface CreateFailureParams {
    readonly userId: string;
    readonly sessionId: string;
    readonly category: FailureCategory;
    readonly message: string;
    readonly recoverable?: boolean;
    readonly stage: LifecycleStage;
    readonly state: LifecycleState;
    readonly timestamp?: number;
    readonly details?: Readonly<Record<string, unknown>>;
}
/**
 * EN: Creates an immutable, sanitized FailureMetadata descriptor.
 * VI: Tạo một bộ mô tả FailureMetadata bất biến và đã được khử trùng.
 */
export declare function createFailureMetadata(params: CreateFailureParams): FailureMetadata;
