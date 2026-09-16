// src/core/governedPolicyRemediation/PolicyRemediationEvidenceDossierEngine.ts
// Component 1205: PolicyRemediationEvidenceDossierEngine (REAL)
//
// Compiles deeply frozen, SHA-256 fingerprinted Remediation Evidence Dossiers certifying
// the entire causal diagnosis, blast radius evaluation, and candidate remediation trail.
// Biên soạn các Hồ sơ bằng chứng khắc phục được đóng băng sâu và gắn vân tay SHA-256,
// chứng thực toàn bộ chuỗi chẩn đoán nguyên nhân, đánh giá bán kính ảnh hưởng và ứng viên khắc phục.
import { asRemediationDossierId, computeEvidenceDossierFingerprint, EmergencyStopActiveError, CrossTenantAccessForbiddenError, } from './GovernedPolicyRemediationTypes.js';
export class PolicyRemediationEvidenceDossierEngine {
    emergencyStopProvider;
    constructor(emergencyStopProvider) {
        this.emergencyStopProvider = emergencyStopProvider;
    }
    assertEmergencyStopInactive() {
        if (!this.emergencyStopProvider) {
            throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
        }
        let active;
        try {
            active = this.emergencyStopProvider.isEmergencyStopActive();
        }
        catch (err) {
            throw new EmergencyStopActiveError(`Emergency stop provider threw error: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (typeof active !== 'boolean') {
            throw new EmergencyStopActiveError('Emergency stop provider returned non-boolean value (fail-closed)');
        }
        if (active === true) {
            throw new EmergencyStopActiveError('Emergency stop is currently ACTIVE (fail-closed)');
        }
    }
    compileRemediationDossier(tenantId, policyDomain, input) {
        this.assertEmergencyStopInactive();
        if (!tenantId || tenantId.trim() === '') {
            throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
        }
        // Verify tenant boundaries across all components
        if (input.correlationEnvelope.tenantId !== tenantId) {
            throw new CrossTenantAccessForbiddenError(`Correlation envelope tenant '${input.correlationEnvelope.tenantId}' does not match '${tenantId}'`);
        }
        if (input.diagnosisRecord.tenantId !== tenantId) {
            throw new CrossTenantAccessForbiddenError(`Diagnosis record tenant '${input.diagnosisRecord.tenantId}' does not match '${tenantId}'`);
        }
        if (input.blastRadiusRecord.tenantId !== tenantId) {
            throw new CrossTenantAccessForbiddenError(`Blast radius record tenant '${input.blastRadiusRecord.tenantId}' does not match '${tenantId}'`);
        }
        if (input.remediationCandidate.tenantId !== tenantId) {
            throw new CrossTenantAccessForbiddenError(`Remediation candidate tenant '${input.remediationCandidate.tenantId}' does not match '${tenantId}'`);
        }
        const dossierId = asRemediationDossierId(`dos_${tenantId}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`);
        const dossierFingerprint = computeEvidenceDossierFingerprint({
            tenantId,
            policyDomain,
            correlationHash: input.correlationEnvelope.correlationHash,
            diagnosisHash: input.diagnosisRecord.diagnosisHash,
            blastRadiusHash: input.blastRadiusRecord.blastRadiusHash,
            candidateHash: input.remediationCandidate.candidateHash,
        });
        const dossier = Object.freeze({
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
