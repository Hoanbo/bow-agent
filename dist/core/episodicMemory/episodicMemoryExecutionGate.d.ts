import { type AuditLedger } from '../auditLedger.js';
export interface EpisodicMemoryGateContext {
    readonly taskId?: string;
    readonly tenantId?: string;
    readonly stepId?: string;
    readonly executionId?: string;
    readonly commitId?: string;
    readonly memoryId?: string;
}
export interface EpisodicMemoryExecutionGateOptions {
    readonly isUserStopActive?: () => boolean;
    readonly getUserStopReason?: () => string | undefined;
    readonly auditLedger?: AuditLedger;
}
export declare class EpisodicMemoryExecutionGate {
    private readonly isUserStopActiveFn;
    private readonly getUserStopReasonFn;
    private readonly auditLedger;
    constructor(options?: EpisodicMemoryExecutionGateOptions);
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
     * Fails closed immediately if active by recording audit event and throwing MemoryAbortedError.
     */
    private checkCheckpoint;
    /**
     * Gate 1: Before accepting the memory mutation request.
     */
    assertGate1_RequestAcceptance(context?: EpisodicMemoryGateContext): void;
    /**
     * Gate 2: Before reading/checking persistence / duplicate state.
     */
    assertGate2_StateRead(context?: EpisodicMemoryGateContext): void;
    /**
     * Gate 3: Immediately before durable memory write.
     */
    assertGate3_PreWrite(context?: EpisodicMemoryGateContext): void;
    /**
     * Gate 4: After write and before emitting the final result.
     */
    assertGate4_PostWrite(context?: EpisodicMemoryGateContext): void;
}
export declare const globalEpisodicMemoryExecutionGate: EpisodicMemoryExecutionGate;
