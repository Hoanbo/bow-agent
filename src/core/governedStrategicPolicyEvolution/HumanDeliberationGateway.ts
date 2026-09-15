// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1164: HumanDeliberationGateway
// Dossier Compilation, Human Decision Recording & Non-Authoritative PDP Handoff
// ============================================================================

import * as crypto from 'crypto';
import {
  PolicyEvolutionProposal,
  PolicyImpactAnalysisResult,
  CounterfactualSimulationResult,
  InvariantCheckResult,
  StrategicPolicyDeliberationDossier,
  HumanDecisionToken,
  HumanDecisionRecord,
  PdpPolicyHandoffPackage,
  MAX_DELIBERATION_DOSSIER_SIZE_BYTES,
  MAX_DELIBERATION_SESSION_DURATION_MS,
  computeDeliberationDossierHash,
  computeHumanDecisionRecordHash,
  UnauthorizedHumanDecisionError,
  StrategicPolicySecurityCheckpointError,
} from './GovernedStrategicPolicyEvolutionTypes.js';

export class HumanDeliberationGateway {
  private dossiersByTenant: Map<string, Map<string, StrategicPolicyDeliberationDossier>> = new Map();

  constructor() {}

  // EN: Compiles analysis, simulation, and constitutional results into an immutable deliberation dossier.
  // VI: Tổng hợp kết quả phân tích, mô phỏng và hiến định vào hồ sơ nghị sự bất biến.
  public compileDossier(
    proposal: PolicyEvolutionProposal,
    impact: PolicyImpactAnalysisResult,
    simulation: CounterfactualSimulationResult,
    compliance: InvariantCheckResult
  ): StrategicPolicyDeliberationDossier {
    if (proposal.status !== 'DOSSIER_COMPILING' && proposal.status !== 'INVARIANT_REVIEW') {
      throw new StrategicPolicySecurityCheckpointError(
        `Precondition failed: Proposal in '${proposal.status}' cannot be compiled into dossier`
      );
    }

    if (!compliance.passed) {
      throw new StrategicPolicySecurityCheckpointError(
        `Constitutional violation: Cannot compile dossier for proposal with unresolved violations: [${compliance.violations.join(', ')}]`
      );
    }

    const dossierId = `urn:bow:dossier:${crypto.randomUUID()}`;
    const dossier: StrategicPolicyDeliberationDossier = {
      dossierId,
      proposalId: proposal.proposalId,
      tenantId: proposal.tenantId,
      sessionId: proposal.sessionId,
      missionId: proposal.missionId,
      compiledAt: Date.now(),
      proposalSummary: {
        policyDomain: proposal.policyDomain,
        proposedChanges: [...proposal.proposedChanges],
        justification: proposal.justification,
      },
      sourceEvidence: {
        metaLearningRecommendationId: proposal.sourceRecommendationId,
        strategicMemoryRecordIds: [...proposal.sourceStrategicMemoryRecordIds],
      },
      impactAnalysis: impact,
      counterfactualSimulation: simulation,
      constitutionalCompliance: compliance,
      riskClassification: impact.riskLevel,
      reversibilityScore: impact.reversibilityScore,
      humanReviewRequirements: {
        requiresExplicitSignOff: true,
        minimumOperatorRole: impact.riskLevel === 'CRITICAL' ? 'CONSTITUTIONAL_ADMIN' : 'OPERATIONS_SUPERVISOR',
        twoPersonRuleRequired: impact.riskLevel === 'CRITICAL',
      },
      version: 1,
      provenanceHash: '',
    };

    dossier.provenanceHash = computeDeliberationDossierHash(dossier);

    const serialized = JSON.stringify(dossier);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_DELIBERATION_DOSSIER_SIZE_BYTES) {
      throw new StrategicPolicySecurityCheckpointError(
        `Dossier size ceiling exceeded: ${Buffer.byteLength(serialized, 'utf8')} bytes > ${MAX_DELIBERATION_DOSSIER_SIZE_BYTES}`
      );
    }

