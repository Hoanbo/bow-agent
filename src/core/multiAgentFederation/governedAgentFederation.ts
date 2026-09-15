// src/core/multiAgentFederation/governedAgentFederation.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1110 — REAL
//
// EN: Master governed multi-agent federation orchestrator coordinating collaborative agent groups.
//     Enforces membership bounds (<= 8), session federation limits (<= 3), leader coordination,
//     and downward delegation strictly without direct execution primitives.
// VI: Trình điều phối liên đoàn đa tác tử có quản trị tổng thể điều phối các nhóm tác tử hợp tác.
//     Thực thi giới hạn thành viên (<= 8), giới hạn liên đoàn phiên (<= 3), điều phối nhóm trưởng,
//     và ủy quyền hướng xuống nghiêm ngặt mà không có nguyên thủy thực thi trực tiếp.

import {
  GovernedFederationGroup,
  GovernedAgent,
  GovernedDelegation,
  FederationStatus,
  FederationCoordinationResult,
  MAX_AGENTS_PER_FEDERATION,
  MAX_ACTIVE_FEDERATIONS,
  MAX_FEDERATION_COORDINATION_CYCLES,
  MAX_DELEGATION_REASSESSMENTS,
  MAX_CONSECUTIVE_FEDERATION_FAILURES,
  MAX_FEDERATION_DURATION_MS,
  MultiAgentFederationValidationError,
  MultiAgentFederationBudgetError,
  computeSha256,
  deterministicJsonStringify,
} from './multiAgentFederationTypes.js';
import { MultiAgentIdentityRegistry } from './multiAgentIdentityRegistry.js';
import { AgentCapabilityRegistry } from './agentCapabilityRegistry.js';
import { GovernedDelegationEngine } from './governedDelegationEngine.js';
import { DelegationConflictResolver } from './delegationConflictResolver.js';
import { FederationSecurityBoundary } from './federationSecurityBoundary.js';
import { FederationContinuityPersistenceBridge } from './federationContinuityPersistenceBridge.js';
import { AgentTrustGovernanceEngine } from './agentTrustGovernanceEngine.js';

export interface CreateFederationParams {
  readonly federationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly initialAgentIds: readonly string[];
  readonly leaderAgentId: string;
}

export class GovernedAgentFederation {
  private readonly identityRegistry: MultiAgentIdentityRegistry;
  private readonly capabilityRegistry: AgentCapabilityRegistry;
  private readonly delegationEngine: GovernedDelegationEngine;
  private readonly conflictResolver: DelegationConflictResolver;
  private readonly securityBoundary: FederationSecurityBoundary;
  private readonly persistenceBridge: FederationContinuityPersistenceBridge;
  private readonly trustEngine: AgentTrustGovernanceEngine;
  private readonly federations: Map<string, GovernedFederationGroup> = new Map();

  constructor(options?: {
    readonly identityRegistry?: MultiAgentIdentityRegistry;
    readonly capabilityRegistry?: AgentCapabilityRegistry;
    readonly delegationEngine?: GovernedDelegationEngine;
    readonly conflictResolver?: DelegationConflictResolver;
    readonly securityBoundary?: FederationSecurityBoundary;
    readonly persistenceBridge?: FederationContinuityPersistenceBridge;
    readonly trustEngine?: AgentTrustGovernanceEngine;
  }) {
    this.identityRegistry = options?.identityRegistry ?? new MultiAgentIdentityRegistry();
    this.capabilityRegistry = options?.capabilityRegistry ?? new AgentCapabilityRegistry();
    this.delegationEngine = options?.delegationEngine ?? new GovernedDelegationEngine();
    this.conflictResolver = options?.conflictResolver ?? new DelegationConflictResolver();
    this.securityBoundary = options?.securityBoundary ?? new FederationSecurityBoundary();
    this.persistenceBridge = options?.persistenceBridge ?? new FederationContinuityPersistenceBridge();
    this.trustEngine = options?.trustEngine ?? new AgentTrustGovernanceEngine();
  }

  public getIdentityRegistry(): MultiAgentIdentityRegistry {
    return this.identityRegistry;
  }

  public getCapabilityRegistry(): AgentCapabilityRegistry {
    return this.capabilityRegistry;
  }

  public getDelegationEngine(): GovernedDelegationEngine {
    return this.delegationEngine;
  }

