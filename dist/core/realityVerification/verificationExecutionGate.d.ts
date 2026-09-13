export type VerificationGateCheckpoint = 'GATE_1_BEFORE_REQUEST_ACCEPTANCE' | 'GATE_2_BEFORE_EVIDENCE_COLLECTION' | 'GATE_3_BEFORE_ORACLE_EVALUATION' | 'GATE_4_BEFORE_RESULT_EMISSION';
export interface VerificationExecutionGateOptions {
    readonly isUserStopActive?: () => boolean;
    readonly getUserStopReason?: () => string | undefined;
}
export declare class VerificationExecutionGate {
    private readonly isUserStopActiveFn;
    private readonly getUserStopReasonFn;
    constructor(options?: VerificationExecutionGateOptions);
    /**
     * Evaluates USER_STOP at a specific verification checkpoint.
     * Throws VerificationAbortedError immediately if USER_STOP is active.
     */
    assertVerificationPermitted(checkpoint: VerificationGateCheckpoint, context?: Readonly<Record<string, unknown>>): void;
    /**
     * Returns whether USER_STOP is currently active without throwing.
     */
    isUserStopActive(): boolean;
    /**
     * Convenience checkpoint 1 assertion.
     */
    assertCanAcceptRequest(context?: Readonly<Record<string, unknown>>): void;
    /**
     * Convenience checkpoint 2 assertion.
     */
    assertCanCollectEvidence(context?: Readonly<Record<string, unknown>>): void;
    /**
     * Convenience checkpoint 3 assertion.
     */
    assertCanEvaluateOracle(context?: Readonly<Record<string, unknown>>): void;
    /**
     * Convenience checkpoint 4 assertion.
     */
    assertCanEmitResult(context?: Readonly<Record<string, unknown>>): void;
}
export declare const globalVerificationExecutionGate: VerificationExecutionGate;
