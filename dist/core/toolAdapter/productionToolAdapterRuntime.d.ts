import type { AuthorizedActionHandoff } from '../actionProposal/actionProposalTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { AgentTaskStore } from '../taskLifecycle/agentTaskStore.js';
import { AuditLedger } from '../auditLedger.js';
import { GovernedPolicyEnforcementPoint } from '../policyEnforcement/index.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type ToolAdapterResult, type ToolAdapterRequest, type ToolExecutionStatus } from './toolAdapterTypes.js';
import { ToolAdapterRegistry } from './toolAdapterRegistry.js';
import { AuthorizedHandoffValidator } from './authorizedHandoffValidator.js';
import { ToolExecutionGate } from './toolExecutionGate.js';
export interface ProductionToolAdapterRuntimeOptions {
    readonly registry?: ToolAdapterRegistry;
    readonly validator?: AuthorizedHandoffValidator;
    readonly executionGate?: ToolExecutionGate;
    readonly sanitizer?: DiagnosisSanitizer;
    readonly auditLedger?: AuditLedger;
    readonly pep?: GovernedPolicyEnforcementPoint;
    readonly taskStore?: AgentTaskStore;
    readonly deterministicTimestamp?: string;
    readonly defaultTimeoutMs?: number;
}
export interface ExecuteHandoffOptions {
    readonly authoritativeTask?: AgentTask;
    readonly correlationId?: string;
    readonly timeoutMs?: number;
}
export declare class ProductionToolAdapterRuntime {
    private readonly registry;
    private readonly validator;
    private readonly executionGate;
    private readonly sanitizer;
    private readonly auditLedger;
    private readonly pep;
    private readonly taskStore?;
    private readonly deterministicTimestamp?;
    private readonly defaultTimeoutMs;
    private readonly executedHandoffHashes;
    constructor(options?: ProductionToolAdapterRuntimeOptions);
    /**
     * Executes a ToolAdapterRequest envelope under strict Level 4 governance.
     */
    executeRequest(request: ToolAdapterRequest): Promise<ToolAdapterResult>;
    /**
     * Executes an AuthorizedActionHandoff under strict Level 4 governance.
     */
    executeHandoff(handoff: AuthorizedActionHandoff, options?: ExecuteHandoffOptions): Promise<ToolAdapterResult>;
    /**
     * Invokes adapter with bounded timeout.
     */
    private invokeWithTimeout;
    /**
     * Deeply sanitizes output and caps maximum byte size.
     */
    sanitizeAndBoundOutput(output: unknown): unknown;
    /**
     * Deterministically calculates cryptographic execution provenance hash.
     */
    calculateExecutionProvenanceHash(params: {
        handoffProvenanceHash: string;
        toolName: string;
        status: ToolExecutionStatus;
        sanitizedOutput: unknown;
        executedAt: string;
    }): string;
    /**
     * Appends an event to the global audit ledger under domain agent_tool_execution.
     */
    private recordAudit;
    /**
     * Resets execution replay tracking (for testing purposes).
     */
    resetReplayTracker(): void;
}
export declare const globalProductionToolAdapterRuntime: ProductionToolAdapterRuntime;
