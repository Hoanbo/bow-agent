// src/core/governedCrossFederationConvergence/CrossFederationRegistry.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1139 — REAL
//
// EN: Inter-federation entity registry, multi-federation session gate, and participation guard.
// VI: Bộ đăng ký thực thể liên liên đoàn, cổng phiên đa liên đoàn và bảo vệ tham gia.

import {
  MAX_ACTIVE_FEDERATIONS_PER_CONVERGENCE,
  MAX_PARTICIPATING_AGENTS_TOTAL,
  GovernedCrossFederationValidationError,
  GovernedCrossFederationTenantIsolationError,
  GovernedCrossFederationSessionIsolationError,
  GovernedCrossFederationBudgetError,
  type CrossFederationStrategyProposal,
  computeConvergenceProposalHash,
} from './GovernedCrossFederationTypes.js';

export interface ParticipatingFederationRecord {
  readonly federationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly agentIds: readonly string[];
  readonly authorizationEnvelopeId: string;
  readonly leaseId: string;
  readonly registeredAt: number;
}

export interface RegisterFederationParams {
  readonly federationId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly agentIds: readonly string[];
  readonly authorizationEnvelopeId: string;
  readonly leaseId: string;
}

export interface RegisterProposalParams {
  readonly proposalId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly federationId: string;
  readonly authorAgentId: string;
  readonly missionId: string;
  readonly objectiveId: string;
  readonly strategicGoal: string;
  readonly plannedActions: readonly string[];
  readonly dependencies?: readonly any[];
  readonly estimatedResourceCost: number;
  readonly priority: number;
  readonly generation: number;
  readonly authorizationEnvelopeId: string;
  readonly leaseId: string;
}

export class CrossFederationRegistry {
  private readonly federations = new Map<string, ParticipatingFederationRecord>();
  private readonly proposals = new Map<string, CrossFederationStrategyProposal>();
  private readonly quarantinedPayloads: Array<{ id: string; reason: string; timestamp: number }> = [];

