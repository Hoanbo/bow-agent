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
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { ContextAssemblyEngine } from '../contextAssembly/contextAssemblyEngine.js';
import { CognitiveProviderRuntime } from '../cognitive/cognitiveProviderRuntime.js';
import { GovernedActionPlanner } from '../planning/governedActionPlanner.js';
import { GovernedActionProposalRuntime } from '../actionProposal/governedActionProposalRuntime.js';
import type {
  AuthorizedActionHandoff,
  ActionProposalDecision,
} from '../actionProposal/actionProposalTypes.js';
import {
  ProductionToolAdapterRuntime,
  globalProductionToolAdapterRuntime,
} from '../toolAdapter/productionToolAdapterRuntime.js';
import type { ToolAdapterResult } from '../toolAdapter/toolAdapterTypes.js';
import {
  RealityVerificationRuntime,
  globalRealityVerificationRuntime,
} from '../realityVerification/realityVerificationRuntime.js';
import type { RealityVerificationResult } from '../realityVerification/realityVerificationTypes.js';
import type { Postcondition } from '../verification/postconditionTypes.js';
import {
  DurableCommitRuntime,
  globalDurableCommitRuntime,
} from '../durableCommit/durableCommitRuntime.js';
import type { DurableCommitResult, DurableCommitRecord } from '../durableCommit/durableCommitTypes.js';
import {
  EpisodicMemoryRuntime,
  globalEpisodicMemoryRuntime,
} from '../episodicMemory/episodicMemoryRuntime.js';
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

export class AgentLoopSubsystemComposer {
  public readonly taskRuntime: AgentTaskRuntime;
  public readonly contextEngine: ContextAssemblyEngine;
  public readonly cognitiveRuntime: CognitiveProviderRuntime;
  public readonly planner: GovernedActionPlanner;
  public readonly proposalRuntime: GovernedActionProposalRuntime;
  public readonly toolAdapterRuntime: ProductionToolAdapterRuntime;
  public readonly realityVerifier: RealityVerificationRuntime;
  public readonly durableCommitRuntime: DurableCommitRuntime;
  public readonly episodicMemoryRuntime: EpisodicMemoryRuntime;

  constructor(options?: AgentLoopSubsystemComposerOptions) {
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
  public getTask(tenantId: string, taskId: string): AgentTask {
    return this.taskRuntime.getTask(tenantId, taskId);
  }

  /**
   * Stage 2: Assembles context under deterministic token budget.
   */
  public async assembleContext(params: {
    readonly task: AgentTask;
    readonly userPrompt?: string;
    readonly expectedTaskVersion?: number;
  }): Promise<AssembledContext> {
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
  public async executeCognition(params: {
    readonly task: AgentTask;
    readonly context: AssembledContext;
    readonly prompt?: string;
  }): Promise<CognitiveResult> {
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
  public async formulatePlan(params: {
    readonly task: AgentTask;
    readonly cognitiveOutput: CognitiveResult;
    readonly assembledContext?: AssembledContext;
  }): Promise<GovernedCandidatePlan> {
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
  public async processActionProposal(params: {
    readonly candidatePlan: GovernedCandidatePlan;
    readonly stepId: string;
    readonly completedStepIds?: readonly string[];
    readonly executionToken?: string;
    readonly task?: AgentTask;
  }): Promise<AuthorizedActionHandoff | ActionProposalDecision> {
    return this.proposalRuntime.governProposal(
      {
        candidatePlan: params.candidatePlan,
        stepId: params.stepId,
        completedStepIds: params.completedStepIds,
        executionToken: params.executionToken,
      },
      params.task
    );
  }

  /**
   * Stage 6: Executes tool strictly via Tool Adapter with single-use authorization.
   */
  public async executeTool(params: {
    readonly handoff: AuthorizedActionHandoff;
    readonly authoritativeTask: AgentTask;
    readonly timeoutMs?: number;
  }): Promise<ToolAdapterResult> {
    return this.toolAdapterRuntime.executeHandoff(params.handoff, {
      authoritativeTask: params.authoritativeTask,
      timeoutMs: params.timeoutMs,
    });
  }

  /**
   * Stage 7: Empirically verifies postconditions from reality evidence.
   */
  public async verifyReality(params: {
    readonly executionResult: ToolAdapterResult;
    readonly authoritativeTask: AgentTask;
    readonly expectedTaskVersion: number;
    readonly postconditions?: readonly Postcondition[];
  }): Promise<RealityVerificationResult> {
    const defaultPostcondition: Postcondition = {
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
  public async commitDurable(params: {
    readonly verificationResult: RealityVerificationResult;
    readonly authoritativeTask: AgentTask;
    readonly expectedTaskVersion: number;
  }): Promise<DurableCommitResult> {
    return this.durableCommitRuntime.commitDurable({
      verificationResult: params.verificationResult,
      authoritativeTask: params.authoritativeTask,
      expectedTaskVersion: params.expectedTaskVersion,
    });
  }

  /**
   * Stage 9: Ingests committed evidence into tenant episodic memory store.
   */
  public async recordEpisodicMemory(params: {
    readonly commitRecord: DurableCommitRecord | undefined;
    readonly authoritativeTask: AgentTask;
    readonly expectedTaskVersion: number;
    readonly synthesizeLessons?: boolean;
  }): Promise<EpisodicMemoryResult> {
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
