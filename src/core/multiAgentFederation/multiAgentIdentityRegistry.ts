// src/core/multiAgentFederation/multiAgentIdentityRegistry.ts
// BOWCON V4.0 — MS-1.5.14: NATIVE GOVERNED MULTI-AGENT FEDERATION, DELEGATION & COLLABORATIVE COORDINATION ENGINE
// Component 1109 — REAL
//
// EN: Multi-agent identity registry managing unique, governed agent identities bound to tenant,
//     session, operator, and generation. Defends against prototype pollution, path traversal, and collisions.
// VI: Sổ đăng ký danh tính đa tác tử quản lý danh tính tác tử độc nhất, có quản trị gắn liền với
//     bên thuê, phiên, người vận hành và thế hệ. Phòng chống prototype pollution, path traversal và va chạm.

import {
  GovernedAgent,
  AgentStatus,
  MultiAgentFederationValidationError,
  MultiAgentFederationTenantIsolationError,
  MultiAgentFederationSessionIsolationError,
  computeAgentProvenanceHash,
} from './multiAgentFederationTypes.js';

export class MultiAgentIdentityRegistry {
  private readonly agents: Map<string, GovernedAgent> = new Map();

  /**
   * EN: Validates untrusted agent registration input for prototype pollution, traversal, and format.
   * VI: Xác thực đầu vào đăng ký tác tử chưa tin cậy về prototype pollution, traversal và định dạng.
   */
  public validateAgentInput(input: unknown): void {
    if (!input || typeof input !== 'object') {
      throw new MultiAgentFederationValidationError('Agent input must be a non-null object');
    }

    const rec = input as Record<string, unknown>;

    // Prototype pollution defense
    if (
      Object.prototype.hasOwnProperty.call(rec, '__proto__') ||
      Object.prototype.hasOwnProperty.call(rec, 'constructor') ||
      Object.prototype.hasOwnProperty.call(rec, 'prototype')
    ) {
      throw new MultiAgentFederationValidationError(
        'Prototype pollution keys (__proto__, constructor, prototype) are strictly prohibited'
      );
    }

    // CoT deliberation markers defense
    const serialized = JSON.stringify(rec);
    const cotMarkers = [
      '<thought>',
      '</thought>',
      '[scratchpad]',
      'chainOfThought',
      'modelThinking',
      '<deliberation>',
      '<cot>',
    ];
    for (const marker of cotMarkers) {
      if (serialized.includes(marker)) {
        throw new MultiAgentFederationValidationError(
          `Prohibited chain-of-thought/deliberation marker '${marker}' detected in agent input`
        );
      }
    }

    // Prompt injection detection
    const promptInjectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s+override/i,
      /disable\s+safety/i,
      /bypass\s+governance/i,
      /bypass\s+authorization/i,
      /jailbreak/i,
      /override\s+human\s+authority/i,
    ];
    for (const pattern of promptInjectionPatterns) {
      if (pattern.test(serialized)) {
        throw new MultiAgentFederationValidationError(
          `Adversarial prompt injection pattern '${pattern.source}' detected in agent input`
        );
      }
    }

    const agentId = rec['agentId'];
    const tenantId = rec['tenantId'];
    const sessionId = rec['sessionId'];
    const humanOperatorId = rec['humanOperatorId'];

