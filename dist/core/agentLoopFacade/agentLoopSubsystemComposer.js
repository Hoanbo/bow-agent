// src/core/agentLoopFacade/agentLoopSubsystemComposer.ts
// BOWCON V4.0 — MS-1.4.10: AGENT LOOP SUBSYSTEM COMPOSER
//
// EN:
// Provides controlled, fail-closed composition across the verified execution subsystems:
// TaskLifecycle -> ContextAssembly -> CognitiveRuntime -> GovernedActionPlanner ->
// ActionProposal -> PDP/PEP -> ProductionToolAdapterRuntime -> RealityVerification ->
// DurableCommitRuntime -> EpisodicMemoryRuntime.
// The composer never manufactures authorization, never bypasses PDP/PEP, and never writes
// directly to disk outside the verified subsystems.
//
// VI:
// Cung cấp sự kết hợp có kiểm soát, đóng an toàn qua các phân hệ thực thi đã xác minh.
// Composer không bao giờ tự tạo ủy quyền, không bao giờ bỏ qua PDP/PEP và không bao giờ
// ghi trực tiếp vào đĩa bên ngoài các phân hệ đã xác minh.
import { AgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import { ContextAssemblyEngine } from '../contextAssembly/contextAssemblyEngine.js';
import { CognitiveProviderRuntime } from '../cognitive/cognitiveProviderRuntime.js';
import { GovernedActionPlanner } from '../planning/governedActionPlanner.js';
import { GovernedActionProposalRuntime } from '../actionProposal/governedActionProposalRuntime.js';
import { globalProductionToolAdapterRuntime, } from '../toolAdapter/productionToolAdapterRuntime.js';
import { globalRealityVerificationRuntime, } from '../realityVerification/realityVerificationRuntime.js';
import { globalDurableCommitRuntime, } from '../durableCommit/durableCommitRuntime.js';
import { globalEpisodicMemoryRuntime, } from '../episodicMemory/episodicMemoryRuntime.js';
export class AgentLoopSubsystemComposer {
    taskRuntime;
    contextEngine;
    cognitiveRuntime;
    planner;
    proposalRuntime;
    toolAdapterRuntime;
    realityVerifier;
    durableCommitRuntime;
    episodicMemoryRuntime;
    constructor(options) {
        this.taskRuntime = options?.taskRuntime ?? new AgentTaskRuntime();
        this.contextEngine = options?.contextEngine ?? new ContextAssemblyEngine();
        this.cognitiveRuntime = options?.cognitiveRuntime ?? new CognitiveProviderRuntime();
        this.planner = options?.planner ?? new GovernedActionPlanner();
        this.proposalRuntime = options?.proposalRuntime ?? new GovernedActionProposalRuntime();
        this.toolAdapterRuntime = options?.toolAdapterRuntime ?? globalProductionToolAdapterRuntime;
        this.realityVerifier = options?.realityVerifier ?? globalRealityVerificationRuntime;
        this.durableCommitRuntime = options?.durableCommitRuntime ?? globalDurableCommitRuntime;
        this.episodicMemoryRuntime = options?.episodicMemoryRuntime ?? globalEpisodicMemoryRuntime;
    }
    /**
     * Stage 1: Retrieves authoritative task from tenant partition.
     */
    getTask(tenantId, taskId) {
        return this.taskRuntime.getTask(tenantId, taskId);
    }
    /**
     * Stage 2: Assembles context under deterministic token budget.
     */
    async assembleContext(params) {
        const assemblyResult = await this.contextEngine.assembleContext({
            assemblyId: `ctx_${params.task.taskId}_${Date.now()}`,
            tenantId: params.task.tenantId,
            taskId: params.task.taskId,
            expectedTaskVersion: params.expectedTaskVersion ?? params.task.version,
            promptInputs: {
                taskContext: `Task: ${params.task.taskId} | Intent: ${params.task.intent}`,
                userContext: params.userPrompt ?? `Execute task ${params.task.taskId}`,
                systemPrompt: 'You are a governed production agent operating under strict Level 4 invariants.',
            },
        });
        return assemblyResult.assembledContext;
    }
    /**
     * Stage 3: Dispatches cognitive inference under latency & cost budgets.
     */
    async executeCognition(params) {
        const inferenceResponse = await this.cognitiveRuntime.executeInference({
            requestId: `inf_${params.task.taskId}_${Date.now()}`,
            tenantId: params.task.tenantId,
            taskId: params.task.taskId,
            promptContext: {
                systemPrompt: params.context.systemPrompt,
                systemContext: params.context.systemContext,
                userContext: params.context.userContext,
                taskContext: params.context.taskContext,
                memoryContext: params.context.memoryContext,
                capabilitiesContext: params.context.capabilitiesContext,
                policyConstraints: params.context.policyConstraints,
            },
            budget: {
                maxPromptTokens: 4000,
                maxCompletionTokens: 2000,
                maxLatencyMs: 30000,
            },
        });
        return inferenceResponse.cognitiveResult;
    }
    /**
     * Stage 4: Formulates bounded multi-step candidate plan.
     */
    async formulatePlan(params) {
        const planResponse = await this.planner.plan({
            requestId: `plan_${params.task.taskId}_${Date.now()}`,
            taskId: params.task.taskId,
            tenantId: params.task.tenantId,
            expectedTaskVersion: params.task.version,
            cognitiveResult: params.cognitiveOutput,
            assembledContext: params.assembledContext,
        });
        return planResponse.candidatePlan;
    }
    /**
     * Stage 5: Evaluates action proposal against PDP and enforces PEP guardrails.
     */
    async processActionProposal(params) {
        return this.proposalRuntime.governProposal({
            candidatePlan: params.candidatePlan,
            stepId: params.stepId,
            completedStepIds: params.completedStepIds,
            executionToken: params.executionToken,
        }, params.task);
    }
    /**
     * Stage 6: Executes tool strictly via Tool Adapter with single-use authorization.
     */
    async executeTool(params) {
        return this.toolAdapterRuntime.executeHandoff(params.handoff, {
            authoritativeTask: params.authoritativeTask,
            timeoutMs: params.timeoutMs,
        });
    }
    /**
     * Stage 7: Empirically verifies postconditions from reality evidence.
     */
    async verifyReality(params) {
        const defaultPostcondition = {
            id: `post_${params.executionResult.executionId}`,
            description: 'execution status success',
            targetPath: 'status',
            operator: 'EQUALS',
            expectedValue: 'SUCCESS',
            priority: 'CRITICAL',
            required: true,
        };
        return this.realityVerifier.verifyReality({
            executionResult: params.executionResult,
            authoritativeTask: params.authoritativeTask,
            expectedTaskVersion: params.expectedTaskVersion,
            postconditions: params.postconditions ?? [defaultPostcondition],
        });
    }
    /**
     * Stage 8: Commits verified reality state into crash-safe durable storage.
     */
    async commitDurable(params) {
        return this.durableCommitRuntime.commitDurable({
            verificationResult: params.verificationResult,
            authoritativeTask: params.authoritativeTask,
            expectedTaskVersion: params.expectedTaskVersion,
        });
    }
    /**
     * Stage 9: Ingests committed evidence into tenant episodic memory store.
     */
    async recordEpisodicMemory(params) {
        if (!params.commitRecord) {
            throw new Error('Cannot ingest episodic memory without committed record');
        }
        return this.episodicMemoryRuntime.recordMemory({
            commitRecord: params.commitRecord,
            authoritativeTask: params.authoritativeTask,
            expectedTaskVersion: params.expectedTaskVersion,
            synthesizeLessons: params.synthesizeLessons ?? true,
        });
    }
}
