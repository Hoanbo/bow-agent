// src/core/governedRuntimeCompliance/RuntimeComplianceEvidenceDossierEngine.ts
// Component 1195: RuntimeComplianceEvidenceDossierEngine (REAL)
//
// Compiles deeply frozen, tamper-evident runtime compliance evidence dossiers
// certifying observed behavior against active canonical policy versions.
// Strictly non-authoritative: EVIDENCE != AUTHORIZATION.
// Tổng hợp hồ sơ bằng chứng tuân thủ thời gian thực bất biến, chống giả mạo sâu
// chứng nhận hành vi quan sát được so với phiên bản chính sách chuẩn đang hoạt động.
// Hoàn toàn không có thẩm quyền: BẰNG CHỨNG != THẨM QUYỀN.

import {
  ComplianceDossierId,
  RuntimeComplianceEvidenceDossier,
  OperationalAssuranceScore,
  PolicyViolationRecord,
  PolicyViolationCategory,
  computeDossierFingerprint,
  computeSha256,
} from './GovernedRuntimeComplianceTypes.js';

export class RuntimeComplianceEvidenceDossierEngine {
  // Compiles an immutable, deeply frozen RuntimeComplianceEvidenceDossier.
  // Tổng hợp hồ sơ bằng chứng tuân thủ thời gian thực bất biến được đóng băng sâu.
  public compileDossier(
    tenantId: string,
    assurance: OperationalAssuranceScore,
    violations: readonly PolicyViolationRecord[],
    policyVersion: number,
    canonicalPolicyHash: string
  ): RuntimeComplianceEvidenceDossier {
    const violationSummary: Record<PolicyViolationCategory, number> = {
      AUTHORIZATION_VIOLATION: 0,
      POLICY_RULE_VIOLATION: 0,
      TENANT_BOUNDARY_VIOLATION: 0,
      LIFECYCLE_STATE_VIOLATION: 0,
      SAFETY_INTERLOCK_VIOLATION: 0,
      BEHAVIORAL_DRIFT: 0,
      TEMPORAL_ORDER_VIOLATION: 0,
      REPEATED_NONCOMPLIANCE: 0,
    };

    for (const v of violations) {
      violationSummary[v.category] = (violationSummary[v.category] ?? 0) + 1;
    }

    const rawDossierId = `${tenantId}:${assurance.policyDomain}:${policyVersion}:${assurance.windowStart}:${assurance.windowEnd}`;
    const dossierId = `dos_comp_${computeSha256(rawDossierId).slice(0, 16)}` as ComplianceDossierId;
    const compiledAt = new Date().toISOString();

    const partialDossier: Omit<RuntimeComplianceEvidenceDossier, 'sha256Fingerprint'> = {
      dossierId,
      tenantId,
      policyDomain: assurance.policyDomain,
      policyVersion,
      canonicalPolicyHash,
      windowStart: assurance.windowStart,
      windowEnd: assurance.windowEnd,
      observationCount: assurance.observationCount,
      assuranceScore: assurance.scoreValue,
      assuranceState: assurance.state,
      violationSummary: Object.freeze(violationSummary),
      compiledAt,
    };

    const sha256Fingerprint = computeDossierFingerprint(partialDossier);

    const fullDossier: RuntimeComplianceEvidenceDossier = Object.freeze({
      ...partialDossier,
      sha256Fingerprint,
    });

    return fullDossier;
  }

  // Verifies the structural integrity and SHA-256 fingerprint of a dossier.
  // Xác minh tính toàn vẹn cấu trúc và dấu vân tay SHA-256 của hồ sơ.
  public verifyDossierIntegrity(dossier: RuntimeComplianceEvidenceDossier): boolean {
    const { sha256Fingerprint, ...rest } = dossier;
    const expectedFingerprint = computeDossierFingerprint(rest);
    return sha256Fingerprint === expectedFingerprint;
  }
}
