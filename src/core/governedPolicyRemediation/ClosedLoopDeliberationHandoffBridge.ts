// src/core/governedPolicyRemediation/ClosedLoopDeliberationHandoffBridge.ts
// Component 1204: ClosedLoopDeliberationHandoffBridge (REAL)
//
// Formats verified remediation proposals into compliant advisory packages for MS-1.5.19
// StrategicAdvisoryMediationRegistry for human deliberation; strictly HANDOFF ONLY.
// Định dạng các đề xuất khắc phục đã xác minh thành các gói khuyến nghị tuân thủ cho MS-1.5.19
// StrategicAdvisoryMediationRegistry để con người nghị sự; nghiêm ngặt CHỈ BÀN GIAO.

import { createHash } from 'node:crypto';
import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type {
  StrategicAdvisoryMediationRegistry,
  RawAdvisoryRecommendationInput,
} from '../governedStrategicPolicyEvolution/StrategicAdvisoryMediationRegistry.js';
import {
  RemediationHandoffPackage,
  RemediationCandidate,
  RootCauseDiagnosisRecord,
  PolicyBlastRadiusRiskRecord,
  GovernedPolicyRemediationEvidenceDossier,
  asHandoffId,
  computeSha256,
  canonicalJsonSerialize,
  EmergencyStopProvider,
  EmergencyStopActiveError,
  CrossTenantAccessForbiddenError,
  DuplicateRemediationHandoffError,
  ExpiredRemediationHandoffError,
  RemediationAuthorityViolationError,
} from './GovernedPolicyRemediationTypes.js';

export interface HandoffPackageContext {
  readonly candidate: RemediationCandidate;
  readonly diagnosis: RootCauseDiagnosisRecord;
  readonly blastRadius: PolicyBlastRadiusRiskRecord;
  readonly dossier: GovernedPolicyRemediationEvidenceDossier;
  readonly activePolicyVersion?: number;
}

export class ClosedLoopDeliberationHandoffBridge {
  private readonly emergencyStopProvider?: EmergencyStopProvider;
  private readonly advisoryRegistry?: StrategicAdvisoryMediationRegistry;
  // Nonce registry: Map<tenantId, Set<nonce>>
  private readonly consumedNoncesByTenant: Map<string, Set<string>> = new Map();
  // Active handoff IDs: Map<tenantId, Set<handoffId>>
  private readonly activeHandoffsByTenant: Map<string, Set<string>> = new Map();

  constructor(
    emergencyStopProvider?: EmergencyStopProvider,
    advisoryRegistry?: StrategicAdvisoryMediationRegistry
  ) {
    this.emergencyStopProvider = emergencyStopProvider;
    this.advisoryRegistry = advisoryRegistry;
  }

  private assertEmergencyStopInactive(): void {
    if (!this.emergencyStopProvider) {
      throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
    }
    let active: unknown;
    try {
      active = this.emergencyStopProvider.isEmergencyStopActive();
    } catch (err: unknown) {
      throw new EmergencyStopActiveError(`Emergency stop provider threw error: ${err instanceof Error ? err.message : String(err)}`);
    }
    if (typeof active !== 'boolean') {
      throw new EmergencyStopActiveError('Emergency stop provider returned non-boolean value (fail-closed)');
    }
    if (active === true) {
      throw new EmergencyStopActiveError('Emergency stop is currently ACTIVE (fail-closed)');
    }
  }

  public compileHandoffPackage(
    tenantId: string,
    policyDomain: PolicyDomain,
    context: HandoffPackageContext,
    currentTime: Date = new Date()
  ): RemediationHandoffPackage {
    this.assertEmergencyStopInactive();

    if (!tenantId || tenantId.trim() === '') {
      throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
    }

    if (context.candidate.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Cross-tenant candidate mismatch: expected '${tenantId}', got '${context.candidate.tenantId}'`
      );
    }
    if (context.diagnosis.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Cross-tenant diagnosis mismatch: expected '${tenantId}', got '${context.diagnosis.tenantId}'`
      );
    }

    // Check expiration of candidate
    const nowMs = currentTime.getTime();
    const candidateExpiryMs = new Date(context.candidate.expiresAt).getTime();
    if (nowMs >= candidateExpiryMs) {
      throw new ExpiredRemediationHandoffError(
        `Remediation candidate '${context.candidate.remediationId}' has expired at ${context.candidate.expiresAt}`
      );
    }

