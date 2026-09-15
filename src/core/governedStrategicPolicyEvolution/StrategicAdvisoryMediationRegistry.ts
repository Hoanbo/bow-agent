// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1159: StrategicAdvisoryMediationRegistry
// Advisory Recommendation Ingestion, Admission Control & Security Sanitization
// ============================================================================

import * as crypto from 'crypto';
import {
  PolicyEvolutionProposal,
  AdvisoryMediationRecord,
  PolicyDomain,
  PolicyDelta,
  MAX_POLICY_PROPOSALS_PER_TENANT,
  computePolicyEvolutionProposalHash,
  computeAdvisoryMediationRecordHash,
  StrategicPolicyEvolutionBaseError,
  TenantIsolationViolationError,
} from './GovernedStrategicPolicyEvolutionTypes.js';

export interface RawAdvisoryRecommendationInput {
  tenantId: string;
  sessionId: string;
  missionId: string;
  sourceRecommendationId: string;
  sourceStrategicMemoryRecordIds: string[];
  policyDomain: PolicyDomain;
  proposedChanges: PolicyDelta[];
  justification: string;
  advisoryOnly?: boolean;
}

export class StrategicAdvisoryMediationRegistry {
  private proposalsByTenant: Map<string, Map<string, PolicyEvolutionProposal>> = new Map();
  private mediationRecordsByTenant: Map<string, Map<string, AdvisoryMediationRecord>> = new Map();

  // EN: Security sanitization regexes for sensitive secrets and credentials.
  // VI: Các biểu thức chính quy để loại bỏ bí mật và thông tin xác thực nhạy cảm.
  private secretRegexes: RegExp[] = [
    /(?:api[_-]?key|apikey|bearer|token|secret|password|passwd|pwd)\s*[:=]\s*(?:\\*["'])?([a-zA-Z0-9_\-\.]{8,})(?:\\*["'])?/gi,
    /ghp_[a-zA-Z0-9]{36}/g,
    /ey[a-zA-Z0-9_-]{10,}\.ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, // JWT
    /-----BEGIN (?:RSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA )?PRIVATE KEY-----/g,
  ];

  // EN: Reasoning markers prohibited by constitutional transparency guidelines.
  // VI: Các dấu hiệu suy luận ngầm bị cấm theo nguyên tắc minh bạch hiến định.
  private reasoningRegexes: RegExp[] = [
    /<thought>[\s\S]*?<\/thought>/gi,
    /<cot>[\s\S]*?<\/cot>/gi,
    /\[scratchpad\][\s\S]*?\[\/scratchpad\]/gi,
  ];

  // EN: Adversarial prompt-injection detection patterns.
  // VI: Các mẫu phát hiện chèn chỉ thị đối kháng phá hoại quy tắc hệ thống.
  private injectionRegexes: RegExp[] = [
    /ignore\s+(?:all\s+)?previous\s+(?:rules|instructions|directives)/i,
    /bypass\s+(?:pdp|policy|security|governance|human)/i,
    /you\s+are\s+now\s+(?:unrestricted|free|dan|root|admin)/i,
    /system\s+prompt\s+override/i,
  ];

  constructor() {}

  // EN: Deep prototype pollution check on all nested objects.
  // VI: Kiểm tra sâu chống ô nhiễm prototype trên tất cả đối tượng lồng nhau.
  private assertPrototypeSafety(obj: unknown): void {
    if (obj === null || typeof obj !== 'object') {
      return;
    }
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        throw new StrategicPolicyEvolutionBaseError(
          `Security violation: Prototype pollution attempt detected key '${key}'`
        );
      }
      this.assertPrototypeSafety((obj as Record<string, unknown>)[key]);
    }
  }

  // EN: Scrubs credentials and prohibited chain-of-thought tokens from text fields.
  // VI: Loại bỏ thông tin xác thực và các chuỗi suy luận ngầm bị cấm khỏi trường văn bản.
  public sanitizeText(text: string): { sanitized: string; scrubbed: boolean } {
    let current = text;
    let scrubbed = false;

    for (const reg of this.secretRegexes) {
      if (reg.test(current)) {
        current = current.replace(reg, '[REDACTED_CREDENTIAL]');
        scrubbed = true;
      }
    }

    for (const reg of this.reasoningRegexes) {
      if (reg.test(current)) {
        current = current.replace(reg, '');
        scrubbed = true;
      }
    }

    for (const reg of this.injectionRegexes) {
      if (reg.test(current)) {
        throw new StrategicPolicyEvolutionBaseError(
          `Adversarial prompt-injection pattern quarantined: '${current.substring(0, 60)}...'`
        );
      }
    }

    return { sanitized: current.trim(), scrubbed };
  }

