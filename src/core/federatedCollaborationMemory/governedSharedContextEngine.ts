// src/core/federatedCollaborationMemory/governedSharedContextEngine.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1120 — REAL
//
// EN: Governed shared context engine maintaining bounded, version-controlled shared state
//     among authorized federation participants with OCC version validation.
// VI: Động cơ ngữ cảnh chia sẻ có quản trị duy trì trạng thái chia sẻ có giới hạn, kiểm soát
//     phiên bản giữa các tác tử tham gia liên đoàn với xác thực phiên bản OCC.

import {
  CollaborationContext,
  MAX_CONTEXT_SIZE,
  FederatedCollaborationMemoryValidationError,
  FederatedCollaborationMemoryTenantIsolationError,
  FederatedCollaborationMemorySessionIsolationError,
  FederatedCollaborationMemoryConcurrencyError,
  FederatedCollaborationMemoryBudgetError,
  computeCollaborationContextHash,
} from './federatedCollaborationMemoryTypes.js';
import { CollaborationContextRegistry } from './collaborationContextRegistry.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';

export interface UpdateSharedContextParams {
  readonly contextId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly agentId: string;
  readonly expectedVersion: number;
  readonly key: string;
  readonly value: unknown;
}

export class GovernedSharedContextEngine {
  private readonly contextRegistry: CollaborationContextRegistry;
  private readonly securityBoundary: CollaborationMemorySecurityBoundary;
  private readonly sharedStates: Map<string, Map<string, unknown>> = new Map();

  constructor(options?: {
    readonly contextRegistry?: CollaborationContextRegistry;
    readonly securityBoundary?: CollaborationMemorySecurityBoundary;
  }) {
    this.contextRegistry = options?.contextRegistry ?? new CollaborationContextRegistry();
    this.securityBoundary = options?.securityBoundary ?? new CollaborationMemorySecurityBoundary();
  }

  public getRegistry(): CollaborationContextRegistry {
    return this.contextRegistry;
  }

  public getSecurityBoundary(): CollaborationMemorySecurityBoundary {
    return this.securityBoundary;
  }

  /**
   * EN: Reads a key from shared context with security and boundary assertion.
   * VI: Đọc một khóa từ ngữ cảnh chia sẻ với khẳng định bảo mật và ranh giới.
   */
  public getSharedValue(
    contextId: string,
    key: string,
    tenantId: string,
    sessionId: string,
    agentId: string
  ): unknown {
    this.securityBoundary.assertStopInactive('PRE_AGENT_CONTEXT_ACCESS', tenantId, contextId);
    const context = this.contextRegistry.assertContextBoundaries(contextId, tenantId, sessionId);

    if (!context.participatingAgentIds.includes(agentId)) {
      throw new FederatedCollaborationMemoryValidationError(
        `Agent '${agentId}' is not an authorized participant in context '${contextId}'`
      );
    }

    const state = this.sharedStates.get(contextId);
    return state ? state.get(key) : undefined;
  }

  /**
   * EN: Updates a key in the shared context enforcing OCC and boundaries.
   * VI: Cập nhật một khóa trong ngữ cảnh chia sẻ, thực thi OCC và các ranh giới.
   */
  public updateSharedValue(params: UpdateSharedContextParams): CollaborationContext {
    // 1. Synchronous checkpoint: PRE_CONTEXT_UPDATE
    this.securityBoundary.assertStopInactive('PRE_CONTEXT_UPDATE', params.tenantId, params.contextId);

    // 2. Validate context and boundary invariants
    const context = this.contextRegistry.assertContextBoundaries(params.contextId, params.tenantId, params.sessionId);

    // 3. Validate participant authorization
    if (!context.participatingAgentIds.includes(params.agentId)) {
      throw new FederatedCollaborationMemoryValidationError(
        `Agent '${params.agentId}' is not authorized to update context '${params.contextId}'`
      );
    }

    // 4. Validate context status
    if (context.status !== 'ACTIVE') {
      throw new FederatedCollaborationMemoryValidationError(
        `Cannot update context in status '${context.status}'`
      );
    }

    // 5. OCC version check
    if (params.expectedVersion !== context.version) {
      throw new FederatedCollaborationMemoryConcurrencyError(
        `OCC version conflict: expected ${params.expectedVersion}, current version is ${context.version}`,
        params.tenantId,
        params.contextId
      );
    }

    // 6. Check prototype pollution & prompt injection in key/value
    this.contextRegistry.validateUntrustedMetadata({ [params.key]: params.value });

    // 7. Check budget on state size
    let state = this.sharedStates.get(params.contextId);
    if (!state) {
      state = new Map();
      this.sharedStates.set(params.contextId, state);
    }

    if (!state.has(params.key) && state.size >= MAX_CONTEXT_SIZE) {
      throw new FederatedCollaborationMemoryBudgetError(
        `Context '${params.contextId}' exceeded MAX_CONTEXT_SIZE limit (${MAX_CONTEXT_SIZE})`,
        params.tenantId,
        params.contextId
      );
    }

    state.set(params.key, params.value);

    // 8. Update context version and provenance hash
    const now = Date.now();
    const nextVersion = context.version + 1;
    const base: Omit<CollaborationContext, 'provenanceHash'> = {
      ...context,
      metadata: {
        ...context.metadata,
        [params.key]: params.value,
      },
      version: nextVersion,
      updatedAt: now,
    };

    const provenanceHash = computeCollaborationContextHash(base);
    const updated: CollaborationContext = {
      ...base,
      provenanceHash,
    };

    // Reflect update in registry
    (this.contextRegistry as unknown as { contexts: Map<string, CollaborationContext> }).contexts.set(
      params.contextId,
      updated
    );

    return updated;
  }

  /**
   * EN: Returns the full snapshot of shared state for authorized agent.
   * VI: Trả về ảnh chụp đầy đủ của trạng thái chia sẻ cho tác tử được ủy quyền.
   */
  public getAllSharedValues(
    contextId: string,
    tenantId: string,
    sessionId: string,
    agentId: string
  ): Readonly<Record<string, unknown>> {
    this.securityBoundary.assertStopInactive('PRE_AGENT_CONTEXT_ACCESS', tenantId, contextId);
    const context = this.contextRegistry.assertContextBoundaries(contextId, tenantId, sessionId);

    if (!context.participatingAgentIds.includes(agentId)) {
      throw new FederatedCollaborationMemoryValidationError(
        `Agent '${agentId}' is not authorized to read context '${contextId}'`
      );
    }

    const state = this.sharedStates.get(contextId);
    const result: Record<string, unknown> = {};
    if (state) {
      for (const [k, v] of state.entries()) {
        result[k] = v;
      }
    }
    return result;
  }
}
