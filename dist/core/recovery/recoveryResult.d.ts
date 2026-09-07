import type { RecoveryResult, ReconstructedState, RecoveryFailure, RecoveryState, RecoveryDecision, InterruptedOperationClassification, CrashConsistencyCondition, LastKnownGoodState, RecoveryJournalRecord, RecoveryFailureCategory } from './recoveryTypes.js';
/**
 * EN: Creates an immutable RecoveryFailure descriptor with secret redaction.
 * VI: Tạo một bộ mô tả sự cố RecoveryFailure bất biến với cơ chế che giấu bí mật.
 */
export declare function createRecoveryFailure(category: RecoveryFailureCategory, rawMessage: string, userId: string, sessionId: string, recoverable?: boolean, details?: Readonly<Record<string, unknown>>): RecoveryFailure;
/**
 * EN: Creates a deeply immutable RecoveryResult object.
 * VI: Tạo một đối tượng RecoveryResult bất biến sâu.
 */
export declare function createRecoveryResult(recoveryId: string, userId: string, sessionId: string, state: RecoveryState, decision: RecoveryDecision, classification: InterruptedOperationClassification, crashCondition: CrashConsistencyCondition, reconstructedState: ReconstructedState, lastKnownGoodState: LastKnownGoodState | null, journal: readonly RecoveryJournalRecord[], failure?: RecoveryFailure): RecoveryResult;
