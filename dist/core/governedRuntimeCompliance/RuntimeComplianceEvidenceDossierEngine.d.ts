import { RuntimeComplianceEvidenceDossier, OperationalAssuranceScore, PolicyViolationRecord } from './GovernedRuntimeComplianceTypes.js';
export declare class RuntimeComplianceEvidenceDossierEngine {
    compileDossier(tenantId: string, assurance: OperationalAssuranceScore, violations: readonly PolicyViolationRecord[], policyVersion: number, canonicalPolicyHash: string): RuntimeComplianceEvidenceDossier;
    verifyDossierIntegrity(dossier: RuntimeComplianceEvidenceDossier): boolean;
}