    this.getOrCreateTenantDossiers(proposal.tenantId).set(dossierId, dossier);
    return dossier;
  }

  // EN: Records a verified Human Decision Token, validating signatures and two-person rules.
  // VI: Ghi nhận Token quyết định của con người đã xác minh, kiểm tra chữ ký và quy tắc 2 người.
  public recordHumanDecision(
    dossier: StrategicPolicyDeliberationDossier,
    token: HumanDecisionToken
  ): { decisionRecord: HumanDecisionRecord; updatedDossier: StrategicPolicyDeliberationDossier } {
    if (!token.operatorId || !token.operatorSignature || !token.decision) {
      throw new UnauthorizedHumanDecisionError('Malformed decision token: operatorId, operatorSignature, and decision are required');
    }

    // EN: Verify session expiration.
    // VI: Xác minh tính tươi mới của phiên nghị sự.
    if (Date.now() - dossier.compiledAt > MAX_DELIBERATION_SESSION_DURATION_MS) {
      throw new UnauthorizedHumanDecisionError('Deliberation window expired: Human decision submitted after session TTL');
    }

    // EN: Two-Person Rule verification for CRITICAL risk proposals.
    // VI: Xác minh Quy tắc hai người cho các đề xuất có mức độ rủi ro CRITICAL.
    if (dossier.humanReviewRequirements.twoPersonRuleRequired) {
      if (!token.twoPersonVerifierId || !token.twoPersonVerifierSignature) {
        throw new UnauthorizedHumanDecisionError(
          'Two-Person Rule violation: CRITICAL risk proposal requires dual operator verification signatures'
        );
      }
      if (token.operatorId === token.twoPersonVerifierId) {
        throw new UnauthorizedHumanDecisionError(
          'Two-Person Rule violation: Primary operator and verifier operator cannot be identical'
        );
      }
    }

    const recordId = `urn:bow:decision:${crypto.randomUUID()}`;
    const decisionRecord: HumanDecisionRecord = {
      recordId,
      proposalId: dossier.proposalId,
      dossierId: dossier.dossierId,
      tenantId: dossier.tenantId,
      decision: token.decision,
      operatorId: token.operatorId,
      operatorSignature: token.operatorSignature,
      rationale: token.rationale || 'Human decision recorded via Deliberation Gateway',
      timestamp: token.timestamp || Date.now(),
      verified: true,
      provenanceHash: '',
    };
    decisionRecord.provenanceHash = computeHumanDecisionRecordHash(decisionRecord);

    dossier.humanDecision = decisionRecord;

    // EN: If approved by human, prepare the non-authoritative handoff package for PDP.
    // VI: Nếu được con người chấp thuận, chuẩn bị gói bàn giao không mang tính quyền lực cho PDP.
    if (token.decision === 'APPROVE') {
      const handoffId = `urn:bow:pdp_handoff:${crypto.randomUUID()}`;
      const handoffPackage: PdpPolicyHandoffPackage = {
        handoffId,
        proposalId: dossier.proposalId,
        dossierId: dossier.dossierId,
        tenantId: dossier.tenantId,
        policyDomain: dossier.proposalSummary.policyDomain,
        proposedChanges: [...dossier.proposalSummary.proposedChanges],
        humanApprovalCertified: true,
        isAuthoritativePolicy: false, // EN: Strictly non-authoritative. PDP evaluates independently.
        dossierProvenanceHash: dossier.provenanceHash,
        packagedAt: Date.now(),
      };
      dossier.pdpHandoffPackage = handoffPackage;
    }

    dossier.version += 1;
    dossier.provenanceHash = computeDeliberationDossierHash(dossier);
    if (dossier.pdpHandoffPackage) {
      dossier.pdpHandoffPackage.dossierProvenanceHash = dossier.provenanceHash;
    }

    return { decisionRecord, updatedDossier: dossier };
  }

  public getDossier(tenantId: string, dossierId: string): StrategicPolicyDeliberationDossier | undefined {
    const tenantMap = this.dossiersByTenant.get(tenantId);
    return tenantMap ? tenantMap.get(dossierId) : undefined;
  }

  public clearTenant(tenantId: string): void {
    this.dossiersByTenant.delete(tenantId);
  }

  private getOrCreateTenantDossiers(tenantId: string): Map<string, StrategicPolicyDeliberationDossier> {
    let map = this.dossiersByTenant.get(tenantId);
    if (!map) {
      map = new Map();
      this.dossiersByTenant.set(tenantId, map);
    }
    return map;
  }
}
