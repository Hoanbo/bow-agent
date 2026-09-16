import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type PolicyOperationalEvidenceDossier, type PolicyHealthReport, type PolicyIncidentRecord, type PolicyLifecycleRecord } from './GovernedPolicyLifecycleTypes.js';
export declare class PolicyOperationalEvidenceDossierEngine {
    private readonly dossiers;
    private dossierCounter;
    /**
     * Compile an immutable operational evidence dossier.
     */
    compileDossier(params: {
        tenantId: string;
        policyDomain: PolicyDomain;
        policyId: string;
        policyVersion: number;
        lifecycleRecord: PolicyLifecycleRecord;
        latestHealthReport: PolicyHealthReport;
        activeIncidents: readonly PolicyIncidentRecord[];
        lineageGraphFingerprint: string;
        humanAuthorizationsCount?: number;
    }): PolicyOperationalEvidenceDossier;
    getDossier(dossierId: string): PolicyOperationalEvidenceDossier | undefined;
    /**
     * Verify cryptographic fingerprint of a dossier.
     */
    verifyDossierIntegrity(dossier: PolicyOperationalEvidenceDossier): boolean;
}
