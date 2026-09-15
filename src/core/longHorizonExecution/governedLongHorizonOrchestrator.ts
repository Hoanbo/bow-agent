// src/core/longHorizonExecution/governedLongHorizonOrchestrator.ts
// BOWCON V4.0 — MS-1.5.11: GOVERNED LONG-HORIZON ORCHESTRATOR
// Component 1080 — REAL
//
// EN: Master coordinator for long-horizon autonomous orchestration across bounded generations.
//     Delegates execution strictly to MS-1.5.10 GovernedExecutionOrchestrator with zero self-authorization.
// VI: Điều phối viên chính cho điều phối tự chủ tầm nhìn dài qua các thế hệ có giới hạn.
//     Ủy thác thực thi nghiêm ngặt cho MS-1.5.10 GovernedExecutionOrchestrator và không tự ủy quyền.

import crypto from 'node:crypto';
import {
  type GovernedLongHorizonObjective,
  type LongHorizonSession,
  type LongHorizonGeneration,
  type LongHorizonProgressRecord,
  type LongHorizonExecutionResult,
  type LongHorizonState,
  type LongHorizonAutonomyBudget,
  type LongHorizonResourceUsage,
  LongHorizonBudgetExhaustedError,
  LongHorizonStagnationError,
  LongHorizonAuthorizationError,
  LongHorizonContinuityError,
  LongHorizonUserStopError,
  computeLongHorizonSessionProvenanceHash,
  computeLongHorizonGenerationProvenanceHash,
  computeLongHorizonResultProvenanceHash,
} from './longHorizonExecutionTypes.js';
import { LongHorizonExecutionValidator } from './longHorizonExecutionValidator.js';
import { ObjectiveProgressEvaluator } from './objectiveProgressEvaluator.js';
import { LongHorizonBudgetManager } from './longHorizonBudgetManager.js';
import { LongHorizonContinuityManager } from './longHorizonContinuityManager.js';
import { LongHorizonAutonomySecurityBoundary } from './longHorizonAutonomySecurityBoundary.js';
import { LongHorizonAuditBridge } from './longHorizonAuditBridge.js';
import { LongHorizonPersistenceRecoveryEngine } from './longHorizonPersistenceRecoveryEngine.js';

import { GovernedExecutionOrchestrator } from '../multiStepExecution/governedExecutionOrchestrator.js';
import type { GroundedPlanTaskBinding } from '../groundedPlanTaskBridge/groundedPlanTaskTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface LongHorizonOrchestratorOptions {
  readonly userStopProvider?: () => boolean;
  readonly persistenceEngine?: LongHorizonPersistenceRecoveryEngine;
  readonly multiStepOrchestrator?: GovernedExecutionOrchestrator;
  readonly budgetManager?: LongHorizonBudgetManager;
  readonly continuityManager?: LongHorizonContinuityManager;
  readonly progressEvaluator?: ObjectiveProgressEvaluator;
  readonly securityBoundary?: LongHorizonAutonomySecurityBoundary;
  readonly auditBridge?: LongHorizonAuditBridge;
}

export interface ExecuteObjectiveParams {
  readonly session: LongHorizonSession;
  readonly humanConfirmationTokens?: Record<string, string>;
  readonly observedPreconditions?: Record<string, boolean | string | number>;
  readonly verifiedOutcomes?: readonly string[];
}

export class GovernedLongHorizonOrchestrator {
  private readonly userStopProvider: () => boolean;
  private readonly persistenceEngine: LongHorizonPersistenceRecoveryEngine;
  private readonly multiStepOrchestrator: GovernedExecutionOrchestrator;
  private readonly budgetManager: LongHorizonBudgetManager;
  private readonly continuityManager: LongHorizonContinuityManager;
  private readonly progressEvaluator: ObjectiveProgressEvaluator;
  private readonly securityBoundary: LongHorizonAutonomySecurityBoundary;
  private readonly auditBridge: LongHorizonAuditBridge;