  public getSecurityBoundary(): FederationSecurityBoundary {
    return this.securityBoundary;
  }

  public getPersistenceBridge(): FederationContinuityPersistenceBridge {
    return this.persistenceBridge;
  }

  /**
   * EN: Creates and initializes a governed multi-agent federation group.
   * VI: Tạo và khởi tạo một nhóm liên đoàn đa tác tử có quản trị.
   */
  public createFederation(params: CreateFederationParams): GovernedFederationGroup {
    // 1. Checkpoint: PRE_FEDERATION_CREATION
    this.securityBoundary.assertStopInactive('PRE_FEDERATION_CREATION', params.tenantId, params.federationId);

    // 2. Active federation limit check for session
    const activeForSession = Array.from(this.federations.values()).filter(
      (f) => f.sessionId === params.sessionId && f.status !== 'COMPLETED' && f.status !== 'FAILED'
    );
    if (activeForSession.length >= MAX_ACTIVE_FEDERATIONS) {
      throw new MultiAgentFederationBudgetError(
        `Session reached MAX_ACTIVE_FEDERATIONS limit (${MAX_ACTIVE_FEDERATIONS})`,
        params.tenantId,
        params.federationId
      );
    }

    // 3. Agent count check
    if (params.initialAgentIds.length === 0 || params.initialAgentIds.length > MAX_AGENTS_PER_FEDERATION) {
      throw new MultiAgentFederationBudgetError(
        `Federation agent count must be between 1 and ${MAX_AGENTS_PER_FEDERATION}`,
        params.tenantId,
        params.federationId
      );
    }

    // 4. Validate participating agents and boundaries
    for (const agentId of params.initialAgentIds) {
      this.identityRegistry.assertAgentBoundaries(agentId, params.tenantId, params.sessionId);
    }

    // 5. Validate leader exists and is in participant list
    if (!params.initialAgentIds.includes(params.leaderAgentId)) {
      throw new MultiAgentFederationValidationError(
        `Leader agent '${params.leaderAgentId}' must be a participating agent of the federation`,
        params.tenantId,
        params.federationId
      );
    }

    const now = Date.now();
    const fedBase: Omit<GovernedFederationGroup, 'provenanceHash'> = {
      federationId: params.federationId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      missionId: params.missionId,
      objectiveId: params.objectiveId,
      participatingAgentIds: params.initialAgentIds,
      leaderAgentId: params.leaderAgentId,
      delegations: {},
      activeConflicts: [],
      status: 'INITIALIZING',
      generation: 0,
      coordinationCyclesConsumed: 0,
      reassessmentsConsumed: 0,
      consecutiveFailures: 0,
      createdAt: now,
      updatedAt: now,
    };

    const provenanceHash = computeSha256(
      `federation_group:${deterministicJsonStringify(fedBase)}`
    );

    const federation: GovernedFederationGroup = {
      ...fedBase,
      status: 'READY',
      provenanceHash,
    };

    this.federations.set(federation.federationId, federation);
    this.persistenceBridge.saveFederation(federation);
    this.persistenceBridge.emitAudit('FEDERATION_CREATED', federation.tenantId, federation.sessionId, federation.generation, {
      federationId: federation.federationId,
      participatingAgentIds: federation.participatingAgentIds,
      leaderAgentId: federation.leaderAgentId,
    }, { federationId: federation.federationId });

    return federation;
  }

