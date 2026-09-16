// src/core/governedPolicyRemediation/ClosedLoopDeliberationHandoffBridge.ts
// Component 1204: ClosedLoopDeliberationHandoffBridge (REAL)
//
// Formats verified remediation proposals into compliant advisory packages for MS-1.5.19
// StrategicAdvisoryMediationRegistry for human deliberation; strictly HANDOFF ONLY.
// Định dạng các đề xuất khắc phục đã xác minh thành các gói khuyến nghị tuân thủ cho MS-1.5.19
// StrategicAdvisoryMediationRegistry để con người nghị sự; nghiêm ngặt CHỈ BÀN GIAO.
import { asHandoffId, computeSha256, canonicalJsonSerialize, EmergencyStopActiveError, CrossTenantAccessForbiddenError, DuplicateRemediationHandoffError, ExpiredRemediationHandoffError, } from './GovernedPolicyRemediationTypes.js';
export class ClosedLoopDeliberationHandoffBridge {
    emergencyStopProvider;
    advisoryRegistry;
    // Nonce registry: Map<tenantId, Set<nonce>>
    consumedNoncesByTenant = new Map();
    // Active handoff IDs: Map<tenantId, Set<handoffId>>
    activeHandoffsByTenant = new Map();
    constructor(emergencyStopProvider, advisoryRegistry) {
        this.emergencyStopProvider = emergencyStopProvider;
        this.advisoryRegistry = advisoryRegistry;
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
    compileHandoffPackage(tenantId, policyDomain, context, currentTime = new Date()) {
        this.assertEmergencyStopInactive();
        if (!tenantId || tenantId.trim() === '') {
            throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
        }
        if (context.candidate.tenantId !== tenantId) {
            throw new CrossTenantAccessForbiddenError(`Cross-tenant candidate mismatch: expected '${tenantId}', got '${context.candidate.tenantId}'`);
        }
        if (context.diagnosis.tenantId !== tenantId) {
            throw new CrossTenantAccessForbiddenError(`Cross-tenant diagnosis mismatch: expected '${tenantId}', got '${context.diagnosis.tenantId}'`);
        }
        // Check expiration of candidate
        const nowMs = currentTime.getTime();
        const candidateExpiryMs = new Date(context.candidate.expiresAt).getTime();
        if (nowMs >= candidateExpiryMs) {
            throw new ExpiredRemediationHandoffError(`Remediation candidate '${context.candidate.remediationId}' has expired at ${context.candidate.expiresAt}`);
        }
        const handoffId = asHandoffId(`hndf_${tenantId}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`);
        const nonce = computeSha256(`${handoffId}_${context.candidate.candidateHash}_${nowMs}`);
        const createdAt = currentTime.toISOString();
        const expiresAt = new Date(nowMs + 86400 * 1000).toISOString();
        const provenanceHash = computeSha256(canonicalJsonSerialize({
            handoffId,
            remediationId: context.candidate.remediationId,
            diagnosisId: context.diagnosis.diagnosisId,
            candidateHash: context.candidate.candidateHash,
            dossierFingerprint: context.dossier.dossierFingerprint,
            nonce,
        }));
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
    transmitHandoff(pkg, currentTime = new Date()) {
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
            throw new DuplicateRemediationHandoffError(`Duplicate handoff rejected: nonce '${pkg.nonce}' already consumed for tenant '${pkg.tenantId}'`);
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
            const delta = {
                fieldPath: `policyRules.${pkg.proposedRemediationAction}`,
                currentValue: null,
                proposedValue: { ...pkg.candidatePolicyDelta },
                rationale: `Operational remediation proposal for incident root-cause [${pkg.rootCauseCategory}]`,
            };
            const rawInput = {
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
