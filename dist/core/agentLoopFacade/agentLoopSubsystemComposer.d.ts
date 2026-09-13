import { AgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { ContextAssemblyEngine } from '../contextAssembly/contextAssemblyEngine.js';
import { CognitiveProviderRuntime } from '../cognitive/cognitiveProviderRuntime.js';
import { GovernedActionPlanner } from '../planning/governedActionPlanner.js';
import { GovernedActionProposalRuntime } from '../actionProposal/governedActionProposalRuntime.js';
import type { AuthorizedActionHandoff, ActionProposalDecision } from '../actionProposal/actionProposalTypes.js';
import { ProductionToolAdapterRuntime } from '../toolAdapter/productionToolAdapterRuntime.js';
import type { ToolAdapterResult } from '../toolAdapter/toolAdapterTypes.js';
import { RealityVerificationRuntime } from '../realityVerification/realityVerificationRuntime.js';
import type { RealityVerificationResult } from '../realityVerification/realityVerificationTypes.js';
import type { Postcondition } from '../verification/postconditionTypes.js';
import { DurableCommitRuntime } from '../durableCommit/durableCommitRuntime.js';
import type { DurableCommitResult, DurableCommitRecord } from '../durableCommit/durableCommitTypes.js';
import { EpisodicMemoryRuntime } from '../episodicMemory/episodicMemoryRuntime.js';
import type { EpisodicMemoryResult } from '../episodicMemory/episodicMemoryTypes.js';
import type { GovernedCandidatePlan } from '../planning/governedPlanningTypes.js';
import type { AssembledContext } from '../contextAssembly/contextTypes.js';
import type { CognitiveResult } from '../cognitive/cognitiveTypes.js';
export interface AgentLoopSubsystemComposerOptions {
    readonly taskRuntime?: AgentTaskRuntime;
    readonly contextEngine?: ContextAssemblyEngine;
    readonly cognitiveRuntime?: CognitiveProviderRuntime;
    readonly planner?: GovernedActionPlanner;
    readonly proposalRuntime?: GovernedActionProposalRuntime;
    readonly toolAdapterRuntime?: ProductionToolAdapterRuntime;
    readonly realityVerifier?: RealityVerificationRuntime;
    readonly durableCommitRuntime?: DurableCommitRuntime;
    readonly episodicMemoryRuntime?: EpisodicMemoryRuntime;
}
export declare class AgentLoopSubsystemComposer {
    readonly taskRuntime: AgentTaskRuntime;
    readonly contextEngine: ContextAssemblyEngine;
    readonly cognitiveRuntime: CognitiveProviderRuntime;
    readonly planner: GovernedActionPlanner;
    readonly proposalRuntime: GovernedActionProposalRuntime;
    readonly toolAdapterRuntime: ProductionToolAdapterRuntime;
    readonly realityVerifier: RealityVerificationRuntime;
    readonly durableCommitRuntime: DurableCommitRuntime;
    readonly episodicMemoryRuntime: EpisodicMemoryRuntime;
    constructor(options?: AgentLoopSubsystemComposerOptions);
    /**
     * Stage 1: Retrieves authoritative task from tenant partition.
     */
    getTask(tenantId: string, taskId: string): AgentTask;
    /**
     * Stage 2: Assembles context under deterministic token budget.
     */
    assembleContext(params: {
        readonly task: AgentTask;
        readonly userPrompt?: string;
        readonly expectedTaskVersion?: number;
    }): Promise<AssembledContext>;
    /**
     * Stage 3: Dispatches cognitive inference under latency & cost budgets.
     */
    executeCognition(params: {
        readonly task: AgentTask;
        readonly context: AssembledContext;
        readonly prompt?: string;
    }): Promise<CognitiveResult>;
    /**
     * Stage 4: Formulates bounded multi-step candidate plan.
     */
    formulatePlan(params: {
        readonly task: AgentTask;
        readonly cognitiveOutput: CognitiveResult;
        readonly assembledContext?: AssembledContext;
    }): Promise<GovernedCandidatePlan>;
    /**
     * Stage 5: Evaluates action proposal against PDP and enforces PEP guardrails.
     */
    processActionProposal(params: {
        readonly candidatePlan: GovernedCandidatePlan;
        readonly stepId: string;
        readonly completedStepIds?: readonly string[];
        readonly executionToken?: string;
        readonly task?: AgentTask;
    }): Promise<AuthorizedActionHandoff | ActionProposalDecision>;
    /**
     * Stage 6: Executes tool strictly via Tool Adapter with single-use authorization.
     */
    executeTool(params: {
        readonly handoff: AuthorizedActionHandoff;
        readonly authoritativeTask: AgentTask;
        readonly timeoutMs?: number;
    }): Promise<ToolAdapterResult>;
    /**
     * Stage 7: Empirically verifies postconditions from reality evidence.
     */
    verifyReality(params: {
        readonly executionResult: ToolAdapterResult;
        readonly authoritativeTask: AgentTask;
        readonly expectedTaskVersion: number;
        readonly postconditions?: readonly Postcondition[];
    }): Promise<RealityVerificationResult>;
    /**
     * Stage 8: Commits verified reality state into crash-safe durable storage.
     */
    commitDurable(params: {
        readonly verificationResult: RealityVerificationResult;
        readonly authoritativeTask: AgentTask;
        readonly expectedTaskVersion: number;
    }): Promise<DurableCommitResult>;
    /**
     * Stage 9: Ingests committed evidence into tenant episodic memory store.
     */
    recordEpisodicMemory(params: {
        readonly commitRecord: DurableCommitRecord | undefined;
        readonly authoritativeTask: AgentTask;
        readonly expectedTaskVersion: number;
        readonly synthesizeLessons?: boolean;
    }): Promise<EpisodicMemoryResult>;
}