  /**
   * EN: Coordinates multi-agent federation for bounded cycles.
   * VI: Điều phối liên đoàn đa tác tử trong các chu kỳ có giới hạn.
   */
  public async coordinateFederation(
    federationId: string,
    cyclesToRun = 1,
    delegationExecutor?: (delegation: GovernedDelegation) => Promise<{ success: boolean; error?: string }>
  ): Promise<FederationCoordinationResult> {
    const federation = this.federations.get(federationId);
    if (!federation) {
      throw new MultiAgentFederationValidationError(`Federation '${federationId}' not found`);
    }

    this.securityBoundary.assertStopInactive('FEDERATION_ENTRY', federation.tenantId, federation.federationId);

    let currentStatus: FederationStatus = federation.status === 'READY' ? 'COORDINATING' : federation.status;
    let cyclesConsumed = federation.coordinationCyclesConsumed;
    let reassessmentsConsumed = federation.reassessmentsConsumed;
    let consecutiveFailures = federation.consecutiveFailures;
    let completedDelegations = 0;
    let failedDelegations = 0;

    const boundCycles = Math.min(cyclesToRun, MAX_FEDERATION_COORDINATION_CYCLES);

    // Bounded loop: zero unbounded loops, strictly bounded by boundCycles
    for (let c = 0; c < boundCycles; c++) {
      if (cyclesConsumed >= MAX_FEDERATION_COORDINATION_CYCLES) {
        currentStatus = 'SUSPENDED';
        break;
      }
      if (Date.now() - federation.createdAt >= MAX_FEDERATION_DURATION_MS) {
        currentStatus = 'SUSPENDED';
        break;
      }
      if (consecutiveFailures >= MAX_CONSECUTIVE_FEDERATION_FAILURES) {
        currentStatus = 'REVIEW_REQUIRED';
        break;
      }

      cyclesConsumed++;

      // Reassessment & continuity checkpoint
      this.securityBoundary.assertStopInactive('PRE_FEDERATION_REASSESSMENT', federation.tenantId, federation.federationId);
      reassessmentsConsumed++;

      this.persistenceBridge.recordSnapshot({
        federationId: federation.federationId,
        tenantId: federation.tenantId,
        sessionId: federation.sessionId,
        coordinationCycle: cyclesConsumed,
        federationStatus: currentStatus,
        participatingAgentIds: federation.participatingAgentIds,
        leaderAgentId: federation.leaderAgentId,
        delegationIds: Object.keys(federation.delegations),
        activeConflicts: federation.activeConflicts,
        generation: federation.generation,
        environmentalFingerprint: `env_fed_${federation.federationId}_cycle_${cyclesConsumed}`,
      });

      // Handle active delegations through downstream delegationExecutor
      const activeDelegations = Object.values(federation.delegations).filter((d) => d.status === 'ACTIVE');
      for (const d of activeDelegations) {
        this.securityBoundary.assertStopInactive('PRE_DELEGATION_EXECUTION_HANDOFF', federation.tenantId, federation.federationId);

        let success = true;
        if (delegationExecutor) {
          try {
            const res = await delegationExecutor(d);
            success = res.success;
          } catch {
            success = false;
          }
        }

        if (success) {
          this.delegationEngine.updateDelegationStatus(d.delegationId, 'COMPLETED');
          completedDelegations++;
          consecutiveFailures = 0;
          this.persistenceBridge.emitAudit('DELEGATION_COMPLETED', federation.tenantId, federation.sessionId, federation.generation, {
            delegationId: d.delegationId,
          }, { federationId: federation.federationId, delegationId: d.delegationId });
        } else {
          this.delegationEngine.updateDelegationStatus(d.delegationId, 'FAILED');
          failedDelegations++;
          consecutiveFailures++;
          this.persistenceBridge.emitAudit('DELEGATION_FAILED', federation.tenantId, federation.sessionId, federation.generation, {
            delegationId: d.delegationId,
          }, { federationId: federation.federationId, delegationId: d.delegationId });
        }
      }

      if (activeDelegations.length === 0 || completedDelegations === Object.keys(federation.delegations).length) {
        currentStatus = 'COMPLETED';
        break;
      }
    }

    const updatedFed: GovernedFederationGroup = {
      ...federation,
      status: currentStatus,
      coordinationCyclesConsumed: cyclesConsumed,
      reassessmentsConsumed,
      consecutiveFailures,
      updatedAt: Date.now(),
      provenanceHash: computeSha256(`updated_fed:${federation.federationId}:${cyclesConsumed}`),
    };

    this.federations.set(updatedFed.federationId, updatedFed);
    this.persistenceBridge.saveFederation(updatedFed);

    return {
      federationId: updatedFed.federationId,
      tenantId: updatedFed.tenantId,
      finalStatus: currentStatus,
      completedSuccessfully: currentStatus === 'COMPLETED',
      totalCyclesExecuted: cyclesConsumed,
      totalDelegationsCompleted: completedDelegations,
      totalDelegationsFailed: failedDelegations,
      finalSnapshotHash: this.persistenceBridge.getLastSnapshotHash(),
      auditChainHeadHash: this.persistenceBridge.getLastAuditHash(),
      summaryDetails: `Federation concluded in status ${currentStatus}`,
    };
  }
}
