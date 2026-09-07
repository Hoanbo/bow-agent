// src/core/commit/commitFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.15: DETERMINISTIC COMMIT FINGERPRINTING
//
// EN:
// Computes deterministic FNV-1a 32-bit hashes for commit identities, plans, snapshots, and rollback records.
// Guarantees 100% deterministic identity without random numbers or timestamps.
//
// VI:
// Tính toán mã băm FNV-1a 32-bit tất định cho định danh commit, kế hoạch, snapshot và bản ghi rollback.
// Bảo đảm định danh tất định 100% không dùng số ngẫu nhiên hoặc timestamp.

import type { CommitFailureCategory, ConsistencyIssueType } from './commitTypes.js';

/**
 * EN: Computes a 32-bit FNV-1a hash over an array of normalized string tokens.
 * VI: Tính toán mã băm FNV-1a 32-bit trên một mảng các token chuỗi chuẩn hóa.
 */
function fnv1a32(tokens: readonly string[]): string {
  const payload = tokens.join('::');
  let hash = 2166136261;
  for (let i = 0; i < payload.length; i++) {
    hash = Math.imul(hash ^ payload.charCodeAt(i), 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * EN: Computes deterministic fingerprint for an entire commit transaction.
 * VI: Tính toán fingerprint tất định cho toàn bộ giao dịch commit.
 */
export function computeCommitFingerprint(
  userId: string,
  sessionId: string,
  verificationId: string,
  operationsHash: string,
  riskLevel?: string,
  requestId?: string,
): string {
  return `commit_${fnv1a32([
    userId,
    sessionId,
    verificationId,
    operationsHash,
    riskLevel || 'LOW',
    requestId || 'NONE',
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a pre-commit snapshot.
 * VI: Tính toán fingerprint tất định cho snapshot trước commit.
 */
export function computePreCommitSnapshotFingerprint(
  userId: string,
  sessionId: string,
  currentState: string,
  sequence: number,
  verificationFingerprint: string,
): string {
  return `presnap_${fnv1a32([
    userId,
    sessionId,
    currentState,
    String(sequence),
    verificationFingerprint,
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a post-commit snapshot.
 * VI: Tính toán fingerprint tất định cho snapshot sau commit.
 */
export function computePostCommitSnapshotFingerprint(
  userId: string,
  sessionId: string,
  committedState: string,
  sequence: number,
  commitId: string,
): string {
  return `postsnap_${fnv1a32([
    userId,
    sessionId,
    committedState,
    String(sequence),
    commitId,
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a consistency validation outcome.
 * VI: Tính toán fingerprint tất định cho kết quả kiểm tra tính nhất quán.
 */
export function computeCommitConsistencyFingerprint(
  consistent: boolean,
  issues: readonly ConsistencyIssueType[],
): string {
  return `cons_${fnv1a32([
    consistent ? 'TRUE' : 'FALSE',
    issues.slice().sort().join('|'),
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a commit failure descriptor.
 * VI: Tính toán fingerprint tất định cho bộ mô tả lỗi commit.
 */
export function computeCommitFailureFingerprint(
  userId: string,
  sessionId: string,
  category: CommitFailureCategory,
  message: string,
): string {
  return `comfail_${fnv1a32([userId, sessionId, category, message])}`;
}

/**
 * EN: Computes deterministic fingerprint for rollback metadata.
 * VI: Tính toán fingerprint tất định cho metadata rollback.
 */
export function computeRollbackFingerprint(
  commitId: string,
  verificationId: string,
  reason: string,
): string {
  return `roll_${fnv1a32([commitId, verificationId, reason])}`;
}
