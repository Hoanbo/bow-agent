// src/core/governedFederatedKnowledgeState/GovernedKnowledgeStateEngine.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1130 — REAL
//
// EN: Primary orchestrator managing governed knowledge states, versioning with OCC/CAS,
//     hard capacity bounds, and synchronous safety gates without execution authority.
// VI: Trình điều phối chính quản lý các trạng thái tri thức có quản trị, kiểm soát phiên bản
//     với OCC/CAS, các giới hạn dung lượng cứng, và cổng an toàn đồng bộ mà không có thẩm quyền thực thi.

import {
  KnowledgeState,
  GovernedKnowledgeEntry,
  KnowledgeLifecycleStatus,
  MAX_KNOWLEDGE_ENTRIES_PER_FEDERATION,
  MAX_KNOWLEDGE_ENTRIES_PER_AGENT,
  MAX_KNOWLEDGE_STATE_SIZE,
  MAX_ACTIVE_KNOWLEDGE_STATES,
  MAX_KNOWLEDGE_STATE_DURATION_MS,
  MAX_KNOWLEDGE_REASSESSMENTS,
  GovernedFederatedKnowledgeStateValidationError,
  GovernedFederatedKnowledgeStateTenantIsolationError,
  GovernedFederatedKnowledgeStateSessionIsolationError,
  GovernedFederatedKnowledgeStateBudgetError,
  GovernedFederatedKnowledgeStateConcurrencyError,
  computeKnowledgeStateSnapshotHash,
} from './GovernedFederatedKnowledgeStateTypes.js';
import { FederatedKnowledgeRegistry } from './FederatedKnowledgeRegistry.js';
import { FederatedKnowledgeSecurityBoundary } from './FederatedKnowledgeSecurityBoundary.js';
import { KnowledgeLineageEngine } from './KnowledgeLineageEngine.js';
import { KnowledgeMergeReconciliationEngine } from './KnowledgeMergeReconciliationEngine.js';
import { KnowledgeConflictResolver } from './KnowledgeConflictResolver.js';
import { CollectiveIntelligenceGovernanceEngine } from './CollectiveIntelligenceGovernanceEngine.js';
import { KnowledgeContinuityPersistenceBridge } from './KnowledgeContinuityPersistenceBridge.js';

export interface CreateKnowledgeStateParams {
  readonly stateId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly federationId: string;
  readonly generation: number;
  readonly expiresAt: number;
}

export class GovernedKnowledgeStateEngine {
  private readonly registry: FederatedKnowledgeRegistry;
  private readonly securityBoundary: FederatedKnowledgeSecurityBoundary;
  private readonly lineageEngine: KnowledgeLineageEngine;
  private readonly mergeEngine: KnowledgeMergeReconciliationEngine;
  private readonly conflictResolver: KnowledgeConflictResolver;
  private readonly governanceEngine: CollectiveIntelligenceGovernanceEngine;
  private readonly persistenceBridge: KnowledgeContinuityPersistenceBridge;
  private readonly states: Map<string, KnowledgeState> = new Map();

  constructor(options?: {
    readonly registry?: FederatedKnowledgeRegistry;
    readonly securityBoundary?: FederatedKnowledgeSecurityBoundary;
    readonly lineageEngine?: KnowledgeLineageEngine;
    readonly mergeEngine?: KnowledgeMergeReconciliationEngine;
    readonly conflictResolver?: KnowledgeConflictResolver;
    readonly governanceEngine?: CollectiveIntelligenceGovernanceEngine;
    readonly persistenceBridge?: KnowledgeContinuityPersistenceBridge;
  }) {
    this.registry = options?.registry ?? new FederatedKnowledgeRegistry();
    this.securityBoundary = options?.securityBoundary ?? new FederatedKnowledgeSecurityBoundary();
    this.lineageEngine = options?.lineageEngine ?? new KnowledgeLineageEngine();
    this.mergeEngine = options?.mergeEngine ?? new KnowledgeMergeReconciliationEngine();
    this.conflictResolver = options?.conflictResolver ?? new KnowledgeConflictResolver();
    this.governanceEngine = options?.governanceEngine ?? new CollectiveIntelligenceGovernanceEngine();
    this.persistenceBridge = options?.persistenceBridge ?? new KnowledgeContinuityPersistenceBridge();
  }

  public getRegistry(): FederatedKnowledgeRegistry {
    return this.registry;
  }

