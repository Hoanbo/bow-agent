import type { CommitFailureCategory, CommitFailure } from './commitTypes.js';
/**
 * EN: Creates an immutable, secret-scrubbed CommitFailure descriptor.
 * VI: Tạo một bộ mô tả CommitFailure bất biến, đã được tẩy sạch bí mật.
 */
export declare function createCommitFailure(params: {
    userId: string;
    sessionId: string;
    category: CommitFailureCategory;
    message: string;
    recoverable?: boolean;
    details?: Readonly<Record<string, unknown>>;
}): Readonly<CommitFailure>;
