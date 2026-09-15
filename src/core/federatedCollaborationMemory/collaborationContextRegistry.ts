// src/core/federatedCollaborationMemory/collaborationContextRegistry.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1119 — REAL
//
// EN: Governed registry for collaboration contexts, enforcing tenant/session/mission/federation binding,
//     prototype pollution defense, prompt injection quarantine, and strict lifecycle integrity.
// VI: Sổ đăng ký có quản trị cho các ngữ cảnh hợp tác, thực thi liên kết tenant/phiên/nhiệm vụ/liên đoàn,
//     phòng chống ô nhiễm nguyên mẫu, cách ly tiêm nhiễm prompt, và toàn vẹn vòng đời nghiêm ngặt.

import {
  CollaborationContext,
  CollaborationContextStatus,
  CollaborationAuthorizationBinding,
  CollaborationLeaseBinding,
  FederatedCollaborationMemoryValidationError,
  FederatedCollaborationMemoryTenantIsolationError,
  FederatedCollaborationMemorySessionIsolationError,
  FederatedCollaborationMemoryAuthorizationError,
  computeCollaborationContextHash,
} from './federatedCollaborationMemoryTypes.js';

export interface RegisterCollaborationContextParams {
  readonly contextId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly federationId: string;
  readonly participatingAgentIds: readonly string[];
  readonly leaderAgentId: string;
  readonly generation: number;
  readonly authorizationBinding: CollaborationAuthorizationBinding;
  readonly leaseBinding?: CollaborationLeaseBinding;
  readonly metadata?: Record<string, unknown>;
}

export class CollaborationContextRegistry {
  private readonly contexts: Map<string, CollaborationContext> = new Map();

  /**
   * EN: Validates untrusted metadata against prototype pollution and prompt injection patterns.
   * VI: Xác thực siêu dữ liệu không tin cậy chống lại ô nhiễm nguyên mẫu và các mẫu tiêm nhiễm prompt.
   */
  public validateUntrustedMetadata(metadata?: Record<string, unknown>): void {
    if (!metadata) return;

    // Prototype pollution check
    if (
      Object.prototype.hasOwnProperty.call(metadata, '__proto__') ||
      Object.prototype.hasOwnProperty.call(metadata, 'constructor') ||
      Object.prototype.hasOwnProperty.call(metadata, 'prototype')
    ) {
      throw new FederatedCollaborationMemoryValidationError('Prototype pollution key detected in context metadata');
    }

    // Prompt injection check in string values
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s+override/i,
      /disable\s+safety/i,
      /bypass\s+(policy|governance|authorization)/i,
      /jailbreak/i,
      /override\s+governance/i,
    ];

    const inspectRecursive = (val: unknown, depth = 0): void => {
      if (depth > 5 || val === null || val === undefined) return;
      if (typeof val === 'string') {
        for (const pattern of injectionPatterns) {
          if (pattern.test(val)) {
            throw new FederatedCollaborationMemoryValidationError(
              `Prompt injection pattern detected in metadata: "${pattern.source}"`
            );
          }
        }
        if (
          val.includes('<thought>') ||
          val.includes('[scratchpad]') ||
          val.includes('chainOfThought') ||
          val.includes('modelThinking') ||
          val.includes('<deliberation>') ||
          val.includes('<cot>')
        ) {
          throw new FederatedCollaborationMemoryValidationError('Deliberation or CoT marker detected in context metadata');
        }
      } else if (typeof val === 'object') {
        const obj = val as Record<string, unknown>;
        if (
          Object.prototype.hasOwnProperty.call(obj, '__proto__') ||
          Object.prototype.hasOwnProperty.call(obj, 'constructor') ||
          Object.prototype.hasOwnProperty.call(obj, 'prototype')
        ) {
          throw new FederatedCollaborationMemoryValidationError('Nested prototype pollution key detected');
        }
        for (const k of Object.keys(obj)) {
          inspectRecursive(obj[k], depth + 1);
        }
      }
    };

