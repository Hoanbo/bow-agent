import type { CommitFailureCategory, ConsistencyIssueType } from './commitTypes.js';
/**
 * EN: Computes deterministic fingerprint for an entire commit transaction.
 * VI: Tính toán fingerprint tất định cho toàn bộ giao dịch commit.
 */
export declare function computeCommitFingerprint(userId: string, sessionId: string, verificationId: string, operationsHash: string, riskLevel?: string, requestId?: string): string;
/**
 * EN: Computes deterministic fingerprint for a pre-commit snapshot.
 * VI: Tính toán fingerprint tất định cho snapshot trước commit.
 */
export declare function computePreCommitSnapshotFingerprint(userId: string, sessionId: string, currentState: string, sequence: number, verificationFingerprint: string): string;
/**
 * EN: Computes deterministic fingerprint for a post-commit snapshot.
 * VI: Tính toán fingerprint tất định cho snapshot sau commit.
 */
export declare function computePostCommitSnapshotFingerprint(userId: string, sessionId: string, committedState: string, sequence: number, commitId: string): string;
/**
 * EN: Computes deterministic fingerprint for a consistency validation outcome.
 * VI: Tính toán fingerprint tất định cho kết quả kiểm tra tính nhất quán.
 */
export declare function computeCommitConsistencyFingerprint(consistent: boolean, issues: readonly ConsistencyIssueType[]): string;
/**
 * EN: Computes deterministic fingerprint for a commit failure descriptor.
 * VI: Tính toán fingerprint tất định cho bộ mô tả lỗi commit.
 */
export declare function computeCommitFailureFingerprint(userId: string, sessionId: string, category: CommitFailureCategory, message: string): string;
/**
 * EN: Computes deterministic fingerprint for rollback metadata.
 * VI: Tính toán fingerprint tất định cho metadata rollback.
 */
export declare function computeRollbackFingerprint(commitId: string, verificationId: string, reason: string): string;
