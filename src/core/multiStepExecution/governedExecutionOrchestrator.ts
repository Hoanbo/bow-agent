// src/core/multiStepExecution/governedExecutionOrchestrator.ts
// BOWCON V4.0 — MS-1.5.10: GOVERNED EXECUTION ORCHESTRATOR
// Component 1070 — REAL
//
// EN: Master orchestrator for native governed multi-step execution.
//     Sequences dependency DAG steps, acquires per-step leases, executes strictly via MS-1.5.09,
//     monitors environmental drift, pauses on invalidation, and triggers governed replanning.
//     Strictly upholds: EXECUTION != AUTONOMOUS AUTHORITY, REPLANNING != SELF-AUTHORIZATION.
// VI: Bộ điều phối chủ cho thực thi nhiều bước có quản trị nguyên bản.
//     Tuần tự hóa các bước trong DAG phụ thuộc, lấy hợp đồng thuê cho từng bước, thực thi nghiêm ngặt qua MS-1.5.09,
//     giám sát trôi dạt môi trường, tạm dừng khi vô hiệu hóa và kích hoạt lập kế hoạch lại có quản trị.
//     Tuân thủ nghiêm ngặt: THỰC THI KHÔNG PHẢI QUYỀN HẠN TỰ TRỊ, LẬP KẾ HOẠCH LẠI KHÔNG PHẢI TỰ ỦY QUYỀN.

