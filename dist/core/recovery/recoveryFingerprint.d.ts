import type { RecoveryState, CrashConsistencyCondition, InterruptedOperationClassification, RecoveryDecision, RecoveryFailureCategory, RecoveryJournalEventType } from './recoveryTypes.js';
/**
 * EN: Computes deterministic recovery ID.
 * VI: Tính toán ID phục hồi tất định.
 */
export declare function computeRecoveryId(userId: string, sessionId: string, checkpointId?: string, requestId?: string): string;
/**
 * EN: Computes deterministic fingerprint for an entire recovery result.
 * VI: Tính toán fingerprint tất định cho toàn bộ kết quả phục hồi.
 */
export declare function computeCrashRecoveryFingerprint(userId: string, sessionId: string, recoveryId: string, state: RecoveryState, decision: RecoveryDecision, classification: InterruptedOperationClassification): string;
export { computeCrashRecoveryFingerprint as computeRecoveryResultFingerprint };
/**
 * EN: Computes deterministic fingerprint for a reconstructed state.
 * VI: Tính toán fingerprint tất định cho trạng thái được tái thiết lập.
 */
export declare function computeReconstructedStateFingerprint(userId: string, sessionId: string, lifecycleState: string, sequence: number, crashCondition: CrashConsistencyCondition, classification: InterruptedOperationClassification, riskLevel: string): string;
/**
 * EN: Computes deterministic fingerprint for the Last Known Good State.
 * VI: Tính toán fingerprint tất định cho Trạng thái Tốt được Biết Cuối cùng.
 */
export declare function computeLastKnownGoodStateFingerprint(userId: string, sessionId: string, checkpointId: string, sequence: number, lifecycleState: string): string;
/**
 * EN: Computes deterministic fingerprint for a recovery journal record.
 * VI: Tính toán fingerprint tất định cho một bản ghi nhật ký phục hồi.
 */
export declare function computeRecoveryJournalFingerprint(recoveryId: string, eventType: RecoveryJournalEventType, sequence: number, state: RecoveryState): string;
/**
 * EN: Computes deterministic fingerprint for a recovery failure descriptor.
 * VI: Tính toán fingerprint tất định cho bộ mô tả sự cố phục hồi.
 */
export declare function computeRecoveryFailureFingerprint(category: RecoveryFailureCategory, message: string, userId: string, sessionId: string): string;