    inspectRecursive(metadata);
  }

  /**
   * EN: Registers a new governed collaboration context.
   * VI: Đăng ký một ngữ cảnh hợp tác có quản trị mới.
   */
  public registerContext(params: RegisterCollaborationContextParams): CollaborationContext {
    if (!params.contextId || params.contextId.trim().length === 0) {
      throw new FederatedCollaborationMemoryValidationError('Context ID cannot be empty');
    }
    if (this.contexts.has(params.contextId)) {
      throw new FederatedCollaborationMemoryValidationError(`Collaboration context '${params.contextId}' already exists`);
    }

    // Validate identifiers
    if (!params.tenantId || params.tenantId.trim().length === 0) {
      throw new FederatedCollaborationMemoryTenantIsolationError('Tenant ID cannot be empty');
    }
    if (!params.sessionId || params.sessionId.trim().length === 0) {
      throw new FederatedCollaborationMemorySessionIsolationError('Session ID cannot be empty');
    }
    if (!params.missionId || !params.objectiveId || !params.federationId) {
      throw new FederatedCollaborationMemoryValidationError('Mission, objective, and federation IDs are required');
    }

    // Validate agents
    if (!params.participatingAgentIds || params.participatingAgentIds.length === 0) {
      throw new FederatedCollaborationMemoryValidationError('At least one participating agent is required');
    }
    if (!params.participatingAgentIds.includes(params.leaderAgentId)) {
      throw new FederatedCollaborationMemoryValidationError(
        `Leader agent '${params.leaderAgentId}' must be among participating agents`
      );
    }

    // Validate authorization binding
    if (!params.authorizationBinding || !params.authorizationBinding.envelopeId) {
      throw new FederatedCollaborationMemoryAuthorizationError('Valid authorization envelope binding is required');
    }
    if (params.authorizationBinding.expiresAt <= Date.now()) {
      throw new FederatedCollaborationMemoryAuthorizationError('Authorization envelope is already expired');
    }

    // Validate lease binding if provided
    if (params.leaseBinding && params.leaseBinding.expiresAt <= Date.now()) {
      throw new FederatedCollaborationMemoryValidationError('Governing lease is expired');
    }

    // Validate metadata
    this.validateUntrustedMetadata(params.metadata);

    const now = Date.now();
    const base: Omit<CollaborationContext, 'provenanceHash'> = {
      contextId: params.contextId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      missionId: params.missionId,
      objectiveId: params.objectiveId,
      federationId: params.federationId,
      participatingAgentIds: [...params.participatingAgentIds],
      leaderAgentId: params.leaderAgentId,
      generation: params.generation,
      authorizationBinding: params.authorizationBinding,
      leaseBinding: params.leaseBinding,
      status: 'ACTIVE',
      metadata: params.metadata ? { ...params.metadata } : {},
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    const provenanceHash = computeCollaborationContextHash(base);
    const context: CollaborationContext = {
      ...base,
      provenanceHash,
    };

    this.contexts.set(context.contextId, context);
    return context;
  }

  /**
   * EN: Retrieves an existing collaboration context by ID.
   * VI: Lấy ngữ cảnh hợp tác hiện có theo mã định danh.
   */
  public getContext(contextId: string): CollaborationContext | undefined {
    return this.contexts.get(contextId);
  }

  /**
   * EN: Asserts boundary matches between caller and context.
   * VI: Khẳng định sự khớp ranh giới giữa bên gọi và ngữ cảnh.
   */
  public assertContextBoundaries(contextId: string, tenantId: string, sessionId: string): CollaborationContext {
    const context = this.contexts.get(contextId);
    if (!context) {
      throw new FederatedCollaborationMemoryValidationError(`Collaboration context '${contextId}' not found`);
    }
    if (context.tenantId !== tenantId) {
      throw new FederatedCollaborationMemoryTenantIsolationError(
        `Cross-tenant access rejected: context tenant '${context.tenantId}' != caller tenant '${tenantId}'`,
        tenantId,
        contextId
      );
    }
    if (context.sessionId !== sessionId) {
      throw new FederatedCollaborationMemorySessionIsolationError(
        `Cross-session access rejected: context session '${context.sessionId}' != caller session '${sessionId}'`,
        tenantId,
        contextId
      );
    }
    return context;
  }

  /**
   * EN: Transitions context status with strict validation.
   * VI: Chuyển đổi trạng thái ngữ cảnh với xác thực nghiêm ngặt.
   */
  public updateContextStatus(
    contextId: string,
    newStatus: CollaborationContextStatus,
    tenantId: string,
    sessionId: string
  ): CollaborationContext {
    const existing = this.assertContextBoundaries(contextId, tenantId, sessionId);

    // Terminal state invariant
    if (
      existing.status === 'HALTED_BY_USER_STOP' ||
      existing.status === 'HALTED_BY_EMERGENCY_STOP' ||
      existing.status === 'INVALIDATED' ||
      existing.status === 'COMPLETED' ||
      existing.status === 'FAILED'
    ) {
      throw new FederatedCollaborationMemoryValidationError(
        `Cannot transition from terminal status '${existing.status}' to '${newStatus}'`
      );
    }

    const now = Date.now();
    const nextVersion = existing.version + 1;
    const base: Omit<CollaborationContext, 'provenanceHash'> = {
      ...existing,
      status: newStatus,
      version: nextVersion,
      updatedAt: now,
    };

    const provenanceHash = computeCollaborationContextHash(base);
    const updated: CollaborationContext = {
      ...base,
      provenanceHash,
    };

    this.contexts.set(contextId, updated);
    return updated;
  }

  /**
   * EN: Lists all contexts for a given tenant and session.
   * VI: Liệt kê tất cả các ngữ cảnh cho một tenant và phiên cụ thể.
   */
  public listContextsForSession(tenantId: string, sessionId: string): readonly CollaborationContext[] {
    return Array.from(this.contexts.values()).filter(
      (c) => c.tenantId === tenantId && c.sessionId === sessionId
    );
  }

  /**
   * EN: Clears in-memory registry (for testing or isolation resets).
   * VI: Xóa sổ đăng ký trong bộ nhớ (dùng cho kiểm thử hoặc đặt lại cô lập).
   */
  public clear(): void {
    this.contexts.clear();
  }
}
