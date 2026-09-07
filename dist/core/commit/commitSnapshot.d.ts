import type { PreCommitSnapshot, PostCommitSnapshot } from './commitTypes.js';
/**
 * EN: Creates an immutable PreCommitSnapshot representing state immediately before commit execution.
 * VI: Tạo một PreCommitSnapshot bất biến đại diện cho trạng thái ngay trước khi thực thi commit.
 */
export declare function createPreCommitSnapshot(params: {
    userId: string;
    sessionId: string;
    currentState: string;
    sequence: number;
    correlationId?: string;
    decisionId?: string;
    executionId?: string;
    verificationId: string;
    verificationFingerprint: string;
    metadata?: Readonly<Record<string, unknown>>;
    timestamp?: string;
}): Readonly<PreCommitSnapshot>;
/**
 * EN: Creates an immutable PostCommitSnapshot representing state after commit persistence.
 * VI: Tạo một PostCommitSnapshot bất biến đại diện cho trạng thái sau khi lưu trữ commit.
 */
export declare function createPostCommitSnapshot(params: {
    userId: string;
    sessionId: string;
    committedState: string;
    sequence: number;
    commitId: string;
    appliedOperations: readonly string[];
    metadata?: Readonly<Record<string, unknown>>;
    timestamp?: string;
}): Readonly<PostCommitSnapshot>;
