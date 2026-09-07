import type { RollbackMetadata } from './commitTypes.js';
/**
 * EN: Creates an immutable RollbackMetadata descriptor.
 * VI: Tạo một bộ mô tả RollbackMetadata bất biến.
 */
export declare function createRollbackMetadata(params: {
    commitId: string;
    verificationId: string;
    affectedState: string;
    reason: string;
    eligible?: boolean;
    status?: 'ROLLBACK_PENDING' | 'ROLLED_BACK' | 'NOT_ELIGIBLE';
    timestamp?: string;
}): Readonly<RollbackMetadata>;