    const handoffId = asHandoffId(`hndf_${tenantId}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`);
    const nonce = computeSha256(`${handoffId}_${context.candidate.candidateHash}_${nowMs}`);
    const createdAt = currentTime.toISOString();
    const expiresAt = new Date(nowMs + 86400 * 1000).toISOString();

    const provenanceHash = computeSha256(
      canonicalJsonSerialize({
        handoffId,
        remediationId: context.candidate.remediationId,
        diagnosisId: context.diagnosis.diagnosisId,
        candidateHash: context.candidate.candidateHash,
        dossierFingerprint: context.dossier.dossierFingerprint,
        nonce,
      })
    );

    return Object.freeze({
      handoffId,
      tenantId,
      policyDomain,
      sourceComponentId: '1204_ClosedLoopDeliberationHandoffBridge',
      destinationComponentId: '1159_StrategicAdvisoryMediationRegistry',
      incidentIds: context.dossier.correlationEnvelope.incidentIds,
      rootCauseDiagnosisId: context.diagnosis.diagnosisId,
      rootCauseCategory: context.diagnosis.primaryCategory,
      diagnosisConfidence: context.diagnosis.confidence,
      blastRadiusRiskLevel: context.blastRadius.riskLevel,
      proposedRemediationAction: context.candidate.proposedAction,
      candidatePolicyDelta: context.candidate.candidatePolicyDelta,
      activePolicyVersion: context.activePolicyVersion ?? 1,
      activePolicyHash: context.candidate.activePolicyHash,
      remediationDossierFingerprint: context.dossier.dossierFingerprint,
      provenanceHash,
      createdAt,
      expiresAt,
      nonce,
    });
  }

  public transmitHandoff(
    pkg: RemediationHandoffPackage,
    currentTime: Date = new Date()
  ): { transmitted: boolean; registeredInDeliberationRegistry: boolean } {
    this.assertEmergencyStopInactive();

    const nowMs = currentTime.getTime();
    const expiryMs = new Date(pkg.expiresAt).getTime();
    if (nowMs >= expiryMs) {
      throw new ExpiredRemediationHandoffError(`Handoff package '${pkg.handoffId}' has expired`);
    }

    let nonces = this.consumedNoncesByTenant.get(pkg.tenantId);
    if (!nonces) {
      nonces = new Set();
      this.consumedNoncesByTenant.set(pkg.tenantId, nonces);
    }

    if (nonces.has(pkg.nonce)) {
      throw new DuplicateRemediationHandoffError(
        `Duplicate handoff rejected: nonce '${pkg.nonce}' already consumed for tenant '${pkg.tenantId}'`
      );
    }
    nonces.add(pkg.nonce);

    let activeHandoffs = this.activeHandoffsByTenant.get(pkg.tenantId);
    if (!activeHandoffs) {
      activeHandoffs = new Set();
      this.activeHandoffsByTenant.set(pkg.tenantId, activeHandoffs);
    }
    activeHandoffs.add(pkg.handoffId);

    let admitted = false;

    // If advisory registry is bound, transmit as RawAdvisoryRecommendationInput
    if (this.advisoryRegistry) {
      const delta: PolicyDelta = {
        fieldPath: `policyRules.${pkg.proposedRemediationAction}`,
        currentValue: null,
        proposedValue: { ...pkg.candidatePolicyDelta },
        rationale: `Operational remediation proposal for incident root-cause [${pkg.rootCauseCategory}]`,
      };

      const rawInput: RawAdvisoryRecommendationInput = {
        tenantId: pkg.tenantId,
        sessionId: `sess_remediation_${pkg.handoffId}`,
        missionId: `mission_remediation_${pkg.handoffId}`,
        sourceRecommendationId: pkg.handoffId,
        sourceStrategicMemoryRecordIds: [pkg.remediationDossierFingerprint],
        policyDomain: pkg.policyDomain,
        proposedChanges: [delta],
        justification: `Automated remediation advisory: ${pkg.proposedRemediationAction} with diagnosis confidence ${pkg.diagnosisConfidence}`,
        advisoryOnly: true,
      };

      this.advisoryRegistry.ingestAndAdmit(rawInput);
      admitted = true;
    }

    return {
      transmitted: true,
      registeredInDeliberationRegistry: admitted,
    };
  }
}