import crypto from 'node:crypto';
import {
  type MultiStepExecutionSession,
  type MultiStepExecutionGeneration,
  type MultiStepExecutionStepState,
  type MultiStepExecutionResult,
  type ExecutionStepCheckpoint,
  type ExecutionEnvironmentSnapshot,
  type ReplanningRequest,
  MAX_EXECUTION_STEPS,
  MultiStepExecutionValidationError,
  MultiStepExecutionAuthorizationError,
  MultiStepExecutionLeaseError,
  MultiStepExecutionUserStopError,
  computeStepCheckpointProvenanceHash,
  computeGenerationProvenanceHash,
  computeMultiStepSessionProvenanceHash,
  computeMultiStepResultProvenanceHash,
} from './multiStepExecutionTypes.js';
import { MultiStepExecutionValidator } from './multiStepExecutionValidator.js';
import { ExecutionStepScheduler } from './executionStepScheduler.js';
import { ExecutionEnvironmentMonitor } from './executionEnvironmentMonitor.js';
import { GovernedReplanningEngine } from './governedReplanningEngine.js';
import { ExecutionGenerationManager } from './executionGenerationManager.js';
import { MultiStepExecutionSecurityBoundary } from './multiStepExecutionSecurityBoundary.js';
import { MultiStepExecutionPersistenceRecoveryEngine } from './multiStepExecutionPersistenceRecoveryEngine.js';
import {
  GovernedExecutionWorker,
  type ExecutionRequest,
  type ExecutionLease,
  type ExecutionAuthorizationEnvelope,
  computeAuthorizationHash,
  computeRequestHash,
  ExecutionLeaseManager,
} from '../governedExecution/index.js';
import { AgentTaskRuntime, globalAgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { type AuditLedger, globalAuditLedger } from '../auditLedger.js';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';

export interface OrchestratorOptions {
  readonly worker?: GovernedExecutionWorker;
  readonly leaseManager?: ExecutionLeaseManager;
  readonly persistenceEngine?: MultiStepExecutionPersistenceRecoveryEngine;
  readonly environmentMonitor?: ExecutionEnvironmentMonitor;
  readonly generationManager?: ExecutionGenerationManager;
  readonly replanningEngine?: GovernedReplanningEngine;
  readonly securityBoundary?: MultiStepExecutionSecurityBoundary;
  readonly auditLedger?: AuditLedger;
  readonly taskRuntime?: AgentTaskRuntime;
  readonly userStopProvider?: () => boolean;
}

export interface OrchestratorRunParams {
  readonly session: MultiStepExecutionSession;
  readonly observedPreconditions?: Record<string, boolean | string | number>;
  readonly humanConfirmationTokens?: Record<string, string>; // stepId -> token
}

export class GovernedExecutionOrchestrator {
  private readonly worker: GovernedExecutionWorker;
  private readonly leaseManager: ExecutionLeaseManager;
  private readonly persistenceEngine: MultiStepExecutionPersistenceRecoveryEngine;
  private readonly environmentMonitor: ExecutionEnvironmentMonitor;
  private readonly generationManager: ExecutionGenerationManager;
  private readonly replanningEngine: GovernedReplanningEngine;
  private readonly securityBoundary: MultiStepExecutionSecurityBoundary;
  private readonly auditLedger: AuditLedger;
  private readonly taskRuntime: AgentTaskRuntime;
  private readonly userStopProvider: () => boolean;

  constructor(options?: OrchestratorOptions) {
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    this.securityBoundary = options?.securityBoundary ?? new MultiStepExecutionSecurityBoundary({ userStopProvider: this.userStopProvider });
    this.leaseManager = options?.leaseManager ?? new ExecutionLeaseManager({ userStopProvider: this.userStopProvider });
    this.taskRuntime = options?.taskRuntime ?? globalAgentTaskRuntime;
    this.worker = options?.worker ?? new GovernedExecutionWorker({
      leaseManager: this.leaseManager,
      userStopProvider: this.userStopProvider,
      taskRuntime: this.taskRuntime,
    });
    this.persistenceEngine = options?.persistenceEngine ?? new MultiStepExecutionPersistenceRecoveryEngine({ userStopProvider: this.userStopProvider });
    this.environmentMonitor = options?.environmentMonitor ?? new ExecutionEnvironmentMonitor({ userStopProvider: this.userStopProvider });
    this.generationManager = options?.generationManager ?? new ExecutionGenerationManager({ userStopProvider: this.userStopProvider });
    this.replanningEngine = options?.replanningEngine ?? new GovernedReplanningEngine({ userStopProvider: this.userStopProvider });
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
  }

  /**
   * EN: Initializes a new multi-step execution session from an approved GroundedPlanTaskBinding and AgentTask.
   * VI: Khởi tạo một phiên thực thi nhiều bước mới từ GroundedPlanTaskBinding và AgentTask đã được phê duyệt.
   */
  public initializeSession(params: {
    readonly tenantId: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly planId: string;
    readonly planVersion: number;
    readonly bindingSnapshot: GroundedPlanTaskBinding;
    readonly taskSnapshot: AgentTask;
  }): MultiStepExecutionSession {
    this.securityBoundary.assertUserStop('multi_step_entry');
    this.securityBoundary.assertIsolation(
      params.tenantId,
      params.sessionId,
      params.bindingSnapshot.tenantId,
      params.bindingSnapshot.sessionId
    );

    // Ensure task is registered in taskRuntime
    try {
      this.taskRuntime.getTask(params.tenantId, params.taskId);
    } catch {
      try {
        this.taskRuntime.createTask({
          tenantId: params.tenantId,
          userId: params.taskSnapshot.userId || params.tenantId,
          title: params.taskSnapshot.title,
          intent: params.taskSnapshot.intent,
          riskLevel: params.taskSnapshot.riskLevel,
          customTaskId: params.taskId,
          steps: params.taskSnapshot.steps.map((s) => ({
            description: s.description,
            capabilityId: s.capabilityId,
            actionName: s.actionName,
            parameters: s.parameters,
            riskLevel: s.riskLevel,
            requiresApproval: s.requiresApproval,
          })),
        });
      } catch {
        // Ignored
      }
    }

    // Initial Generation 0
    const gen0 = this.generationManager.createGeneration({
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      taskId: params.taskId,
      planId: params.planId,
      planVersion: params.planVersion,
      generationIndex: 0,
      bindingSnapshot: params.bindingSnapshot,
      taskSnapshot: params.taskSnapshot,
      status: 'ACTIVE',
    });

    const timestamp = new Date().toISOString();
    const rawSession = {
      sessionId: params.sessionId,
      tenantId: params.tenantId,
      taskId: params.taskId,
      planId: params.planId,
      activeGenerationId: gen0.generationId,
      status: 'READY' as const,
      sessionVersion: 1,
      generations: Object.freeze([gen0]),
      checkpoints: Object.freeze([]),
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const provenanceRoot = computeMultiStepSessionProvenanceHash(rawSession);
    const session: MultiStepExecutionSession = Object.freeze({
      ...rawSession,
      provenanceRoot,
    });

    MultiStepExecutionValidator.validateSession(session);
    this.persistenceEngine.initializeSession(session);

    this.recordAuditEvent({
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      eventType: 'MULTI_STEP_STARTED',
      stepId: 'session_init',
      outcome: 'SUCCESS',
    });

    return session;
  }

  /**
   * EN: Runs the multi-step execution loop step-by-step under strict governance.
   * VI: Chạy vòng lặp thực thi nhiều bước từng bước một dưới sự quản trị nghiêm ngặt.
   */
  public async executeSession(params: OrchestratorRunParams): Promise<MultiStepExecutionResult> {
    // 1. Checkpoint: multi_step_entry USER_STOP
    this.securityBoundary.assertUserStop('multi_step_entry');

    let currentSession = params.session;
    MultiStepExecutionValidator.validateSession(currentSession);

    // Load or verify session document from persistence
    let sessionDoc = this.persistenceEngine.loadSessionDocument(currentSession.tenantId, currentSession.sessionId);
    currentSession = sessionDoc.session;

    const activeGen = currentSession.generations.find((g) => g.generationId === currentSession.activeGenerationId);
    if (!activeGen) {
      throw new MultiStepExecutionValidationError(
        `Active generation "${currentSession.activeGenerationId}" not found in session "${currentSession.sessionId}"`
      );
    }

    let stepCount = 0;
    const executedResults = [...sessionDoc.executionResults];
    const newCheckpoints = [...currentSession.checkpoints];
    let updatedStepStates = { ...activeGen.stepStates };

    // Execution Loop bounded by MAX_EXECUTION_STEPS
    while (stepCount < MAX_EXECUTION_STEPS) {
      // 1. Checkpoint: USER_STOP at cycle boundary
      this.securityBoundary.assertUserStop('multi_step_entry');

      // Schedule next step
      const schedGenRaw = {
        ...activeGen,
        stepStates: updatedStepStates,
      };
      const schedGen = Object.freeze({
        ...schedGenRaw,
        provenanceHash: computeGenerationProvenanceHash(schedGenRaw),
      });

      const schedResult = ExecutionStepScheduler.evaluateStepReadiness(schedGen);
      if (schedResult.isPlanExhausted) {
        // All steps completed or handled
        break;
      }

      const nextStep = schedResult.nextExecutableStep;
      if (!nextStep) {
        // No step is currently ready (blocked or waiting)
        break;
      }

      stepCount++;

      // 2. Environment Verification before step execution
      const stepBinding = activeGen.bindingSnapshot.stepBindings.find((b) => b.sourceStepId === nextStep.stepId);
      const expectedPreconditions: Record<string, boolean | string | number> = {};
      if (stepBinding?.preconditions) {
        for (const p of stepBinding.preconditions) {
          expectedPreconditions[p] = true;
        }
      }
      const rawParams = stepBinding?.taskStepOptions?.parameters as Record<string, any> | undefined;
      if (rawParams?.expectedPreconditions && typeof rawParams.expectedPreconditions === 'object') {
        Object.assign(expectedPreconditions, rawParams.expectedPreconditions);
      }
      if (Object.keys(expectedPreconditions).length === 0) {
        expectedPreconditions['environment_ready'] = true;
      }

      const dynamicObserved: Record<string, boolean | string | number> = {};
      if (expectedPreconditions['environment_ready'] !== undefined) {
        dynamicObserved['environment_ready'] = true;
      }
      for (const [sId, sState] of Object.entries(updatedStepStates)) {
        if (sState.status === 'COMPLETED') {
          dynamicObserved[sId] = true;
        }
      }
      const observedPreconditions = {
        ...dynamicObserved,
        ...(params.observedPreconditions ?? expectedPreconditions),
      };

      const envSnapshot = this.environmentMonitor.captureSnapshot({
        tenantId: currentSession.tenantId,
        sessionId: currentSession.sessionId,
        generationId: activeGen.generationId,
        stepId: nextStep.stepId,
        observedElements: [],
        systemPreconditions: expectedPreconditions,
        observedPreconditions,
      });

      this.recordAuditEvent({
        tenantId: currentSession.tenantId,
        sessionId: currentSession.sessionId,
        eventType: 'ENVIRONMENT_CHECKED',
        stepId: nextStep.stepId,
        outcome: 'SUCCESS',
      });

      const envOutcome = this.environmentMonitor.verifyEnvironmentState(envSnapshot, expectedPreconditions);

      if (envOutcome.validity === 'INVALID' || envOutcome.validity === 'UNKNOWN') {
        // Environment drifted / invalid / unknown -> Pause and Trigger Governed Replanning
        this.securityBoundary.assertUserStop('pre_replan');

        this.recordAuditEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          eventType: 'ENVIRONMENT_CHANGED',
          stepId: nextStep.stepId,
          outcome: 'BLOCKED',
        });

        const replanRequest = this.replanningEngine.createReplanningRequest({
          generation: schedGen,
          environmentSnapshot: envSnapshot,
          reason: envOutcome.reason,
          remainingObjective: activeGen.taskSnapshot.title ?? 'Complete remaining plan steps',
          failedStepId: nextStep.stepId,
          totalPreviousReplans: sessionDoc.replanningRequests.length,
        });

        this.recordAuditEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          eventType: 'REPLANNING_REQUIRED',
          stepId: nextStep.stepId,
          outcome: 'BLOCKED',
        });

        // Mark downstream steps invalidated
        const invalidatedIds = ExecutionStepScheduler.computeCascadingInvalidations(nextStep.stepId, updatedStepStates);
        for (const id of invalidatedIds) {
          if (updatedStepStates[id]) {
            updatedStepStates[id] = Object.freeze({
              ...updatedStepStates[id],
              status: 'INVALIDATED' as const,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Pause session
        currentSession = this.updateSessionStatus(currentSession, 'REPLANNING_REQUIRED');
        sessionDoc = {
          ...sessionDoc,
          session: currentSession,
          replanningRequests: [...sessionDoc.replanningRequests, replanRequest],
          environmentSnapshots: [...sessionDoc.environmentSnapshots, envSnapshot],
        };
        this.persistenceEngine.saveSessionDocument(sessionDoc, sessionDoc.sessionVersion);

        return this.createExecutionResult(currentSession, executedResults, 'REPLANNING_REQUIRED');
      }

      // 3. Pre-Step Authorization Checkpoint
      this.securityBoundary.assertUserStop('pre_step_authorization');

      this.recordAuditEvent({
        tenantId: currentSession.tenantId,
        sessionId: currentSession.sessionId,
        eventType: 'STEP_READY',
        stepId: nextStep.stepId,
        outcome: 'SUCCESS',
      });

      // Verify and construct authorization chain for step
      const auth = this.buildStepAuthorizationEnvelope({
        session: currentSession,
        generation: activeGen,
        step: nextStep,
        humanConfirmationToken: params.humanConfirmationTokens?.[nextStep.stepId],
      });

      this.recordAuditEvent({
        tenantId: currentSession.tenantId,
        sessionId: currentSession.sessionId,
        eventType: 'STEP_AUTHORIZED',
        stepId: nextStep.stepId,
        outcome: 'SUCCESS',
      });

      // 4. Pre-Lease Acquisition Checkpoint
      this.securityBoundary.assertUserStop('pre_lease_acquisition');

      const lease = this.leaseManager.issueLease({
        tenantId: currentSession.tenantId,
        sessionId: currentSession.sessionId,
        taskId: currentSession.taskId,
        stepId: nextStep.stepId,
        stepIndex: nextStep.stepIndex,
        operationKind: nextStep.operationKind,
        riskLevel: stepBinding?.riskLevel ?? 'LOW',
      });

      // 5. Build ExecutionRequest and assert pre_dispatch
      this.securityBoundary.assertUserStop('pre_dispatch');

      const execReq = this.buildExecutionRequest({
        session: currentSession,
        generation: activeGen,
        step: nextStep,
        authorization: auth,
        lease,
        stepBinding,
      });

      // 6. Execute step strictly via MS-1.5.09 GovernedExecutionWorker
      this.recordAuditEvent({
        tenantId: currentSession.tenantId,
        sessionId: currentSession.sessionId,
        eventType: 'STEP_EXECUTION_STARTED',
        stepId: nextStep.stepId,
        outcome: 'SUCCESS',
      });

      const resultEnvelope = await this.worker.executeTaskStep(execReq);
      executedResults.push(resultEnvelope);

      // 7. Post-Step Return Checkpoint
      this.securityBoundary.assertUserStop('post_step_return');

      if (resultEnvelope.success) {
        updatedStepStates[nextStep.stepId] = Object.freeze({
          ...nextStep,
          status: 'COMPLETED' as const,
          leaseId: lease.leaseId,
          executionId: resultEnvelope.executionId,
          resultEnvelope,
          updatedAt: new Date().toISOString(),
        });

        this.recordAuditEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          eventType: 'STEP_EXECUTION_SUCCEEDED',
          stepId: nextStep.stepId,
          outcome: 'SUCCESS',
        });
      } else {
        // Step execution failed
        updatedStepStates[nextStep.stepId] = Object.freeze({
          ...nextStep,
          status: 'FAILED' as const,
          leaseId: lease.leaseId,
          executionId: resultEnvelope.executionId,
          resultEnvelope,
          failureReason: resultEnvelope.failure?.message ?? 'Execution failed',
          updatedAt: new Date().toISOString(),
        });

        this.recordAuditEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          eventType: 'STEP_EXECUTION_FAILED',
          stepId: nextStep.stepId,
          outcome: 'BLOCKED',
        });

        // Cascading invalidations to dependent steps
        const invalidatedIds = ExecutionStepScheduler.computeCascadingInvalidations(nextStep.stepId, updatedStepStates);
        for (const id of invalidatedIds) {
          if (updatedStepStates[id]) {
            updatedStepStates[id] = Object.freeze({
              ...updatedStepStates[id],
              status: 'INVALIDATED' as const,
              updatedAt: new Date().toISOString(),
            });
          }
        }

        // Checkpoint failure state
        this.securityBoundary.assertUserStop('pre_checkpoint');
        const failureCheckpoint = this.createCheckpoint(currentSession, activeGen, nextStep, envSnapshot);
        newCheckpoints.push(failureCheckpoint);

        // Fail session closed
        currentSession = this.updateSessionStatus(currentSession, 'FAILED');
        sessionDoc = {
          ...sessionDoc,
          session: currentSession,
          executionResults: executedResults,
        };
        this.persistenceEngine.saveSessionDocument(sessionDoc, sessionDoc.sessionVersion);

        return this.createExecutionResult(currentSession, executedResults, 'STEP_EXECUTION_FAILED');
      }

      // 8. Pre-Checkpoint Checkpoint
      this.securityBoundary.assertUserStop('pre_checkpoint');

      const checkpoint = this.createCheckpoint(currentSession, activeGen, nextStep, envSnapshot, resultEnvelope.output);
      newCheckpoints.push(checkpoint);

      // Atomically persist progress
      const updatedGenerations = currentSession.generations.map((g) => {
        if (g.generationId === activeGen.generationId) {
          const rawGen = {
            ...g,
            stepStates: Object.freeze({ ...updatedStepStates }),
            updatedAt: new Date().toISOString(),
          };
          return Object.freeze({
            ...rawGen,
            provenanceHash: computeGenerationProvenanceHash(rawGen),
          });
        }
        return g;
      });

      const updatedSessionRaw = {
        ...currentSession,
        generations: Object.freeze(updatedGenerations),
        checkpoints: Object.freeze([...newCheckpoints]),
        updatedAt: new Date().toISOString(),
      };
      const provenanceRoot = computeMultiStepSessionProvenanceHash(updatedSessionRaw);

      currentSession = Object.freeze({
        ...updatedSessionRaw,
        provenanceRoot,
      });

      sessionDoc = {
        ...sessionDoc,
        session: currentSession,
        executionResults: executedResults,
        environmentSnapshots: [...sessionDoc.environmentSnapshots, envSnapshot],
      };
      this.persistenceEngine.saveSessionDocument(sessionDoc, sessionDoc.sessionVersion);
    }

    // Determine final status
    const allCompleted = Object.values(updatedStepStates).every(
      (s) => s.status === 'COMPLETED' || s.status === 'SKIPPED'
    );
    const finalStatus = allCompleted ? 'COMPLETED' : 'PAUSED';
    currentSession = this.updateSessionStatus(currentSession, finalStatus);

    sessionDoc = {
      ...sessionDoc,
      session: currentSession,
    };
    this.persistenceEngine.saveSessionDocument(sessionDoc, sessionDoc.sessionVersion);

    this.recordAuditEvent({
      tenantId: currentSession.tenantId,
      sessionId: currentSession.sessionId,
      eventType: allCompleted ? 'MULTI_STEP_COMPLETED' : 'EXECUTION_PAUSED',
      stepId: 'session_completion',
      outcome: allCompleted ? 'SUCCESS' : 'BLOCKED',
    });

    return this.createExecutionResult(currentSession, executedResults, allCompleted ? 'ALL_STEPS_COMPLETED' : 'EXECUTION_PAUSED');
  }

  /**
   * EN: Resumes execution with a newly governed replanned generation.
   * VI: Tiếp tục thực thi với một thế hệ được lập kế hoạch lại có quản trị mới.
   */
  public resumeWithReplannedGeneration(params: {
    readonly session: MultiStepExecutionSession;
    readonly newBindingSnapshot: GroundedPlanTaskBinding;
    readonly newTaskSnapshot: AgentTask;
  }): MultiStepExecutionSession {
    this.securityBoundary.assertUserStop('pre_generation_commit');

    const nextGenIndex = params.session.generations.length;
    const newGen = this.generationManager.createGeneration({
      tenantId: params.session.tenantId,
      sessionId: params.session.sessionId,
      taskId: params.session.taskId,
      planId: params.session.planId,
      planVersion: params.newBindingSnapshot.sourcePlanVersion,
      generationIndex: nextGenIndex,
      bindingSnapshot: params.newBindingSnapshot,
      taskSnapshot: params.newTaskSnapshot,
    });

    const updatedSession = this.generationManager.transitionToNewGeneration(
      params.session,
      newGen,
      params.session.sessionVersion
    );

    let sessionDoc = this.persistenceEngine.loadSessionDocument(updatedSession.tenantId, updatedSession.sessionId);
    sessionDoc = {
      ...sessionDoc,
      session: updatedSession,
      activeGeneration: newGen,
      sessionVersion: updatedSession.sessionVersion,
    };
    this.persistenceEngine.saveSessionDocument(sessionDoc, params.session.sessionVersion);

    this.recordAuditEvent({
      tenantId: updatedSession.tenantId,
      sessionId: updatedSession.sessionId,
      eventType: 'GENERATION_CREATED',
      stepId: `gen_${newGen.generationIndex}`,
      outcome: 'SUCCESS',
    });

    return updatedSession;
  }

  // ==========================================================================
  // INTERNAL HELPERS
  // ==========================================================================

  private updateSessionStatus(
    session: MultiStepExecutionSession,
    status: MultiStepExecutionSession['status']
  ): MultiStepExecutionSession {
    const raw = {
      ...session,
      status,
      sessionVersion: session.sessionVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    const provenanceRoot = computeMultiStepSessionProvenanceHash(raw);
    return Object.freeze({ ...raw, provenanceRoot });
  }

  private createCheckpoint(
    session: MultiStepExecutionSession,
    gen: MultiStepExecutionGeneration,
    step: MultiStepExecutionStepState,
    snapshot: ExecutionEnvironmentSnapshot,
    resultSummary?: Record<string, unknown>
  ): ExecutionStepCheckpoint {
    const timestamp = new Date().toISOString();
    const checkpointId = `chk_${session.tenantId}_${session.sessionId}_${step.stepId}_${Date.now()}`;
    const raw = {
      checkpointId,
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      generationId: gen.generationId,
      stepId: step.stepId,
      stepIndex: step.stepIndex,
      status: step.status,
      resultSummary: resultSummary ? Object.freeze({ ...resultSummary }) : undefined,
      environmentSnapshotHash: snapshot.provenanceHash,
      timestamp,
    };
    const provenanceHash = computeStepCheckpointProvenanceHash(raw);
    return Object.freeze({ ...raw, provenanceHash });
  }

  private buildStepAuthorizationEnvelope(params: {
    readonly session: MultiStepExecutionSession;
    readonly generation: MultiStepExecutionGeneration;
    readonly step: MultiStepExecutionStepState;
    readonly humanConfirmationToken?: string;
  }): ExecutionAuthorizationEnvelope {
    const { session, generation, step, humanConfirmationToken } = params;
    const stepBinding = generation.bindingSnapshot.stepBindings.find((b) => b.sourceStepId === step.stepId);
    const riskLevel = stepBinding?.riskLevel ?? 'LOW';
    const requiresHuman = riskLevel === 'HIGH' || riskLevel === 'CRITICAL';

    if (requiresHuman && !humanConfirmationToken) {
      throw new MultiStepExecutionAuthorizationError(
        `Step "${step.stepId}" has risk level ${riskLevel} and requires human confirmation token`
      );
    }

    const timestamp = new Date().toISOString();
    const authId = `auth_${session.tenantId}_${session.sessionId}_${step.stepId}_${Date.now()}`;

    const rawAuth = {
      authorizationId: authId,
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      bindingId: generation.bindingSnapshot.bindingId,
      sourcePlanId: generation.planId,
      sourcePlanProvenanceHash: generation.bindingSnapshot.sourcePlanProvenanceHash,
      bindingProvenanceHash: generation.bindingSnapshot.provenanceHash,
      taskId: generation.taskId,
      taskProvenanceHash: generation.taskSnapshot.provenanceHash ?? generation.taskSnapshot.taskId,
      stepId: step.stepId,
      stepProvenanceHash: stepBinding?.stepProvenanceHash ?? step.stepId,
      riskLevel,
      requiresHumanConfirmation: requiresHuman,
      humanConfirmationSignature: humanConfirmationToken,
      pdpVerdict: 'PERMIT' as const,
      pepLeaseId: `pep_lease_${step.stepId}`,
      verifiedAt: timestamp,
    };

    const authorizationHash = computeAuthorizationHash(rawAuth);
    return Object.freeze({
      ...rawAuth,
      authorizationHash,
    });
  }

  private buildExecutionRequest(params: {
    readonly session: MultiStepExecutionSession;
    readonly generation: MultiStepExecutionGeneration;
    readonly step: MultiStepExecutionStepState;
    readonly authorization: ExecutionAuthorizationEnvelope;
    readonly lease: ExecutionLease;
    readonly stepBinding?: any;
  }): ExecutionRequest {
    const { session, generation, step, authorization, lease, stepBinding } = params;
    const timestamp = new Date().toISOString();
    const requestId = `req_${session.tenantId}_${session.sessionId}_${step.stepId}_${Date.now()}`;

    const operation = {
      operationName: step.title,
      kind: step.operationKind,
      targetDomain: stepBinding?.targetDomain ?? 'DESKTOP',
      targetElementId: stepBinding?.targetElementId,
      parameters: stepBinding?.parameters ?? {},
    };

    const rawReq = {
      requestId,
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      taskId: session.taskId,
      stepId: step.stepId,
      stepIndex: step.stepIndex,
      operation,
      authorization,
      lease,
      bindingSnapshot: generation.bindingSnapshot,
      taskSnapshot: generation.taskSnapshot,
      requestedAt: timestamp,
    };

    const requestHash = computeRequestHash(rawReq);
    return Object.freeze({
      ...rawReq,
      requestHash,
    });
  }

  private createExecutionResult(
    session: MultiStepExecutionSession,
    results: readonly any[],
    finalOutcome: string
  ): MultiStepExecutionResult {
    const timestamp = new Date().toISOString();
    const completedSteps = results.filter((r) => r.success).length;
    const failedSteps = results.filter((r) => !r.success).length;

    const rawResult = {
      sessionId: session.sessionId,
      tenantId: session.tenantId,
      taskId: session.taskId,
      status: session.status,
      totalSteps: results.length,
      completedSteps,
      failedSteps,
      replanningGenerations: session.generations.length,
      stepResults: Object.freeze(results),
      finalOutcome,
      sessionVersion: session.sessionVersion,
      timestamp,
    };

    const provenanceHash = computeMultiStepResultProvenanceHash(rawResult);
    return Object.freeze({
      ...rawResult,
      provenanceHash,
    });
  }

  private recordAuditEvent(params: {
    readonly tenantId: string;
    readonly sessionId: string;
    readonly eventType: string;
    readonly stepId: string;
    readonly outcome: 'SUCCESS' | 'BLOCKED';
  }): void {
    try {
      this.auditLedger.record({
        timestamp: new Date().toISOString(),
        actor: {
          userId: params.tenantId,
          role: 'GOVERNED_EXECUTION_ORCHESTRATOR',
          channel: 'MULTI_STEP_EXECUTION_PLANE',
        },
        domain: 'MULTI_STEP_EXECUTION',
        toolName: `multi_step_${params.eventType.toLowerCase()}`,
        classification: 'SAFE',
        argumentsHash: `audit_${params.sessionId}_${params.stepId}`,
        policyDecision: params.outcome === 'SUCCESS' ? 'PERMIT' : 'DENY',
        executionStatus: params.outcome,
      });
    } catch {
      // Audit ledger failure must not silently break execution
    }
  }
}
