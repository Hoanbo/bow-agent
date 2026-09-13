import { type AuditLedger } from '../auditLedger.js';
export interface DurableCommitGateContext {
    readonly taskId?: string;
    readonly tenantId?: string;
    readonly stepId?: string;
    readonly executionId?: string;
    readonly verificationId?: string;
    readonly commitId?: string;
}
export interface DurableCommitExecutionGateOptions {
    readonly isUserStopActive?: () => boolean;
    readonly getUserStopReason?: () => string | undefined;
    readonly auditLedger?: AuditLedger;
}
export declare class DurableCommitExecutionGate {
    private readonly isUserStopActiveFn;
    private readonly getUserStopReasonFn;
    private readonly auditLedger;
    constructor(options?: DurableCommitExecutionGateOptions);
    /**
     * EN: Returns whether USER_STOP is currently active.
     */
    isUserStopActive(): boolean;
    /**
     * EN: Returns the reason for the active USER_STOP signal.
     */
    getUserStopReason(): string | undefined;
    /**
     * EN: Checks USER_STOP status at a specific checkpoint.
     * Fails closed immediately if active by recording audit event and throwing CommitAbortedError.
     */
    private checkCheckpoint;
    /**
     * Gate 1: Before request acceptance.
     */
    assertGate1_RequestAcceptance(context?: DurableCommitGateContext): void;
    /**
     * Gate 2: Before reading/checking durable commit state / duplicate state.
     */
    assertGate2_StateRead(context?: DurableCommitGateContext): void;
    /**
     * Gate 3: Immediately before durable write.
     */
    assertGate3_PreWrite(context?: DurableCommitGateContext): void;
    /**
     * Gate 4: After write and before sealed result emission.
     */
    assertGate4_PostWrite(context?: DurableCommitGateContext): void;
}
export declare const globalDurableCommitExecutionGate: DurableCommitExecutionGate;
