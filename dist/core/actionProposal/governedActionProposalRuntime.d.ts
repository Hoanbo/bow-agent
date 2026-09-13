import type { AuditLedger } from '../auditLedger.js';
import type { AgentTaskStore } from '../taskLifecycle/agentTaskStore.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { ActionProposalBuilder } from './actionProposalBuilder.js';
import { ActionPDPBridge } from './actionPDPBridge.js';
import { ActionPEPBridge } from './actionPEPBridge.js';
import { type ActionProposalDecision, type AuthorizedActionHandoff, type GovernedProposalRequest } from './actionProposalTypes.js';
export interface GovernedActionProposalRuntimeOptions {
    readonly taskStore?: AgentTaskStore;
    readonly auditLedger?: AuditLedger;
    readonly builder?: ActionProposalBuilder;
    readonly pdpBridge?: ActionPDPBridge;
    readonly pepBridge?: ActionPEPBridge;
    readonly isUserStopActive?: () => boolean;
    readonly deterministicTimestamp?: string;
}
export declare class GovernedActionProposalRuntime {
    private readonly taskStore?;
    private readonly auditLedger;
    private readonly builder;
    private readonly pdpBridge;
    private readonly pepBridge;
    private readonly isUserStopActiveFn?;
    private readonly deterministicTimestamp?;
    constructor(options?: GovernedActionProposalRuntimeOptions);
    /**
     * Evaluates the absolute supremacy of USER_STOP across all 4 synchronous gates.
     */
    assertUserStopNotActive(checkpointName: string, context?: Record<string, unknown>): void;
    /**
     * Primary entrypoint: Extracts candidate step, verifies policies, routes approval,
     * enforces runtime constraints, and produces a sealed AuthorizedActionHandoff envelope.
     */
    governProposal(request: GovernedProposalRequest, injectedTask?: AgentTask): Promise<AuthorizedActionHandoff | ActionProposalDecision>;
    /**
     * Deterministically calculates the SHA-256 handoff provenance hash.
     */
    private calculateHandoffHash;
    /**
     * Resolves the authoritative task without mutating it.
     */
    private resolveAuthoritativeTask;
    /**
     * Verifies that the task version has not changed.
     */
    private assertTaskVersionFresh;
    /**
     * Appends an event to the global audit ledger.
     */
    private recordAudit;
}
