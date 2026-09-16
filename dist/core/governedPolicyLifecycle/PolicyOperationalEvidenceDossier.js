// src/core/governedPolicyLifecycle/PolicyOperationalEvidenceDossier.ts
// Component 1183: PolicyOperationalEvidenceDossier (REAL)
//
// Operational evidence compiler creating deeply frozen, immutable proof dossiers.
// Certifies runtime health adherence, incident histories, lineage DAG fingerprints,
// and verified human authorizations. Enforces EVIDENCE != MUTATION_AUTHORITY.
import { computeEvidenceDossierHash, deepFreeze, PolicyOperationalEvidenceError, } from './GovernedPolicyLifecycleTypes.js';
export class PolicyOperationalEvidenceDossierEngine {
    dossiers = new Map();
    dossierCounter = 0;
    /**
     * Compile an immutable operational evidence dossier.
     */
    compileDossier(params) {
        if (!params.tenantId || !params.policyDomain || !params.policyId) {
            throw new PolicyOperationalEvidenceError('INVALID_DOSSIER_PARAMS: tenantId, policyDomain, and policyId are required.');
        }
        if (params.lifecycleRecord.policyId !== params.policyId) {
            throw new PolicyOperationalEvidenceError('POLICY_ID_MISMATCH: lifecycleRecord does not match requested policyId.');
        }
        this.dossierCounter++;
        const dossierId = `oed_${params.tenantId}_${params.policyDomain}_v${params.policyVersion}_${Date.now()}_${this.dossierCounter}`;
        // Sanitized incident records: strip any internal stack traces or raw keys
        const sanitizedIncidents = params.activeIncidents.map((inc) => ({
            incidentId: inc.incidentId,
            incidentType: inc.incidentType,
            severity: inc.severity,
            status: inc.status,
            description: inc.description,
            openedAt: inc.openedAt,
            resolvedAt: inc.resolvedAt,
            incidentHash: inc.incidentHash,
        }));
        const rawDossier = {
            dossierId,
            tenantId: params.tenantId,
            policyDomain: params.policyDomain,
            policyId: params.policyId,
            policyVersion: params.policyVersion,
            lifecycleState: params.lifecycleRecord.state,
            canonicalPolicyHash: params.lifecycleRecord.canonicalPolicyHash,
            latestHealthReport: params.latestHealthReport,
            activeIncidents: Object.freeze(sanitizedIncidents),
            lineageGraphFingerprint: params.lineageGraphFingerprint,
            humanAuthorizationsCount: params.humanAuthorizationsCount || (params.lifecycleRecord.authorizationRef ? 1 : 0),
            compiledAt: Date.now(),
        };
        const dossierFingerprint = computeEvidenceDossierHash(rawDossier);
        const frozenDossier = deepFreeze({
            ...rawDossier,
            dossierFingerprint,
        });
        this.dossiers.set(dossierId, frozenDossier);
        return frozenDossier;
    }
    getDossier(dossierId) {
        return this.dossiers.get(dossierId);
    }
    /**
     * Verify cryptographic fingerprint of a dossier.
     */
    verifyDossierIntegrity(dossier) {
        const raw = {
            dossierId: dossier.dossierId,
            tenantId: dossier.tenantId,
            policyDomain: dossier.policyDomain,
            policyId: dossier.policyId,
            policyVersion: dossier.policyVersion,
            lifecycleState: dossier.lifecycleState,
            canonicalPolicyHash: dossier.canonicalPolicyHash,
            latestHealthReport: dossier.latestHealthReport,
            activeIncidents: dossier.activeIncidents,
            lineageGraphFingerprint: dossier.lineageGraphFingerprint,
            humanAuthorizationsCount: dossier.humanAuthorizationsCount,
            compiledAt: dossier.compiledAt,
        };
        const expectedFingerprint = computeEvidenceDossierHash(raw);
        return dossier.dossierFingerprint === expectedFingerprint;
    }
}