    if (typeof agentId !== 'string' || !agentId.trim()) {
      throw new MultiAgentFederationValidationError('agentId must be a non-empty string');
    }
    if (typeof tenantId !== 'string' || !tenantId.trim()) {
      throw new MultiAgentFederationValidationError('tenantId must be a non-empty string');
    }
    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      throw new MultiAgentFederationValidationError('sessionId must be a non-empty string');
    }
    if (typeof humanOperatorId !== 'string' || !humanOperatorId.trim()) {
      throw new MultiAgentFederationValidationError('humanOperatorId must be a non-empty string');
    }

    // Path traversal and Windows reserved name safety
    this.assertValidIdentifier(agentId, 'agentId');
    this.assertValidIdentifier(tenantId, 'tenantId');
    this.assertValidIdentifier(sessionId, 'sessionId');
  }

  private assertValidIdentifier(value: string, fieldName: string): void {
    if (value.includes('..') || value.includes('/') || value.includes('\\') || value.includes('\0')) {
      throw new MultiAgentFederationValidationError(
        `Field '${fieldName}' contains invalid path traversal characters`
      );
    }
    const upper = value.toUpperCase();
    const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
    if (reserved.includes(upper)) {
      throw new MultiAgentFederationValidationError(
        `Field '${fieldName}' uses reserved Windows device name '${upper}'`
      );
    }
  }

  /**
   * EN: Registers a new governed agent identity.
   * VI: Đăng ký một danh tính tác tử có quản trị mới.
   */
  public registerAgent(
    params: Omit<GovernedAgent, 'provenanceHash' | 'createdAt' | 'updatedAt' | 'capabilities' | 'trustProfile' | 'status'> & {
      readonly status?: AgentStatus;
    }
  ): GovernedAgent {
    this.validateAgentInput(params);

    if (this.agents.has(params.agentId)) {
      throw new MultiAgentFederationValidationError(
        `Agent with ID '${params.agentId}' is already registered`,
        params.tenantId,
        undefined,
        params.agentId
      );
    }

    const now = Date.now();
    const agentData: Omit<GovernedAgent, 'provenanceHash'> = {
      agentId: params.agentId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      humanOperatorId: params.humanOperatorId,
      agentType: params.agentType,
      displayName: params.displayName,
      status: params.status ?? 'REGISTERED',
      capabilities: {},
      trustProfile: {
        identityScore: 1.0,
        governanceComplianceScore: 1.0,
        historicalSuccessRate: 1.0,
        lastAssessedAt: now,
        isTrustedForHighRisk: false,
        trustFactors: { registrationValid: true },
      },
      authorizationBinding: params.authorizationBinding,
      leaseBinding: params.leaseBinding,
      generation: params.generation,
      createdAt: now,
      updatedAt: now,
    };

    const provenanceHash = computeAgentProvenanceHash(agentData);
    const agent: GovernedAgent = {
      ...agentData,
      provenanceHash,
    };

    this.agents.set(agent.agentId, agent);
    return agent;
  }

  public getAgent(agentId: string): GovernedAgent | undefined {
    return this.agents.get(agentId);
  }

  public hasAgent(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  public getAgentsByTenant(tenantId: string): readonly GovernedAgent[] {
    return Array.from(this.agents.values()).filter((a) => a.tenantId === tenantId);
  }

  /**
   * EN: Asserts an agent exists, is active, and matches expected tenant and session boundaries.
   * VI: Khẳng định một tác tử tồn tại, đang hoạt động và khớp với ranh giới bên thuê và phiên dự kiến.
   */
  public assertAgentBoundaries(agentId: string, expectedTenantId: string, expectedSessionId: string): GovernedAgent {
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new MultiAgentFederationValidationError(
        `Agent with ID '${agentId}' not found in registry`,
        expectedTenantId,
        undefined,
        agentId
      );
    }

    if (agent.tenantId !== expectedTenantId) {
      throw new MultiAgentFederationTenantIsolationError(
        `Agent '${agentId}' tenant mismatch: expected '${expectedTenantId}', got '${agent.tenantId}'`,
        expectedTenantId,
        undefined,
        agentId
      );
    }

    if (agent.sessionId !== expectedSessionId) {
      throw new MultiAgentFederationSessionIsolationError(
        `Agent '${agentId}' session mismatch: expected '${expectedSessionId}', got '${agent.sessionId}'`,
        expectedTenantId,
        undefined,
        agentId
      );
    }

    if (agent.status === 'REVOKED' || agent.status === 'INVALIDATED' || agent.status === 'HALTED_BY_USER_STOP' || agent.status === 'HALTED_BY_EMERGENCY_STOP') {
      throw new MultiAgentFederationValidationError(
        `Agent '${agentId}' is in terminal/unusable state '${agent.status}'`,
        expectedTenantId,
        undefined,
        agentId
      );
    }

    return agent;
  }

  /**
   * EN: Updates agent status monotonically.
   * VI: Cập nhật trạng thái tác tử một cách đơn điệu.
   */
  public updateAgentStatus(agentId: string, newStatus: AgentStatus): GovernedAgent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new MultiAgentFederationValidationError(`Agent '${agentId}' not found`);
    }

    const updatedData: Omit<GovernedAgent, 'provenanceHash'> = {
      ...agent,
      status: newStatus,
      updatedAt: Date.now(),
    };

    const provenanceHash = computeAgentProvenanceHash(updatedData);
    const updatedAgent: GovernedAgent = {
      ...updatedData,
      provenanceHash,
    };

    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }

  /**
   * EN: Updates agent trust profile.
   * VI: Cập nhật hồ sơ độ tin cậy của tác tử.
   */
  public updateAgentTrust(agentId: string, trustProfile: GovernedAgent['trustProfile']): GovernedAgent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new MultiAgentFederationValidationError(`Agent '${agentId}' not found`);
    }

    const updatedData: Omit<GovernedAgent, 'provenanceHash'> = {
      ...agent,
      trustProfile,
      updatedAt: Date.now(),
    };

    const provenanceHash = computeAgentProvenanceHash(updatedData);
    const updatedAgent: GovernedAgent = {
      ...updatedData,
      provenanceHash,
    };

    this.agents.set(agentId, updatedAgent);
    return updatedAgent;
  }
}