  public getSecurityBoundary(): FederatedKnowledgeSecurityBoundary {
    return this.securityBoundary;
  }

  public getLineageEngine(): KnowledgeLineageEngine {
    return this.lineageEngine;
  }

  public getMergeEngine(): KnowledgeMergeReconciliationEngine {
    return this.mergeEngine;
  }

  public getConflictResolver(): KnowledgeConflictResolver {
    return this.conflictResolver;
  }

  public getGovernanceEngine(): CollectiveIntelligenceGovernanceEngine {
    return this.governanceEngine;
  }

  public getPersistenceBridge(): KnowledgeContinuityPersistenceBridge {
    return this.persistenceBridge;
  }

  /**
   * EN: Creates a new governed knowledge state.
   * VI: Tạo một trạng thái tri thức có quản trị mới.
   */
  public createKnowledgeState(params: CreateKnowledgeStateParams): KnowledgeState {
    this.securityBoundary.assertStopInactive('KNOWLEDGE_ENTRY', params.tenantId, params.stateId);

    // Active states budget check
    const activeStates = Array.from(this.states.values()).filter(
      (s) => s.sessionId === params.sessionId && s.status !== 'COMPLETED' && s.status !== 'FAILED'
    );
    if (activeStates.length >= MAX_ACTIVE_KNOWLEDGE_STATES) {
      throw new GovernedFederatedKnowledgeStateBudgetError(
        `Session reached MAX_ACTIVE_KNOWLEDGE_STATES limit (${MAX_ACTIVE_KNOWLEDGE_STATES})`,
        params.tenantId,
        params.stateId
      );
    }

    if (this.states.has(params.stateId)) {
      throw new GovernedFederatedKnowledgeStateValidationError(
        `Knowledge state '${params.stateId}' already exists`
      );
    }

    const now = Date.now();
    const duration = Math.min(params.expiresAt - now, MAX_KNOWLEDGE_STATE_DURATION_MS);
    const cappedExpiry = now + Math.max(1000, duration);

    const base: Omit<KnowledgeState, 'provenanceHash'> = {
      stateId: params.stateId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      missionId: params.missionId,
      objectiveId: params.objectiveId,
      federationId: params.federationId,
      entries: {},
      status: 'READY',
      generation: params.generation,
      version: 1,
      mergeCount: 0,
      reconciliationCount: 0,
      reassessmentsConsumed: 0,
      createdAt: now,
      updatedAt: now,
      expiresAt: cappedExpiry,
    };

    const provenanceHash = computeKnowledgeStateSnapshotHash(base);
    const state: KnowledgeState = {
      ...base,
      provenanceHash,
    };

    this.states.set(state.stateId, state);
    return state;
  }