  // EN: Ingests an advisory recommendation from MS-1.5.18 and admits it as a PolicyEvolutionProposal.
  // VI: Tiếp nhận đề xuất khuyến nghị từ MS-1.5.18 và kết nạp thành PolicyEvolutionProposal.
  public ingestAndAdmit(input: RawAdvisoryRecommendationInput): {
    proposal: PolicyEvolutionProposal;
    mediationRecord: AdvisoryMediationRecord;
  } {
    this.assertPrototypeSafety(input);

    if (!input.tenantId || !input.sessionId || !input.missionId || !input.sourceRecommendationId) {
      throw new StrategicPolicyEvolutionBaseError(
        'Malformed advisory input: tenantId, sessionId, missionId, and sourceRecommendationId are required'
      );
    }

    // EN: Absolute invariant: Recommendations must be explicitly advisory. Non-advisory claims fail closed.
    // VI: Bất biến tuyệt đối: Các khuyến nghị phải được đánh dấu rõ ràng là advisory. Khiếu nại có thẩm quyền bị từ chối.
    if (input.advisoryOnly === false) {
      throw new StrategicPolicyEvolutionBaseError(
        'Constitutional violation: Incoming recommendation claims non-advisory authority'
      );
    }

    const tenantMap = this.getOrCreateTenantMap(input.tenantId);
    if (tenantMap.size >= MAX_POLICY_PROPOSALS_PER_TENANT) {
      throw new StrategicPolicyEvolutionBaseError(
        `Tenant quota exceeded: maximum ${MAX_POLICY_PROPOSALS_PER_TENANT} proposals per tenant reached`
      );
    }

    const { sanitized: sanitizedJustification, scrubbed: justScrubbed } = this.sanitizeText(input.justification);

    const sanitizedChanges: PolicyDelta[] = (input.proposedChanges || []).map((delta) => {
      this.assertPrototypeSafety(delta);
      const { sanitized: deltaRationale, scrubbed: deltaScrubbed } = this.sanitizeText(delta.rationale || '');
      return {
        fieldPath: delta.fieldPath,
        currentValue: delta.currentValue,
        proposedValue: delta.proposedValue,
        rationale: deltaRationale,
      };
    });

    const now = Date.now();
    const proposalId = `urn:bow:proposal:${crypto.randomUUID()}`;
    const mediationId = `urn:bow:mediation:${crypto.randomUUID()}`;

    const proposal: PolicyEvolutionProposal = {
      proposalId,
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      missionId: input.missionId,
      sourceRecommendationId: input.sourceRecommendationId,
      sourceStrategicMemoryRecordIds: [...(input.sourceStrategicMemoryRecordIds || [])],
      policyDomain: input.policyDomain || 'CONVERGENCE',
      proposedChanges: sanitizedChanges,
      justification: sanitizedJustification,
      advisoryOnly: true,
      requiresHumanReview: true,
      status: 'ADMITTED',
      version: 1,
      provenanceHash: '',
      createdAt: now,
      updatedAt: now,
    };
    proposal.provenanceHash = computePolicyEvolutionProposalHash(proposal);

    const mediationRecord: AdvisoryMediationRecord = {
      mediationId,
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      sourceRecommendationId: input.sourceRecommendationId,
      sourceMemoryId: input.sourceStrategicMemoryRecordIds?.[0] || 'none',
      advisoryOnly: true,
      admitted: true,
      sanitizationApplied: justScrubbed,
      provenanceHash: '',
      createdAt: now,
    };
    mediationRecord.provenanceHash = computeAdvisoryMediationRecordHash(mediationRecord);

    tenantMap.set(proposalId, proposal);
    this.getOrCreateMediationMap(input.tenantId).set(mediationId, mediationRecord);

    return { proposal, mediationRecord };
  }

  public getProposal(tenantId: string, proposalId: string): PolicyEvolutionProposal | undefined {
    const tenantMap = this.proposalsByTenant.get(tenantId);
    return tenantMap ? tenantMap.get(proposalId) : undefined;
  }

  public listProposals(tenantId: string): PolicyEvolutionProposal[] {
    const tenantMap = this.proposalsByTenant.get(tenantId);
    return tenantMap ? Array.from(tenantMap.values()) : [];
  }

  public getMediationRecord(tenantId: string, mediationId: string): AdvisoryMediationRecord | undefined {
    const tenantMap = this.mediationRecordsByTenant.get(tenantId);
    return tenantMap ? tenantMap.get(mediationId) : undefined;
  }

  private getOrCreateTenantMap(tenantId: string): Map<string, PolicyEvolutionProposal> {
    let map = this.proposalsByTenant.get(tenantId);
    if (!map) {
      map = new Map();
      this.proposalsByTenant.set(tenantId, map);
    }
    return map;
  }

  private getOrCreateMediationMap(tenantId: string): Map<string, AdvisoryMediationRecord> {
    let map = this.mediationRecordsByTenant.get(tenantId);
    if (!map) {
      map = new Map();
      this.mediationRecordsByTenant.set(tenantId, map);
    }
    return map;
  }

  public clearTenant(tenantId: string): void {
    this.proposalsByTenant.delete(tenantId);
    this.mediationRecordsByTenant.delete(tenantId);
  }
}
