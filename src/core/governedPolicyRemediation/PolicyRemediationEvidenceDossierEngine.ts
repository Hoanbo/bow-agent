// src/core/governedPolicyRemediation/PolicyRemediationEvidenceDossierEngine.ts
// Component 1205: PolicyRemediationEvidenceDossierEngine (REAL)
//
// Compiles deeply frozen, SHA-256 fingerprinted Remediation Evidence Dossiers certifying
// the entire causal diagnosis, blast radius evaluation, and candidate remediation trail.
// Biên soạn các Hồ sơ bằng chứng khắc phục được đóng băng sâu và gắn vân tay SHA-256,
// chứng thực toàn bộ chuỗi chẩn đoán nguyên nhân, đánh giá bán kính ảnh hưởng và ứng viên khắc phục.

import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  GovernedPolicyRemediationEvidenceDossier,
  CorrelatedIncidentEnvelope,
  RootCauseDiagnosisRecord,
  PolicyBlastRadiusRiskRecord,
  RemediationCandidate,
  asRemediationDossierId,
  computeEvidenceDossierFingerprint,
  EmergencyStopProvider,
  EmergencyStopActiveError,
  CrossTenantAccessForbiddenError,
  RemediationEvidenceError,
} from './GovernedPolicyRemediationTypes.js';

export interface DossierCompilationInput {
  readonly correlationEnvelope: CorrelatedIncidentEnvelope;
  readonly diagnosisRecord: RootCauseDiagnosisRecord;
  readonly blastRadiusRecord: PolicyBlastRadiusRiskRecord;
  readonly remediationCandidate: RemediationCandidate;
}

export class PolicyRemediationEvidenceDossierEngine {
  private readonly emergencyStopProvider?: EmergencyStopProvider;

  constructor(emergencyStopProvider?: EmergencyStopProvider) {
    this.emergencyStopProvider = emergencyStopProvider;
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

  public compileRemediationDossier(
    tenantId: string,
    policyDomain: PolicyDomain,
    input: DossierCompilationInput
  ): GovernedPolicyRemediationEvidenceDossier {
    this.assertEmergencyStopInactive();

    if (!tenantId || tenantId.trim() === '') {
      throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
    }

    // Verify tenant boundaries across all components
    if (input.correlationEnvelope.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Correlation envelope tenant '${input.correlationEnvelope.tenantId}' does not match '${tenantId}'`
      );
    }
    if (input.diagnosisRecord.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Diagnosis record tenant '${input.diagnosisRecord.tenantId}' does not match '${tenantId}'`
      );
    }
    if (input.blastRadiusRecord.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Blast radius record tenant '${input.blastRadiusRecord.tenantId}' does not match '${tenantId}'`
      );
    }
    if (input.remediationCandidate.tenantId !== tenantId) {
      throw new CrossTenantAccessForbiddenError(
        `Remediation candidate tenant '${input.remediationCandidate.tenantId}' does not match '${tenantId}'`
      );
    }

    const dossierId = asRemediationDossierId(
      `dos_${tenantId}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`
    );

    const dossierFingerprint = computeEvidenceDossierFingerprint({
      tenantId,
      policyDomain,
      correlationHash: input.correlationEnvelope.correlationHash,
      diagnosisHash: input.diagnosisRecord.diagnosisHash,
      blastRadiusHash: input.blastRadiusRecord.blastRadiusHash,
      candidateHash: input.remediationCandidate.candidateHash,
    });

    const dossier: GovernedPolicyRemediationEvidenceDossier = Object.freeze({
      dossierId,
      tenantId,
      policyDomain,
      correlationEnvelope: Object.freeze({ ...input.correlationEnvelope }),
      diagnosisRecord: Object.freeze({ ...input.diagnosisRecord }),
      blastRadiusRecord: Object.freeze({ ...input.blastRadiusRecord }),
      remediationCandidate: Object.freeze({ ...input.remediationCandidate }),
      dossierFingerprint,
      compiledAt: new Date().toISOString(),
    });

    return dossier;
  }
}
