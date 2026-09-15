// src/core/governedCrossFederationConvergence/GovernedConvergenceEngine.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1140 — REAL
//
// EN: Master cross-federation strategy convergence orchestrator with multi-phase consensus and OCC/CAS.
// VI: Bộ điều phối hội tụ chiến lược liên liên đoàn chủ đạo với đồng thuận đa giai đoạn và OCC/CAS.

import {
  MAX_CONVERGENCE_ROUNDS,
  MAX_CONVERGENCE_REASSESSMENTS,
  MAX_CONSECUTIVE_CONVERGENCE_FAILURES,
  MAX_CONVERGENCE_DURATION_MS,
  MAX_ACTIVE_CONVERGENCE_SESSIONS,
  GovernedCrossFederationLifecycleError,
  GovernedCrossFederationBudgetError,
  GovernedCrossFederationConcurrencyError,
  type CrossFederationConvergenceState,
  type CrossFederationLifecycleStatus,
  type CrossFederationStrategyProposal,
  type InterFederationDependency,
  computeConvergenceStateSnapshotHash,
  computeSha256,
} from './GovernedCrossFederationTypes.js';

import { CrossFederationRegistry } from './CrossFederationRegistry.js';
import { CrossFederationStrategyEngine } from './CrossFederationStrategyEngine.js';
import { CrossFederationReconciliationEngine } from './CrossFederationReconciliationEngine.js';
import { CrossFederationConflictResolver } from './CrossFederationConflictResolver.js';
import { PolicyMetaGovernanceEngine } from './PolicyMetaGovernanceEngine.js';
import { CrossFederationSecurityBoundary } from './CrossFederationSecurityBoundary.js';
import { CrossFederationContinuityPersistenceBridge } from './CrossFederationContinuityPersistenceBridge.js';

export interface CreateConvergenceSessionParams {
  readonly stateId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly participatingFederationIds: readonly string[];
}

export class GovernedConvergenceEngine {
  private readonly states = new Map<string, CrossFederationConvergenceState>();
  private readonly activeSessionsByTenant = new Map<string, Set<string>>();

  public readonly registry: CrossFederationRegistry;
  public readonly strategyEngine: CrossFederationStrategyEngine;
  public readonly reconciliationEngine: CrossFederationReconciliationEngine;
  public readonly conflictResolver: CrossFederationConflictResolver;
  public readonly policyMetaEngine: PolicyMetaGovernanceEngine;
  public readonly securityBoundary: CrossFederationSecurityBoundary;
  public readonly persistenceBridge: CrossFederationContinuityPersistenceBridge;

  constructor(
    registry?: CrossFederationRegistry,
    strategyEngine?: CrossFederationStrategyEngine,
    reconciliationEngine?: CrossFederationReconciliationEngine,
    conflictResolver?: CrossFederationConflictResolver,
    policyMetaEngine?: PolicyMetaGovernanceEngine,
    securityBoundary?: CrossFederationSecurityBoundary,
    persistenceBridge?: CrossFederationContinuityPersistenceBridge
  ) {
    this.registry = registry || new CrossFederationRegistry();
    this.strategyEngine = strategyEngine || new CrossFederationStrategyEngine();
    this.reconciliationEngine = reconciliationEngine || new CrossFederationReconciliationEngine();
    this.conflictResolver = conflictResolver || new CrossFederationConflictResolver();
    this.policyMetaEngine = policyMetaEngine || new PolicyMetaGovernanceEngine();
    this.securityBoundary = securityBoundary || new CrossFederationSecurityBoundary();
    this.persistenceBridge = persistenceBridge || new CrossFederationContinuityPersistenceBridge();
  }

