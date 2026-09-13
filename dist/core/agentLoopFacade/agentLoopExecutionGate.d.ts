import { type AuditLedger } from '../auditLedger.js';
export interface AgentLoopGateContext {
    readonly taskId?: string;
    readonly tenantId?: string;
    readonly stepId?: string;
    readonly iteration?: number;
    readonly phase?: string;
}
export interface AgentLoopExecutionGateOptions {
    readonly isUserStopActive?: () => boolean;
    readonly getUserStopReason?: () => string | undefined;
    readonly auditLedger?: AuditLedger;
}
export declare class AgentLoopExecutionGate {
    private readonly isUserStopActiveFn;
    private readonly getUserStopReasonFn;
    private readonly auditLedger;
    constructor(options?: AgentLoopExecutionGateOptions);
    /**
     * EN: Returns whether USER_STOP is currently active.
     */
    isUserStopActive(): boolean;
    /**
     * EN: Returns the reason for the active USER_STOP signal.
     */
    getUserStopReason(): string | undefined;
    /**
     * EN: Synchronous checkpoint evaluation. Fails closed immediately if active.
     */
    private checkCheckpoint;
    assertGate1_LoopEntry(context?: AgentLoopGateContext): void;
    assertGate2_PreContextAssembly(context?: AgentLoopGateContext): void;
    assertGate2_PreContext(context?: AgentLoopGateContext): void;
    assertGate3_PreCognition(context?: AgentLoopGateContext): void;
    assertGate4_PrePlanning(context?: AgentLoopGateContext): void;
    assertGate5_PreAuthorization(context?: AgentLoopGateContext): void;
    assertGate6_PreToolExecution(context?: AgentLoopGateContext): void;
    assertGate7_PreRealityVerification(context?: AgentLoopGateContext): void;
    assertGate8_PreDurableCommit(context?: AgentLoopGateContext): void;
    assertGate9_PreEpisodicMemory(context?: AgentLoopGateContext): void;
    assertGate10_PreNextIteration(context?: AgentLoopGateContext): void;
}
export declare const globalAgentLoopExecutionGate: AgentLoopExecutionGate;