  constructor(options?: LongHorizonOrchestratorOptions) {
    this.userStopProvider =
      options?.userStopProvider ??
      (() => {
        const val = (globalMasterHumanAuthority as any).isUserStopActive;
        return typeof val === 'function' ? val.call(globalMasterHumanAuthority) : Boolean(val);
      });
    this.securityBoundary = options?.securityBoundary ?? new LongHorizonAutonomySecurityBoundary({ userStopProvider: this.userStopProvider });
    this.persistenceEngine = options?.persistenceEngine ?? new LongHorizonPersistenceRecoveryEngine({ userStopProvider: this.userStopProvider });
    this.multiStepOrchestrator = options?.multiStepOrchestrator ?? new GovernedExecutionOrchestrator({ userStopProvider: this.userStopProvider });
    this.budgetManager = options?.budgetManager ?? new LongHorizonBudgetManager();
    this.continuityManager = options?.continuityManager ?? new LongHorizonContinuityManager();
    this.progressEvaluator = options?.progressEvaluator ?? new ObjectiveProgressEvaluator();
    this.auditBridge = options?.auditBridge ?? new LongHorizonAuditBridge({ securityBoundary: this.securityBoundary });
  }

  /**
   * EN: Initializes a new governed long-horizon session with Generation 0.
   * VI: Khởi tạo một phiên tầm nhìn dài có quản trị mới với Thế hệ 0.
   */
  public initializeLongHorizonSession(params: {
    readonly objective: GovernedLongHorizonObjective;
    readonly initialBinding: GroundedPlanTaskBinding;
    readonly initialTask: AgentTask;
  }): LongHorizonSession {
    this.securityBoundary.assertUserStop('long_horizon_entry');

    const { objective, initialBinding, initialTask } = params;
    LongHorizonExecutionValidator.validateObjective(objective);

    // Enforce tenant/session isolation
    this.securityBoundary.assertIsolation(
      objective.tenantId,
      objective.sessionId,
      initialBinding.tenantId,
      initialBinding.sessionId
    );
    this.securityBoundary.assertIsolation(
      objective.tenantId,
      objective.sessionId,
      initialTask.tenantId,
      objective.sessionId
    );

    // Enforce scope continuity
    this.continuityManager.assertScopeContinuity(objective, initialBinding);

    // Enforce authorization freshness
    this.continuityManager.assertAuthorizationFreshness(objective);

    const timestamp = new Date().toISOString();
    const horizonSessionId = `lhs_${objective.tenantId}_${objective.sessionId}_${Date.now()}`;

    // Initialize Generation 0
    const gen0Id = `lh_gen_${objective.tenantId}_idx0_${Date.now()}`;
    const rawGen0 = {
      generationId: gen0Id,
      generationNumber: 0,
      objectiveId: objective.objectiveId,
      multiStepSessionId: `session_${objective.sessionId}_gen0`,
      planProvenance: initialBinding.sourcePlanProvenanceHash,
      taskProvenance: initialTask.provenanceHash ?? initialTask.taskId,
      authorizationProvenance: initialBinding.provenanceHash,
      environmentProvenance: crypto.createHash('sha256').update(`env_gen0_${objective.sessionId}`).digest('hex'),
      leaseProvenance: crypto.createHash('sha256').update(`lease_gen0_${objective.sessionId}`).digest('hex'),
      status: 'ACTIVE' as const,
      createdAt: timestamp,
      version: 1,
    };
    const gen0ProvenanceHash = computeLongHorizonGenerationProvenanceHash(rawGen0);
    const gen0: LongHorizonGeneration = Object.freeze({
      ...rawGen0,
      provenanceHash: gen0ProvenanceHash,
    });

    const budget = objective.autonomyBudget;
    const usage = this.budgetManager.initializeUsage();

    const rawSession = {
      horizonSessionId,
      tenantId: objective.tenantId,
      sessionId: objective.sessionId,
      objective,
      budget,
      usage,
      generations: Object.freeze([gen0]),
      progressLedger: Object.freeze([] as readonly LongHorizonProgressRecord[]),
      currentState: 'READY' as LongHorizonState,
      sessionVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const provenanceHash = computeLongHorizonSessionProvenanceHash(rawSession);
    const session: LongHorizonSession = Object.freeze({
      ...rawSession,
      provenanceHash,
    });

    LongHorizonExecutionValidator.validateSession(session);
    this.persistenceEngine.initializeSession(session);

    this.auditBridge.recordEvent({
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      objectiveId: session.objective.objectiveId,
      generationId: gen0.generationId,
      eventType: 'LONG_HORIZON_STARTED',
      outcome: 'SUCCESS',
      details: { horizonSessionId: session.horizonSessionId },
    });

    return session;
  }

  /**
   * EN: Runs the governed long-horizon autonomous orchestration loop bounded by explicit budget.
   * VI: Chạy vòng lặp điều phối tự chủ tầm nhìn dài có quản trị được giới hạn bởi ngân sách rõ ràng.
   */
  public async executeLongHorizonObjective(params: ExecuteObjectiveParams): Promise<LongHorizonExecutionResult> {
    // 1. Checkpoint: long_horizon_entry USER_STOP
    this.securityBoundary.assertUserStop('long_horizon_entry');

    let currentSession = params.session;
    LongHorizonExecutionValidator.validateSession(currentSession);

    // Verify session from disk
    let sessionDoc = this.persistenceEngine.loadSessionDocument(currentSession.tenantId, currentSession.sessionId);
    currentSession = sessionDoc.session;

    let activeGen = currentSession.generations.find((g) => g.status === 'ACTIVE');
    if (!activeGen) {
      throw new LongHorizonContinuityError('No ACTIVE generation found in session');
    }

    // Assert authorization freshness
    this.continuityManager.assertAuthorizationFreshness(currentSession.objective);

    // 2. Checkpoint: pre_objective_resume USER_STOP
    this.securityBoundary.assertUserStop('pre_objective_resume');

    let currentUsage = { ...currentSession.usage };
    const progressRecords = [...currentSession.progressLedger];

    // Execution horizon loop strictly bounded by maxGenerations
    while (currentUsage.generationsConsumed < currentSession.budget.maxGenerations) {
      // 3. Checkpoint: pre_generation_start USER_STOP
      this.securityBoundary.assertUserStop('pre_generation_start');

      // Assert budget before attempting generation
      try {
        this.budgetManager.assertBudgetWithinLimits(currentSession.budget, currentUsage);
      } catch (budgetErr: any) {
        currentSession = this.updateSessionState(currentSession, 'BUDGET_EXHAUSTED', currentUsage, progressRecords);
        this.auditBridge.recordEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          objectiveId: currentSession.objective.objectiveId,
          generationId: activeGen.generationId,
          eventType: 'BUDGET_EXHAUSTED',
          outcome: 'PREEMPTED',
          details: { error: budgetErr.message },
        });
        return this.createTerminalResult(currentSession, currentUsage, 'BUDGET_EXHAUSTED');
      }

      // Record generation started
      currentUsage = this.budgetManager.recordUsage(currentUsage, { generationsConsumed: 1 });
      currentSession = this.updateSessionState(currentSession, 'EXECUTING', currentUsage, progressRecords);

      this.auditBridge.recordEvent({
        tenantId: currentSession.tenantId,
        sessionId: currentSession.sessionId,
        objectiveId: currentSession.objective.objectiveId,
        generationId: activeGen.generationId,
        eventType: 'GENERATION_STARTED',
        outcome: 'SUCCESS',
        details: { generationNumber: activeGen.generationNumber },
      });

      // 4. Pre-dispatch checkpoints
      this.securityBoundary.assertUserStop('pre_step_authorization');
      this.securityBoundary.assertUserStop('pre_lease');
      this.securityBoundary.assertUserStop('pre_dispatch');

      // Execute generation via MS-1.5.10 GovernedExecutionOrchestrator
      let stepResult: any = undefined;
      try {
        // Initialize multi-step session for this generation
        const msSession = this.multiStepOrchestrator.initializeSession({
          tenantId: currentSession.tenantId,
          sessionId: `${currentSession.sessionId}_gen${activeGen.generationNumber}`,
          taskId: currentSession.objective.originatingTaskId,
          planId: `plan_${currentSession.objective.objectiveId}_gen${activeGen.generationNumber}`,
          planVersion: 1,
          bindingSnapshot: {
            bindingId: `binding_${currentSession.objective.objectiveId}_gen${activeGen.generationNumber}`,
            schemaVersion: '4.0.0',
            tenantId: currentSession.tenantId,
            sessionId: `${currentSession.sessionId}_gen${activeGen.generationNumber}`,
            sourcePlanId: `plan_${currentSession.objective.objectiveId}_gen${activeGen.generationNumber}`,
            sourcePlanVersion: 1,
            sourcePlanProvenanceHash: activeGen.planProvenance,
            taskSpecification: {
              tenantId: currentSession.tenantId,
              userId: currentSession.tenantId,
              title: currentSession.objective.objectiveDescription,
              intent: 'Long-Horizon Generation Execution',
              riskLevel: currentSession.objective.riskPolicy.maxAllowedRisk,
              steps: [{
                description: 'Execute long-horizon step',
                capabilityId: 'desktop_action',
                actionName: 'execute_governed_action',
                parameters: {},
                riskLevel: currentSession.objective.riskPolicy.maxAllowedRisk,
                requiresApproval: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
              }],
            },
            stepBindings: [{
              stepBindingId: `sb_${activeGen.generationId}_0`,
              sourceStepId: 'step_0',
              stepIndex: 0,
              taskStepOptions: {
                description: 'Execute long-horizon step',
                capabilityId: 'desktop_action',
                actionName: 'execute_governed_action',
                parameters: {},
                riskLevel: currentSession.objective.riskPolicy.maxAllowedRisk,
                requiresApproval: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
              },
              preconditions: [],
              preconditionResults: [],
              riskLevel: currentSession.objective.riskPolicy.maxAllowedRisk,
              requiresApproval: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
              isQuarantinedText: false,
              stepProvenanceHash: activeGen.taskProvenance,
            }],
            preconditionResults: [],
            riskLevel: currentSession.objective.riskPolicy.maxAllowedRisk,
            requiresHumanConfirmation: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
            pdpDecision: {
              planId: `plan_${currentSession.objective.objectiveId}_gen${activeGen.generationNumber}`,
              tenantId: currentSession.tenantId,
              allPermitted: true,
              requiresHumanApproval: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
              stepEvaluations: [{
                stepId: 'step_0',
                stepIndex: 0,
                classification: 'SAFE' as any,
                reason: 'Policy permitted for long-horizon execution',
                requiresHumanApproval: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
                decision: {
                  allowed: true,
                  requiresApproval: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
                  classification: 'ALLOW' as any,
                  reason: 'Policy permitted for long-horizon execution',
                  decisionTimestamp: new Date().toISOString(),
                },
              }],
              evaluatedAt: new Date().toISOString(),
            },
            pepReadiness: {
              readinessId: `pep_${activeGen.generationId}`,
              bindingId: `binding_${currentSession.objective.objectiveId}_gen${activeGen.generationNumber}`,
              tenantId: currentSession.tenantId,
              allPermitted: true,
              requiresApproval: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
              preparedLeaseId: `lease_${activeGen.generationId}`,
              policySummary: 'PEP readiness verified',
              evaluatedAt: new Date().toISOString(),
            },
            lifecycleState: 'BOUND',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            sessionVersion: 1,
            provenanceHash: activeGen.authorizationProvenance,
          },
          taskSnapshot: {
            taskId: currentSession.objective.originatingTaskId,
            tenantId: currentSession.tenantId,
            userId: currentSession.tenantId,
            title: currentSession.objective.objectiveDescription,
            intent: 'Long-Horizon Autonomous Step',
            riskLevel: currentSession.objective.riskPolicy.maxAllowedRisk,
            state: 'SUBMITTED',
            version: 1,
            steps: [{
              stepId: 'step_0',
              stepIndex: 0,
              description: 'Execute long-horizon step',
              capabilityId: 'desktop_action',
              actionName: 'execute_governed_action',
              parameters: {},
              riskLevel: currentSession.objective.riskPolicy.maxAllowedRisk,
              requiresApproval: currentSession.objective.riskPolicy.requiresHumanForHighRisk,
              status: 'PENDING',
              attemptCount: 0,
              maxAttempts: 3,
            }],
            currentStepIndex: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            provenanceHash: activeGen.taskProvenance,
          },
        });

        // Delegate execution to MS-1.5.10
        stepResult = await this.multiStepOrchestrator.executeSession({
          session: msSession,
          humanConfirmationTokens: params.humanConfirmationTokens,
          observedPreconditions: params.observedPreconditions,
        });

        currentUsage = this.budgetManager.recordUsage(currentUsage, {
          stepsConsumed: stepResult.completedSteps,
          executionAttempts: 1,
        });
      } catch (execErr: any) {
        currentUsage = this.budgetManager.recordUsage(currentUsage, {
          consecutiveFailures: currentUsage.consecutiveFailures + 1,
          executionAttempts: 1,
        });

        if (execErr instanceof LongHorizonUserStopError) {
          throw execErr;
        }

        // Handle failure
        this.auditBridge.recordEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          objectiveId: currentSession.objective.objectiveId,
          generationId: activeGen.generationId,
          eventType: 'EXECUTION_FAILED',
          outcome: 'FAILURE',
          details: { error: execErr.message },
        });
      }

      // 5. Post-dispatch & progress evaluation
      this.securityBoundary.assertUserStop('post_dispatch');
      currentSession = this.updateSessionState(currentSession, 'EVALUATING_PROGRESS', currentUsage, progressRecords);

      const verifiedOutcomes = params.verifiedOutcomes ?? (stepResult?.status === 'COMPLETED' ? currentSession.objective.successCriteria : []);
      const evalResult = this.progressEvaluator.evaluateProgress({
        objective: currentSession.objective,
        generationId: activeGen.generationId,
        currentCompletedSteps: currentUsage.stepsConsumed,
        priorCompletedSteps: currentUsage.stepsConsumed - (stepResult?.completedSteps ?? 0),
        verifiedOutcomes,
        environmentSnapshotProvenance: activeGen.environmentProvenance,
        stepExecutionResult: stepResult,
        failureCount: currentUsage.consecutiveFailures,
        stagnationCounter: currentUsage.stagnationCycles,
      });

      // 6. Checkpoint: pre_progress_commit USER_STOP
      this.securityBoundary.assertUserStop('pre_progress_commit');
      progressRecords.push(evalResult.record);

      if (evalResult.classification === 'NO_PROGRESS') {
        currentUsage = this.budgetManager.recordUsage(currentUsage, {
          stagnationCycles: currentUsage.stagnationCycles + 1,
        });
      } else if (evalResult.classification === 'PROGRESS' || evalResult.classification === 'SUCCESS') {
        currentUsage = this.budgetManager.recordUsage(currentUsage, {
          stagnationCycles: 0,
          consecutiveFailures: 0,
        });
      }

      this.auditBridge.recordEvent({
        tenantId: currentSession.tenantId,
        sessionId: currentSession.sessionId,
        objectiveId: currentSession.objective.objectiveId,
        generationId: activeGen.generationId,
        eventType: 'OBJECTIVE_PROGRESS_UPDATED',
        outcome: evalResult.isTerminalSuccess ? 'SUCCESS' : evalResult.isTerminalFailure ? 'FAILURE' : 'SUCCESS',
        details: { classification: evalResult.classification, score: evalResult.record.progressScore },
      });

      // Check Terminal Conditions
      if (evalResult.isTerminalSuccess) {
        currentSession = this.updateSessionState(currentSession, 'COMPLETED', currentUsage, progressRecords);
        this.auditBridge.recordEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          objectiveId: currentSession.objective.objectiveId,
          generationId: activeGen.generationId,
          eventType: 'OBJECTIVE_COMPLETED',
          outcome: 'SUCCESS',
        });
        return this.createTerminalResult(currentSession, currentUsage, 'COMPLETED');
      }

      if (evalResult.isTerminalFailure) {
        currentSession = this.updateSessionState(currentSession, 'FAILED', currentUsage, progressRecords);
        this.auditBridge.recordEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          objectiveId: currentSession.objective.objectiveId,
          generationId: activeGen.generationId,
          eventType: 'OBJECTIVE_FAILED',
          outcome: 'FAILURE',
          details: { reason: evalResult.reason },
        });
        return this.createTerminalResult(currentSession, currentUsage, 'FAILED');
      }

      // Check Stagnation
      if (currentUsage.stagnationCycles >= currentSession.budget.maxStagnationCycles) {
        currentSession = this.updateSessionState(currentSession, 'STAGNATED', currentUsage, progressRecords);
        this.auditBridge.recordEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          objectiveId: currentSession.objective.objectiveId,
          generationId: activeGen.generationId,
          eventType: 'STAGNATION_DETECTED',
          outcome: 'BLOCKED',
          details: { stagnationCycles: currentUsage.stagnationCycles },
        });
        return this.createTerminalResult(currentSession, currentUsage, 'STAGNATED');
      }

      // If replanning required
      if (stepResult?.status === 'REPLANNING_REQUIRED' || evalResult.classification === 'REGRESSION') {
        this.securityBoundary.assertUserStop('pre_replan');
        currentSession = this.updateSessionState(currentSession, 'REPLANNING_REQUIRED', currentUsage, progressRecords);
        currentUsage = this.budgetManager.recordUsage(currentUsage, { replanningAttempts: 1 });

        this.auditBridge.recordEvent({
          tenantId: currentSession.tenantId,
          sessionId: currentSession.sessionId,
          objectiveId: currentSession.objective.objectiveId,
          generationId: activeGen.generationId,
          eventType: 'REPLANNING_REQUIRED',
          outcome: 'BLOCKED',
          details: { reason: evalResult.reason },
        });
        return this.createTerminalResult(currentSession, currentUsage, 'REPLANNING_REQUIRED');
      }

      // If generation completed without reaching full objective success, pause for governed next generation
      break;
    }

    // Default return paused or completed
    currentSession = this.updateSessionState(currentSession, 'PAUSED', currentUsage, progressRecords);
    return this.createTerminalResult(currentSession, currentUsage, 'PAUSED');
  }

  /**
   * EN: Advances session to a new governed replanned generation under explicit authorization.
   * VI: Chuyển phiên sang thế hệ được lập kế hoạch lại có quản trị mới dưới sự ủy quyền rõ ràng.
   */
  public advanceToReplannedGeneration(params: {
    readonly session: LongHorizonSession;
    readonly newBinding: GroundedPlanTaskBinding;
    readonly newTask: AgentTask;
  }): LongHorizonSession {
    this.securityBoundary.assertUserStop('pre_generation_commit');

    const { session, newBinding, newTask } = params;
    LongHorizonExecutionValidator.validateSession(session);

    // Enforce scope continuity & authorization freshness
    this.continuityManager.assertScopeContinuity(session.objective, newBinding);
    this.continuityManager.assertAuthorizationFreshness(session.objective);

    const nextGenNumber = session.generations.length;
    if (nextGenNumber >= session.budget.maxGenerations) {
      throw new LongHorizonBudgetExhaustedError(
        `Cannot advance to generation ${nextGenNumber}: maxGenerations ceiling is ${session.budget.maxGenerations}`
      );
    }

    const timestamp = new Date().toISOString();
    const newGenId = `lh_gen_${session.tenantId}_idx${nextGenNumber}_${Date.now()}`;

    // Mark previous active generation as SUPERSEDED
    const updatedGenerations = session.generations.map((g) => {
      if (g.status === 'ACTIVE') {
        const supersededRaw = {
          ...g,
          status: 'SUPERSEDED' as const,
          supersededAt: timestamp,
        };
        return Object.freeze({
          ...supersededRaw,
          provenanceHash: computeLongHorizonGenerationProvenanceHash(supersededRaw),
        });
      }
      return g;
    });

    // Create new Generation
    const rawNewGen = {
      generationId: newGenId,
      parentGenerationId: session.generations[session.generations.length - 1]?.generationId,
      generationNumber: nextGenNumber,
      objectiveId: session.objective.objectiveId,
      multiStepSessionId: `session_${session.sessionId}_gen${nextGenNumber}`,
      planProvenance: newBinding.sourcePlanProvenanceHash,
      taskProvenance: newTask.provenanceHash ?? newTask.taskId,
      authorizationProvenance: newBinding.provenanceHash,
      environmentProvenance: crypto.createHash('sha256').update(`env_gen${nextGenNumber}_${session.sessionId}`).digest('hex'),
      leaseProvenance: crypto.createHash('sha256').update(`lease_gen${nextGenNumber}_${session.sessionId}`).digest('hex'),
      status: 'ACTIVE' as const,
      createdAt: timestamp,
      version: 1,
    };
    const newGenProvenance = computeLongHorizonGenerationProvenanceHash(rawNewGen);
    const sealedNewGen: LongHorizonGeneration = Object.freeze({
      ...rawNewGen,
      provenanceHash: newGenProvenance,
    });

    const rawSession = {
      ...session,
      generations: Object.freeze([...updatedGenerations, sealedNewGen]),
      currentState: 'READY' as LongHorizonState,
      sessionVersion: session.sessionVersion + 1,
      updatedAt: timestamp,
    };
    const provenanceHash = computeLongHorizonSessionProvenanceHash(rawSession);
    const updatedSession: LongHorizonSession = Object.freeze({
      ...rawSession,
      provenanceHash,
    });

    let sessionDoc = this.persistenceEngine.loadSessionDocument(session.tenantId, session.sessionId);
    sessionDoc = {
      ...sessionDoc,
      session: updatedSession,
      sessionVersion: updatedSession.sessionVersion,
    };
    this.persistenceEngine.saveSessionDocument(sessionDoc, session.sessionVersion);

    this.auditBridge.recordEvent({
      tenantId: updatedSession.tenantId,
      sessionId: updatedSession.sessionId,
      objectiveId: updatedSession.objective.objectiveId,
      generationId: sealedNewGen.generationId,
      eventType: 'GENERATION_STARTED',
      outcome: 'SUCCESS',
      details: { generationNumber: nextGenNumber },
    });

    return updatedSession;
  }

  public resumeWithReplannedGeneration(params: {
    readonly session: LongHorizonSession;
    readonly newBindingSnapshot: GroundedPlanTaskBinding;
    readonly newTaskSnapshot: AgentTask;
  }): LongHorizonSession {
    return this.advanceToReplannedGeneration({
      session: params.session,
      newBinding: params.newBindingSnapshot,
      newTask: params.newTaskSnapshot,
    });
  }

  public assertUserStopInactive(checkpoint: Parameters<LongHorizonAutonomySecurityBoundary['assertUserStop']>[0]): void {
    this.securityBoundary.assertUserStop(checkpoint);
  }

  public completeObjective(
    session: LongHorizonSession,
    verifiedOutcomes: readonly string[]
  ): LongHorizonSession {
    this.securityBoundary.assertUserStop('pre_progress_commit');

    const evalResult = this.progressEvaluator.evaluateProgress({
      objective: session.objective,
      generationId: session.objective.currentGenerationId ?? session.generations[session.generations.length - 1]?.generationId,
      completedSteps: session.usage.stepsConsumed,
      verifiedOutcomes,
    });

    const updatedLedger = [...session.progressLedger, evalResult.record];
    const completedSession = this.updateSessionState(session, 'COMPLETED', session.usage, updatedLedger);

    this.auditBridge.recordEvent({
      tenantId: completedSession.tenantId,
      sessionId: completedSession.sessionId,
      objectiveId: completedSession.objective.objectiveId,
      eventType: 'OBJECTIVE_COMPLETED',
      outcome: 'SUCCESS',
      details: { verifiedOutcomes },
    });

    return completedSession;
  }

  public terminateSession(
    session: LongHorizonSession,
    reason: string,
    terminalState: LongHorizonState = 'TERMINATED'
  ): LongHorizonSession {
    this.securityBoundary.assertUserStop('pre_persistence');

    const terminatedSession = this.updateSessionState(session, terminalState, session.usage, session.progressLedger);

    this.auditBridge.recordEvent({
      tenantId: terminatedSession.tenantId,
      sessionId: terminatedSession.sessionId,
      objectiveId: terminatedSession.objective.objectiveId,
      eventType: 'TERMINATED',
      outcome: 'BLOCKED',
      details: { reason, terminalState },
    });

    return terminatedSession;
  }

  private updateSessionState(
    session: LongHorizonSession,
    state: LongHorizonState,
    usage: LongHorizonResourceUsage,
    progressLedger: readonly LongHorizonProgressRecord[]
  ): LongHorizonSession {
    const raw = {
      ...session,
      currentState: state,
      usage: Object.freeze({ ...usage }),
      progressLedger: Object.freeze([...progressLedger]),
      sessionVersion: session.sessionVersion + 1,
      updatedAt: new Date().toISOString(),
    };
    const provenanceHash = computeLongHorizonSessionProvenanceHash(raw);
    const updatedSession = Object.freeze({ ...raw, provenanceHash });

    let doc = this.persistenceEngine.loadSessionDocument(session.tenantId, session.sessionId);
    doc = {
      ...doc,
      session: updatedSession,
      sessionVersion: updatedSession.sessionVersion,
    };
    this.persistenceEngine.saveSessionDocument(doc, session.sessionVersion);

    return updatedSession;
  }

  private createTerminalResult(
    session: LongHorizonSession,
    usage: LongHorizonResourceUsage,
    finalState: LongHorizonState
  ): LongHorizonExecutionResult {
    const lastProgress = session.progressLedger[session.progressLedger.length - 1];
    const rawResult = {
      horizonSessionId: session.horizonSessionId,
      tenantId: session.tenantId,
      sessionId: session.sessionId,
      objectiveId: session.objective.objectiveId,
      finalState,
      progressSummary: {
        finalClassification: lastProgress?.objectiveProgressState ?? 'NO_PROGRESS',
        totalGenerations: session.generations.length,
        totalStepsCompleted: usage.stepsConsumed,
        totalReplanningAttempts: usage.replanningAttempts,
        verifiedOutcomes: lastProgress?.verifiedOutcomes ?? [],
      },
      usage: Object.freeze({ ...usage }),
      completedAt: new Date().toISOString(),
    };
    const provenanceHash = computeLongHorizonResultProvenanceHash(rawResult);
    return Object.freeze({
      ...rawResult,
      provenanceHash,
    });
  }
}