  // EN: Validate legal state transitions
  // VI: Xác thực chuyển đổi trạng thái hợp lệ
  private validateTransition(current: CrossFederationLifecycleStatus, target: CrossFederationLifecycleStatus): void {
    const legalTransitions: Record<CrossFederationLifecycleStatus, CrossFederationLifecycleStatus[]> = {
      CREATED: ['VALIDATING', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      VALIDATING: ['AUTHORIZED', 'FAILED', 'INVALIDATED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      AUTHORIZED: ['STRATEGY_ALIGNING', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      STRATEGY_ALIGNING: ['RECONCILING', 'REVIEW_REQUIRED', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      RECONCILING: ['CONVERGING', 'REVIEW_REQUIRED', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      CONVERGING: ['STABLE', 'RECONCILING', 'REVIEW_REQUIRED', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      STABLE: ['COMPLETED', 'STRATEGY_ALIGNING', 'SUSPENDED', 'FAILED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      REVIEW_REQUIRED: ['VALIDATING', 'SUSPENDED', 'FAILED', 'INVALIDATED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      SUSPENDED: ['VALIDATING', 'FAILED', 'INVALIDATED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'],
      COMPLETED: [],
      FAILED: [],
      INVALIDATED: [],
      HALTED_BY_USER_STOP: [],
      HALTED_BY_EMERGENCY_STOP: [],
    };

    const allowed = legalTransitions[current] || [];
    if (!allowed.includes(target)) {
      throw new GovernedCrossFederationLifecycleError(
        `Illegal lifecycle transition: Cannot transition from ${current} to ${target}`
      );
    }
  }

  // EN: Create a new cross-federation convergence state
  // VI: Tạo trạng thái hội tụ liên liên đoàn mới
  public createSession(params: CreateConvergenceSessionParams): CrossFederationConvergenceState {
    this.securityBoundary.evaluateCheckpoint('CROSS_FED_ENTRY', params.tenantId, params.sessionId);

    // Enforce concurrent active sessions ceiling per tenant
    if (!this.activeSessionsByTenant.has(params.tenantId)) {
      this.activeSessionsByTenant.set(params.tenantId, new Set());
    }
    const tenantSessions = this.activeSessionsByTenant.get(params.tenantId)!;
    if (tenantSessions.size >= MAX_ACTIVE_CONVERGENCE_SESSIONS && !tenantSessions.has(params.sessionId)) {
      throw new GovernedCrossFederationBudgetError(
        `Budget violation: Maximum active convergence sessions exceeded (${MAX_ACTIVE_CONVERGENCE_SESSIONS}) for tenant ${params.tenantId}`,
        params.tenantId,
        params.sessionId
      );
    }

    const now = Date.now();
    const cleanState: Omit<CrossFederationConvergenceState, 'provenanceHash'> = {
      stateId: params.stateId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      missionId: params.missionId,
      objectiveId: params.objectiveId,
      participatingFederationIds: Object.freeze([...params.participatingFederationIds]),
      proposals: {},
      dependencyGraph: [],
      status: 'CREATED',
      round: 0,
      generation: 1,
      version: 1,
      reassessmentsConsumed: 0,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + MAX_CONVERGENCE_DURATION_MS,
    };

    const provenanceHash = computeConvergenceStateSnapshotHash(cleanState);
    const state: CrossFederationConvergenceState = Object.freeze({
      ...cleanState,
      provenanceHash,
    });

    this.states.set(params.sessionId, state);
    tenantSessions.add(params.sessionId);

    this.persistenceBridge.emitAudit({
      eventType: 'CROSS_FED_SESSION_CREATED',
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      humanOperatorId: 'human_operator_default',
      missionId: params.missionId,
      participatingFederationIds: params.participatingFederationIds,
      generation: 1,
      payload: { stateId: params.stateId },
    });

    return state;
  }

  // EN: Transition session lifecycle with validation and stop-checks
  // VI: Chuyển đổi vòng đời phiên với xác thực và kiểm tra dừng
  public transitionState(
    sessionId: string,
    targetStatus: CrossFederationLifecycleStatus,
    expectedVersion: number
  ): CrossFederationConvergenceState {
    const current = this.states.get(sessionId);
    if (!current) {
      throw new GovernedCrossFederationLifecycleError(`Convergence session ${sessionId} not found`);
    }

    // Check emergency and user stops
    if (this.securityBoundary.isEmergencyStopActive()) {
      targetStatus = 'HALTED_BY_EMERGENCY_STOP';
    } else if (this.securityBoundary.isUserStopActive()) {
      targetStatus = 'HALTED_BY_USER_STOP';
    }

    if (current.version !== expectedVersion) {
      throw new GovernedCrossFederationConcurrencyError(
        `OCC Version conflict: Expected ${expectedVersion} != current ${current.version}`,
        current.tenantId,
        current.sessionId
      );
    }

    // Check expiration
    if (Date.now() > current.expiresAt) {
      targetStatus = 'INVALIDATED';
    }

    this.validateTransition(current.status, targetStatus);

    const cleanState: Omit<CrossFederationConvergenceState, 'provenanceHash'> = {
      ...current,
      status: targetStatus,
      version: current.version + 1,
      updatedAt: Date.now(),
    };

    const provenanceHash = computeConvergenceStateSnapshotHash(cleanState);
    const updated: CrossFederationConvergenceState = Object.freeze({
      ...cleanState,
      provenanceHash,
    });

    this.states.set(sessionId, updated);

    // If terminal, remove from active session set
    if (['COMPLETED', 'FAILED', 'INVALIDATED', 'HALTED_BY_USER_STOP', 'HALTED_BY_EMERGENCY_STOP'].includes(targetStatus)) {
      const tenantSessions = this.activeSessionsByTenant.get(current.tenantId);
      if (tenantSessions) {
        tenantSessions.delete(sessionId);
      }
    }

    return updated;
  }

  // EN: Execute one convergence round over registered proposals and dependency graph
  // VI: Thực thi một vòng hội tụ trên các đề xuất đã đăng ký và đồ thị phụ thuộc
  public executeConvergenceRound(
    sessionId: string,
    expectedVersion: number,
    dependencies: readonly InterFederationDependency[] = []
  ): CrossFederationConvergenceState {
    let state = this.states.get(sessionId);
    if (!state) {
      throw new GovernedCrossFederationLifecycleError(`Convergence session ${sessionId} not found`);
    }

    this.securityBoundary.evaluateCheckpoint('PRE_CONVERGENCE', state.tenantId, state.sessionId);

    // Validate budget ceilings
    if (state.round >= MAX_CONVERGENCE_ROUNDS) {
      return this.transitionState(sessionId, 'REVIEW_REQUIRED', expectedVersion);
    }

    if (state.consecutiveFailures >= MAX_CONSECUTIVE_CONVERGENCE_FAILURES) {
      return this.transitionState(sessionId, 'FAILED', expectedVersion);
    }

    // Transition to STRATEGY_ALIGNING if needed
    if (state.status === 'AUTHORIZED' || state.status === 'STABLE') {
      state = this.transitionState(sessionId, 'STRATEGY_ALIGNING', expectedVersion);
      expectedVersion = state.version;
    }

    // Validate dependencies
    if (dependencies.length > 0) {
      this.strategyEngine.validateDependencyGraph(dependencies);
    }

    // Move to RECONCILING
    state = this.transitionState(sessionId, 'RECONCILING', expectedVersion);
    expectedVersion = state.version;

    const allProposals = this.registry.getAllProposals().filter((p) => p.sessionId === state!.sessionId);
    const recResult = this.reconciliationEngine.reconcileProposals(
      state.tenantId,
      state.sessionId,
      state.missionId,
      state.objectiveId,
      allProposals
    );

    if (recResult.status === 'MATERIAL_CONTRADICTION') {
      this.conflictResolver.resolveConflict({
        conflictId: `conf_${Date.now()}`,
        category: 'STRATEGY_CONFLICT',
        participatingFederationIds: recResult.reconciledFederationIds,
        description: 'Material contradiction detected among cross-federation strategy proposals',
      });
      return this.transitionState(sessionId, 'REVIEW_REQUIRED', expectedVersion);
    }

    // Move to CONVERGING
    state = this.transitionState(sessionId, 'CONVERGING', expectedVersion);
    expectedVersion = state.version;

    // Synthesize converged strategy hash
    const proposalHashes = allProposals.map((p) => p.provenanceHash).sort().join(':');
    const convergedStrategyHash = computeSha256(`converged_strategy:${proposalHashes}`);

    // Update state with round result
    const nextRound = state.round + 1;
    const cleanUpdated: Omit<CrossFederationConvergenceState, 'provenanceHash'> = {
      ...state,
      round: nextRound,
      convergedStrategyHash,
      dependencyGraph: Object.freeze([...dependencies]),
      status: 'STABLE',
      version: state.version + 1,
      updatedAt: Date.now(),
    };

    const provenanceHash = computeConvergenceStateSnapshotHash(cleanUpdated);
    const finalized: CrossFederationConvergenceState = Object.freeze({
      ...cleanUpdated,
      provenanceHash,
    });

    this.states.set(sessionId, finalized);

    // Capture snapshot
    this.persistenceBridge.captureSnapshot(finalized);

    this.persistenceBridge.emitAudit({
      eventType: 'CROSS_FED_CONVERGENCE_STABILIZED',
      tenantId: finalized.tenantId,
      sessionId: finalized.sessionId,
      humanOperatorId: 'human_operator_default',
      missionId: finalized.missionId,
      participatingFederationIds: finalized.participatingFederationIds,
      generation: finalized.generation,
      payload: { round: nextRound, convergedStrategyHash },
    });

    return finalized;
  }

  // EN: Reassess convergence state against updated environmental or policy changes
  // VI: Tái đánh giá trạng thái hội tụ đối chiếu với các thay đổi môi trường hoặc chính sách cập nhật
  public reassessConvergence(sessionId: string, expectedVersion: number): CrossFederationConvergenceState {
    const state = this.states.get(sessionId);
    if (!state) {
      throw new GovernedCrossFederationLifecycleError(`Convergence session ${sessionId} not found`);
    }

    this.securityBoundary.evaluateCheckpoint('PRE_CONVERGENCE_REASSESSMENT', state.tenantId, state.sessionId);

    if (state.reassessmentsConsumed >= MAX_CONVERGENCE_REASSESSMENTS) {
      throw new GovernedCrossFederationBudgetError(
        `Budget violation: Maximum convergence reassessments exceeded (${MAX_CONVERGENCE_REASSESSMENTS})`,
        state.tenantId,
        state.sessionId
      );
    }

    if (state.version !== expectedVersion) {
      throw new GovernedCrossFederationConcurrencyError(
        `OCC Version conflict: Expected ${expectedVersion} != current ${state.version}`,
        state.tenantId,
        state.sessionId
      );
    }

    const cleanReassessed: Omit<CrossFederationConvergenceState, 'provenanceHash'> = {
      ...state,
      reassessmentsConsumed: state.reassessmentsConsumed + 1,
      version: state.version + 1,
      updatedAt: Date.now(),
    };

    const provenanceHash = computeConvergenceStateSnapshotHash(cleanReassessed);
    const reassessed: CrossFederationConvergenceState = Object.freeze({
      ...cleanReassessed,
      provenanceHash,
    });

    this.states.set(sessionId, reassessed);

    this.persistenceBridge.emitAudit({
      eventType: 'CROSS_FED_REASSESSED',
      tenantId: reassessed.tenantId,
      sessionId: reassessed.sessionId,
      humanOperatorId: 'human_operator_default',
      missionId: reassessed.missionId,
      participatingFederationIds: reassessed.participatingFederationIds,
      generation: reassessed.generation,
      payload: { reassessmentsConsumed: reassessed.reassessmentsConsumed },
    });

    return reassessed;
  }

  public getSession(sessionId: string): CrossFederationConvergenceState | undefined {
    return this.states.get(sessionId);
  }

  public clear(): void {
    this.states.clear();
    this.activeSessionsByTenant.clear();
    this.registry.clear();
    this.conflictResolver.clear();
    this.policyMetaEngine.clear();
    this.securityBoundary.clear();
    this.persistenceBridge.clear();
  }
}
