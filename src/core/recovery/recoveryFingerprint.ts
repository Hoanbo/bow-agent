// src/core/recovery/recoveryFingerprint.ts
// BOWCON V4.0 — MILESTONE 1.3.16: DETERMINISTIC RECOVERY FINGERPRINTING
//
// EN:
// Computes deterministic FNV-1a 32-bit hashes for recovery identities, reconstructed states,
// Last Known Good State, journals, and failures. Guarantees 100% deterministic identity without
// random numbers or timestamps.
//
// VI:
// Tính toán mã băm FNV-1a 32-bit tất định cho định danh phục hồi, trạng thái tái thiết lập,
// Trạng thái Tốt được Biết Cuối cùng, nhật ký và sự cố. Bảo đảm định danh tất định 100%
// không dùng số ngẫu nhiên hoặc timestamp.

import type {
  RecoveryState,
  CrashConsistencyCondition,
  InterruptedOperationClassification,
  RecoveryDecision,
  RecoveryFailureCategory,
  RecoveryJournalEventType,
} from './recoveryTypes.js';

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
 * EN: Computes deterministic recovery ID.
 * VI: Tính toán ID phục hồi tất định.
 */
export function computeRecoveryId(
  userId: string,
  sessionId: string,
  checkpointId?: string,
  requestId?: string,
): string {
  return `recovery_${fnv1a32([
    userId,
    sessionId,
    checkpointId || 'NO_CHECKPOINT',
    requestId || 'NO_REQUEST',
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for an entire recovery result.
 * VI: Tính toán fingerprint tất định cho toàn bộ kết quả phục hồi.
 */
export function computeCrashRecoveryFingerprint(
  userId: string,
  sessionId: string,
  recoveryId: string,
  state: RecoveryState,
  decision: RecoveryDecision,
  classification: InterruptedOperationClassification,
): string {
  return `recfp_${fnv1a32([
    userId,
    sessionId,
    recoveryId,
    state,
    decision,
    classification,
  ])}`;
}

export { computeCrashRecoveryFingerprint as computeRecoveryResultFingerprint };

/**
 * EN: Computes deterministic fingerprint for a reconstructed state.
 * VI: Tính toán fingerprint tất định cho trạng thái được tái thiết lập.
 */
export function computeReconstructedStateFingerprint(
  userId: string,
  sessionId: string,
  lifecycleState: string,
  sequence: number,
  crashCondition: CrashConsistencyCondition,
  classification: InterruptedOperationClassification,
  riskLevel: string,
): string {
  return `reconst_${fnv1a32([
    userId,
    sessionId,
    lifecycleState,
    sequence.toString(),
    crashCondition,
    classification,
    riskLevel,
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for the Last Known Good State.
 * VI: Tính toán fingerprint tất định cho Trạng thái Tốt được Biết Cuối cùng.
 */
export function computeLastKnownGoodStateFingerprint(
  userId: string,
  sessionId: string,
  checkpointId: string,
  sequence: number,
  lifecycleState: string,
): string {
  return `lkgs_${fnv1a32([
    userId,
    sessionId,
    checkpointId,
    sequence.toString(),
    lifecycleState,
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a recovery journal record.
 * VI: Tính toán fingerprint tất định cho một bản ghi nhật ký phục hồi.
 */
export function computeRecoveryJournalFingerprint(
  recoveryId: string,
  eventType: RecoveryJournalEventType,
  sequence: number,
  state: RecoveryState,
): string {
  return `recjrnl_${fnv1a32([
    recoveryId,
    eventType,
    sequence.toString(),
    state,
  ])}`;
}

/**
 * EN: Computes deterministic fingerprint for a recovery failure descriptor.
 * VI: Tính toán fingerprint tất định cho bộ mô tả sự cố phục hồi.
 */
export function computeRecoveryFailureFingerprint(
  category: RecoveryFailureCategory,
  message: string,
  userId: string,
  sessionId: string,
): string {
  return `recfail_${fnv1a32([
    category,
    message,
    userId,
    sessionId,
  ])}`;
}
