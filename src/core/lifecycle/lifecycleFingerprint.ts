// src/core/lifecycle/lifecycleFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.13: DETERMINISTIC LIFECYCLE FINGERPRINTING
//
// EN:
// Computes deterministic FNV-1a 32-bit hashes for states, transitions, checkpoints, and failures.
// Guarantees INV-STATE-11: 100% deterministic identity without random numbers or timestamps.
//
// VI:
// Tính toán mã băm FNV-1a 32-bit tất định cho trạng thái, chuyển đổi, checkpoint và lỗi.
// Bảo đảm INV-STATE-11: Định danh tất định 100% không dùng số ngẫu nhiên hoặc timestamp.

import type { LifecycleState, LifecycleStage, FailureCategory } from './lifecycleTypes.js';

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
 * EN: Computes deterministic fingerprint for an Agent Lifecycle State.
 * VI: Tính toán fingerprint tất định cho một Trạng thái Vòng đời Agent.
 */
export function computeStateFingerprint(
  userId: string,
  sessionId: string,
  state: LifecycleState,
  sequence: number,
  riskLevel?: string,
  correlationId?: string,
): string {
  return `state_${fnv1a32([
    userId,
    sessionId,
    state,
    String(sequence),
    riskLevel || 'NONE',
    correlationId || 'NONE',
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a state transition record.
 * VI: Tính toán fingerprint tất định cho bản ghi chuyển đổi trạng thái.
 */
export function computeTransitionFingerprint(
  userId: string,
  sessionId: string,
  from: LifecycleState,
  to: LifecycleState,
  sequence: number,
  reason?: string,
): string {
  return `transition_${fnv1a32([
    userId,
    sessionId,
    from,
    to,
    String(sequence),
    reason || 'NO_REASON',
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a lifecycle checkpoint.
 * VI: Tính toán fingerprint tất định cho một checkpoint vòng đời.
 */
export function computeCheckpointFingerprint(
  userId: string,
  sessionId: string,
  state: LifecycleState,
  sequence: number,
  correlationId?: string,
): string {
  return `checkpoint_${fnv1a32([
    userId,
    sessionId,
    state,
    String(sequence),
    correlationId || 'NONE',
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a failure event.
 * VI: Tính toán fingerprint tất định cho một sự kiện lỗi.
 */
export function computeFailureFingerprint(
  userId: string,
  sessionId: string,
  category: FailureCategory,
  stage: LifecycleStage,
  state: LifecycleState,
): string {
  return `failure_${fnv1a32([
    userId,
    sessionId,
    category,
    stage,
    state,
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for recovery metadata.
 * VI: Tính toán fingerprint tất định cho metadata phục hồi.
 */
export function computeRecoveryFingerprint(
  userId: string,
  sessionId: string,
  failedState: LifecycleState,
  recoveryState: LifecycleState,
  attemptNumber: number,
): string {
  return `recovery_${fnv1a32([
    userId,
    sessionId,
    failedState,
    recoveryState,
    String(attemptNumber),
  ])}`;
}