  // EN: Validate prototype pollution keys
  // VI: Xác thực và ngăn chặn tấn công prototype pollution
  private sanitizeKeys(obj: unknown): void {
    if (obj === null || typeof obj !== 'object') {
      return;
    }
    const propNames = Object.getOwnPropertyNames(obj);
    for (const key of propNames) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new GovernedCrossFederationValidationError(
          `Security violation: Prototype pollution key detected: "${key}"`
        );
      }
      this.sanitizeKeys((obj as Record<string, unknown>)[key]);
    }
  }

  // EN: Reject chain-of-thought tokens from input
  // VI: Từ chối các token chuỗi suy nghĩ (CoT) khỏi đầu vào
  private assertZeroCoT(text: string): void {
    const cotPatterns = [
      /<thought>/i,
      /<\/thought>/i,
      /\[scratchpad\]/i,
      /chainOfThought/i,
      /modelThinking/i,
      /<deliberation>/i,
      /<cot>/i,
    ];
    for (const pattern of cotPatterns) {
      if (pattern.test(text)) {
        throw new GovernedCrossFederationValidationError(
          `Security violation: Chain of Thought (CoT) token detected and rejected: ${pattern}`
        );
      }
    }
  }

  // EN: Sanitize secrets and PII
  // VI: Khử khuẩn bí mật và thông tin định danh cá nhân (PII)
  public sanitizeContent(text: string): { sanitized: string; quarantined: boolean; reason?: string } {
    this.assertZeroCoT(text);

    let sanitized = text;
    // Redact basic secrets (Bearer tokens, API keys)
    sanitized = sanitized.replace(/(bearer\s+[A-Za-z0-9_\-\.]{15,})/gi, '[REDACTED_SECRET]');
    sanitized = sanitized.replace(/(api[_-]?key\s*[:=]\s*["']?[A-Za-z0-9_\-]{16,}["']?)/gi, '[REDACTED_SECRET]');
    sanitized = sanitized.replace(/(password\s*[:=]\s*["']?[^"'\s]{6,}["']?)/gi, '[REDACTED_SECRET]');

    // Redact basic PII (emails)
    sanitized = sanitized.replace(/([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})/gi, '[REDACTED_PII]');

    // Check for prompt injection signatures
    const injectionPatterns = [
      /ignore\s+previous\s+instructions/i,
      /system\s+prompt\s+override/i,
      /you\s+are\s+now\s+in\s+DAN\s+mode/i,
      /bypass\s+governance/i,
    ];

    let quarantined = false;
    let reason: string | undefined;

    for (const pattern of injectionPatterns) {
      if (pattern.test(text)) {
        quarantined = true;
        reason = `Prompt injection signature detected: ${pattern}`;
        break;
      }
    }

    return { sanitized, quarantined, reason };
  }

  // EN: Register a participating federation with strict isolation and capacity checks
  // VI: Đăng ký liên đoàn tham gia với kiểm tra cô lập và giới hạn dung lượng nghiêm ngặt
  public registerFederation(params: RegisterFederationParams): ParticipatingFederationRecord {
    this.sanitizeKeys(params);

    if (!params.federationId || !params.tenantId || !params.sessionId) {
      throw new GovernedCrossFederationValidationError(
        'federationId, tenantId, and sessionId are required',
        params.tenantId,
        params.sessionId
      );
    }

    if (!params.missionId || !params.objectiveId) {
      throw new GovernedCrossFederationValidationError(
        'missionId and objectiveId are required for federation binding',
        params.tenantId,
        params.sessionId
      );
    }

    if (!params.authorizationEnvelopeId || !params.leaseId) {
      throw new GovernedCrossFederationValidationError(
        'authorizationEnvelopeId and leaseId are mandatory for participation',
        params.tenantId,
        params.sessionId
      );
    }

    // Check existing federations for tenant & session isolation
    for (const fed of this.federations.values()) {
      if (fed.tenantId !== params.tenantId) {
        throw new GovernedCrossFederationTenantIsolationError(
          `Tenant isolation violation: Federation ${params.federationId} (tenant: ${params.tenantId}) cannot join session of tenant ${fed.tenantId}`,
          params.tenantId,
          params.sessionId
        );
      }
      if (fed.sessionId !== params.sessionId) {
        throw new GovernedCrossFederationSessionIsolationError(
          `Session isolation violation: Federation ${params.federationId} (session: ${params.sessionId}) cannot join session ${fed.sessionId}`,
          params.tenantId,
          params.sessionId
        );
      }
    }

    // Check federation count ceiling
    if (this.federations.size >= MAX_ACTIVE_FEDERATIONS_PER_CONVERGENCE && !this.federations.has(params.federationId)) {
      throw new GovernedCrossFederationBudgetError(
        `Budget violation: Maximum active federations exceeded (${MAX_ACTIVE_FEDERATIONS_PER_CONVERGENCE})`,
        params.tenantId,
        params.sessionId
      );
    }

    // Check total participating agents ceiling
    let totalAgents = params.agentIds.length;
    for (const [id, fed] of this.federations.entries()) {
      if (id !== params.federationId) {
        totalAgents += fed.agentIds.length;
      }
    }
    if (totalAgents > MAX_PARTICIPATING_AGENTS_TOTAL) {
      throw new GovernedCrossFederationBudgetError(
        `Budget violation: Maximum participating agents exceeded (${MAX_PARTICIPATING_AGENTS_TOTAL})`,
        params.tenantId,
        params.sessionId
      );
    }

    const record: ParticipatingFederationRecord = {
      federationId: params.federationId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      missionId: params.missionId,
      objectiveId: params.objectiveId,
      agentIds: Object.freeze([...params.agentIds]),
      authorizationEnvelopeId: params.authorizationEnvelopeId,
      leaseId: params.leaseId,
      registeredAt: Date.now(),
    };

    this.federations.set(params.federationId, Object.freeze(record));
    return record;
  }

  // EN: Register and validate a cross-federation strategy proposal
  // VI: Đăng ký và xác thực đề xuất chiến lược liên liên đoàn
  public registerProposal(params: RegisterProposalParams): CrossFederationStrategyProposal {
    this.sanitizeKeys(params);

    if (!this.federations.has(params.federationId)) {
      throw new GovernedCrossFederationValidationError(
        `Federation ${params.federationId} is not registered in this convergence session`,
        params.tenantId,
        params.sessionId
      );
    }

    const fed = this.federations.get(params.federationId)!;
    if (fed.tenantId !== params.tenantId) {
      throw new GovernedCrossFederationTenantIsolationError(
        `Tenant mismatch for proposal ${params.proposalId}`,
        params.tenantId,
        params.sessionId
      );
    }
    if (fed.sessionId !== params.sessionId) {
      throw new GovernedCrossFederationSessionIsolationError(
        `Session mismatch for proposal ${params.proposalId}`,
        params.tenantId,
        params.sessionId
      );
    }

    const goalSanitized = this.sanitizeContent(params.strategicGoal);
    if (goalSanitized.quarantined) {
      this.quarantinedPayloads.push({
        id: params.proposalId,
        reason: goalSanitized.reason || 'Untrusted content quarantined',
        timestamp: Date.now(),
      });
      throw new GovernedCrossFederationValidationError(
        `Security quarantine: ${goalSanitized.reason}`,
        params.tenantId,
        params.sessionId
      );
    }

    const actionsSanitized: string[] = [];
    for (const action of params.plannedActions) {
      const act = this.sanitizeContent(action);
      if (act.quarantined) {
        throw new GovernedCrossFederationValidationError(
          `Security quarantine: ${act.reason}`,
          params.tenantId,
          params.sessionId
        );
      }
      actionsSanitized.push(act.sanitized);
    }

    const cleanProposal: Omit<CrossFederationStrategyProposal, 'provenanceHash'> = {
      proposalId: params.proposalId,
      tenantId: params.tenantId,
      sessionId: params.sessionId,
      federationId: params.federationId,
      authorAgentId: params.authorAgentId,
      missionId: params.missionId,
      objectiveId: params.objectiveId,
      strategicGoal: goalSanitized.sanitized,
      plannedActions: Object.freeze(actionsSanitized),
      dependencies: Object.freeze(params.dependencies || []),
      estimatedResourceCost: params.estimatedResourceCost,
      priority: params.priority,
      generation: params.generation,
      authorizationEnvelopeId: params.authorizationEnvelopeId,
      leaseId: params.leaseId,
      createdAt: Date.now(),
    };

    const provenanceHash = computeConvergenceProposalHash(cleanProposal);
    const proposal: CrossFederationStrategyProposal = Object.freeze({
      ...cleanProposal,
      provenanceHash,
    });

    this.proposals.set(params.proposalId, proposal);
    return proposal;
  }

  public getFederation(federationId: string): ParticipatingFederationRecord | undefined {
    return this.federations.get(federationId);
  }

  public getAllFederations(): readonly ParticipatingFederationRecord[] {
    return Object.freeze(Array.from(this.federations.values()));
  }

  public getProposal(proposalId: string): CrossFederationStrategyProposal | undefined {
    return this.proposals.get(proposalId);
  }

  public getAllProposals(): readonly CrossFederationStrategyProposal[] {
    return Object.freeze(Array.from(this.proposals.values()));
  }

  public getQuarantinedPayloads(): readonly { id: string; reason: string; timestamp: number }[] {
    return Object.freeze([...this.quarantinedPayloads]);
  }

  public clear(): void {
    this.federations.clear();
    this.proposals.clear();
    this.quarantinedPayloads.length = 0;
  }
}