  /**
   * EN: Adds or updates a knowledge entry in the state enforcing capacity and OCC.
   * VI: Thêm hoặc cập nhật một mục tri thức trong trạng thái, thực thi dung lượng và OCC.
   */
  public addKnowledgeEntry(
    stateId: string,
    entry: GovernedKnowledgeEntry,
    expectedVersion: number
  ): KnowledgeState {
    this.securityBoundary.assertStopInactive('PRE_STATE_UPDATE', entry.tenantId, stateId);

    const state = this.states.get(stateId);
    if (!state) {
      throw new GovernedFederatedKnowledgeStateValidationError(`Knowledge state '${stateId}' not found`);
    }

    // Tenant & session isolation
    if (state.tenantId !== entry.tenantId) {
      throw new GovernedFederatedKnowledgeStateTenantIsolationError(
        `Cross-tenant entry addition: state tenant '${state.tenantId}' != entry tenant '${entry.tenantId}'`,
        entry.tenantId
      );
    }
    if (state.sessionId !== entry.sessionId) {
      throw new GovernedFederatedKnowledgeStateSessionIsolationError(
        `Cross-session entry addition: state session '${state.sessionId}' != entry session '${entry.sessionId}'`,
        entry.tenantId
      );
    }

    // OCC version check
    if (expectedVersion !== state.version) {
      throw new GovernedFederatedKnowledgeStateConcurrencyError(
        `OCC version mismatch: expected ${expectedVersion}, current version is ${state.version}`,
        state.tenantId,
        stateId
      );
    }

    // Capacity checks
    const entryCount = Object.keys(state.entries).length;
    if (!state.entries[entry.knowledgeId] && entryCount >= MAX_KNOWLEDGE_STATE_SIZE) {
      throw new GovernedFederatedKnowledgeStateBudgetError(
        `Knowledge state reached MAX_KNOWLEDGE_STATE_SIZE limit (${MAX_KNOWLEDGE_STATE_SIZE})`,
        state.tenantId,
        stateId
      );
    }

    const fedEntries = Object.values(state.entries).filter((e) => e.federationId === entry.federationId);
    if (!state.entries[entry.knowledgeId] && fedEntries.length >= MAX_KNOWLEDGE_ENTRIES_PER_FEDERATION) {
      throw new GovernedFederatedKnowledgeStateBudgetError(
        `Federation reached MAX_KNOWLEDGE_ENTRIES_PER_FEDERATION limit (${MAX_KNOWLEDGE_ENTRIES_PER_FEDERATION})`,
        state.tenantId,
        stateId
      );
    }

    const agentEntries = Object.values(state.entries).filter((e) => e.sourceAgentId === entry.sourceAgentId);
    if (!state.entries[entry.knowledgeId] && agentEntries.length >= MAX_KNOWLEDGE_ENTRIES_PER_AGENT) {
      throw new GovernedFederatedKnowledgeStateBudgetError(
        `Agent reached MAX_KNOWLEDGE_ENTRIES_PER_AGENT limit (${MAX_KNOWLEDGE_ENTRIES_PER_AGENT})`,
        state.tenantId,
        stateId
      );
    }

    const now = Date.now();
    const nextVersion = state.version + 1;
    const updatedEntries = {
      ...state.entries,
      [entry.knowledgeId]: entry,
    };

    const base: Omit<KnowledgeState, 'provenanceHash'> = {
      ...state,
      entries: updatedEntries,
      status: 'ACTIVE',
      version: nextVersion,
      updatedAt: now,
    };

    const provenanceHash = computeKnowledgeStateSnapshotHash(base);
    const updatedState: KnowledgeState = {
      ...base,
      provenanceHash,
    };

    this.states.set(stateId, updatedState);
    return updatedState;
  }

  /**
   * EN: Transitions knowledge state status.
   * VI: Chuyển đổi trạng thái vòng đời của trạng thái tri thức.
   */
  public transitionStateStatus(
    stateId: string,
    newStatus: KnowledgeLifecycleStatus,
    tenantId: string,
    sessionId: string
  ): KnowledgeState {
    const state = this.states.get(stateId);
    if (!state) {
      throw new GovernedFederatedKnowledgeStateValidationError(`Knowledge state '${stateId}' not found`);
    }

    if (state.tenantId !== tenantId) {
      throw new GovernedFederatedKnowledgeStateTenantIsolationError(
        `Tenant mismatch: '${state.tenantId}' != '${tenantId}'`,
        tenantId
      );
    }
    if (state.sessionId !== sessionId) {
      throw new GovernedFederatedKnowledgeStateSessionIsolationError(
        `Session mismatch: '${state.sessionId}' != '${sessionId}'`,
        tenantId
      );
    }

    // Terminal state invariant
    if (
      state.status === 'HALTED_BY_USER_STOP' ||
      state.status === 'HALTED_BY_EMERGENCY_STOP' ||
      state.status === 'INVALIDATED' ||
      state.status === 'COMPLETED' ||
      state.status === 'FAILED'
    ) {
      throw new GovernedFederatedKnowledgeStateValidationError(
        `Cannot transition out of terminal status '${state.status}'`
      );
    }

    const now = Date.now();
    const nextVersion = state.version + 1;
    const base: Omit<KnowledgeState, 'provenanceHash'> = {
      ...state,
      status: newStatus,
      version: nextVersion,
      updatedAt: now,
    };

    const provenanceHash = computeKnowledgeStateSnapshotHash(base);
    const updated: KnowledgeState = {
      ...base,
      provenanceHash,
    };

    this.states.set(stateId, updated);
    return updated;
  }

  /**
   * EN: Retrieves state by ID.
   * VI: Lấy trạng thái theo mã định danh.
   */
  public getState(stateId: string): KnowledgeState | undefined {
    return this.states.get(stateId);
  }

  /**
   * EN: Clears state.
   * VI: Xóa trạng thái.
   */
  public clear(): void {
    this.states.clear();
  }
}
