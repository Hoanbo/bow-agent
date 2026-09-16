// src/core/governedPolicyRemediation/GovernedPolicyRemediationModuleIndex.ts
// Component 1207: GovernedPolicyRemediationModuleIndex (REAL)
//
// Master coordinator and public barrel export interface for the entire native governed
// policy remediation subsystem, orchestrating closed-loop resilience while enforcing strict boundaries.
// Bộ điều phối chính và giao diện xuất công khai cho toàn bộ phân hệ khắc phục chính sách được quản trị bản địa,
// điều phối tính bền bỉ khép vòng đồng thời thực thi các ranh giới nghiêm ngặt.
import { EmergencyStopActiveError, CrossTenantAccessForbiddenError, } from './GovernedPolicyRemediationTypes.js';
import { IncidentComplianceEvidenceCorrelator, } from './IncidentComplianceEvidenceCorrelator.js';
import { DeterministicPolicyRootCauseEngine, } from './DeterministicPolicyRootCauseEngine.js';
import { PolicyBlastRadiusRiskAnalyzer, } from './PolicyBlastRadiusRiskAnalyzer.js';
import { GovernedRemediationStrategySynthesizer, } from './GovernedRemediationStrategySynthesizer.js';
import { OperationalCircuitBreakerAntiThrashingController, } from './OperationalCircuitBreakerAntiThrashingController.js';
import { ClosedLoopDeliberationHandoffBridge, } from './ClosedLoopDeliberationHandoffBridge.js';
import { PolicyRemediationEvidenceDossierEngine, } from './PolicyRemediationEvidenceDossierEngine.js';
import { PolicyRemediationAuditLedger, } from './PolicyRemediationAuditLedger.js';
export class GovernedPolicyRemediationModuleIndex {
    emergencyStopProvider;
    correlator;
    rootCauseEngine;
    riskAnalyzer;
    strategySynthesizer;
    circuitBreaker;
    handoffBridge;
    dossierEngine;
    auditLedger;
    constructor(config) {
        this.emergencyStopProvider = config?.emergencyStopProvider;
        this.correlator = new IncidentComplianceEvidenceCorrelator(this.emergencyStopProvider);
        this.rootCauseEngine = new DeterministicPolicyRootCauseEngine(this.emergencyStopProvider);
        this.riskAnalyzer = new PolicyBlastRadiusRiskAnalyzer(this.emergencyStopProvider);
        this.strategySynthesizer = new GovernedRemediationStrategySynthesizer(this.emergencyStopProvider);
        this.circuitBreaker = new OperationalCircuitBreakerAntiThrashingController(this.emergencyStopProvider);
        this.handoffBridge = new ClosedLoopDeliberationHandoffBridge(this.emergencyStopProvider);
        this.dossierEngine = new PolicyRemediationEvidenceDossierEngine(this.emergencyStopProvider);
        this.auditLedger = new PolicyRemediationAuditLedger(this.emergencyStopProvider, config?.baseStorageDir);
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
    // Public Component Accessors
    getCorrelator() { return this.correlator; }
    getRootCauseEngine() { return this.rootCauseEngine; }
    getRiskAnalyzer() { return this.riskAnalyzer; }
    getStrategySynthesizer() { return this.strategySynthesizer; }
    getCircuitBreaker() { return this.circuitBreaker; }
    getHandoffBridge() { return this.handoffBridge; }
    getDossierEngine() { return this.dossierEngine; }
    getAuditLedger() { return this.auditLedger; }
    /**
     * Orchestrates the complete end-to-end closed-loop remediation assessment pipeline.
     * Strictly non-authoritative: output is an evidence dossier and human deliberation handoff package.
     */
    async processIncidentRemediationPipeline(tenantId, policyDomain, input) {
        this.assertEmergencyStopInactive();
        if (!tenantId || tenantId.trim() === '') {
            throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
        }
        // 1. Correlate compliance evidence and operational incidents
        const envelope = this.correlator.correlateIncidentEvidence(tenantId, policyDomain, input.complianceData);
        await this.auditLedger.appendEvent(tenantId, policyDomain, 'INCIDENT_CORRELATED', {
            correlationId: envelope.correlationId,
            incidentCount: envelope.incidentIds.length,
            violationCount: envelope.violationIds.length,
        });
        // 2. Deterministic Root-Cause Causal Diagnosis
        const diagnosis = this.rootCauseEngine.diagnoseRootCause(tenantId, policyDomain, {
            envelope,
            activePolicyHash: input.activePolicyHash,
            lineageNodes: input.lineageNodes,
            violations: input.complianceData.violations,
            environmentTelemetry: input.environmentTelemetry,
        });
        await this.auditLedger.appendEvent(tenantId, policyDomain, 'ROOT_CAUSE_DIAGNOSED', {
            diagnosisId: diagnosis.diagnosisId,
            primaryCategory: diagnosis.primaryCategory,
            confidence: diagnosis.confidence,
        });
        // 3. Blast Radius & Systemic Risk Analysis
        const blastRadius = this.riskAnalyzer.evaluateBlastRadius(tenantId, policyDomain, diagnosis, input.workflowImpact);
        await this.auditLedger.appendEvent(tenantId, policyDomain, 'BLAST_RADIUS_EVALUATED', {
            riskAnalysisId: blastRadius.riskAnalysisId,
            riskScore: blastRadius.riskScore,
            riskLevel: blastRadius.riskLevel,
        });
        // 4. Candidate Strategy Proposal Synthesis
        const candidate = this.strategySynthesizer.synthesizeRemediationCandidate(tenantId, policyDomain, {
            diagnosis,
            blastRadius,
            incidentEvidenceHash: envelope.correlationHash,
            activePolicyHash: input.activePolicyHash,
            activePolicyVersion: input.activePolicyVersion,
        });
        await this.auditLedger.appendEvent(tenantId, policyDomain, 'REMEDIATION_CANDIDATE_GENERATED', {
            remediationId: candidate.remediationId,
            proposedAction: candidate.proposedAction,
            candidateHash: candidate.candidateHash,
        });
        // 5. Immutable Evidence Dossier Compilation
        const dossier = this.dossierEngine.compileRemediationDossier(tenantId, policyDomain, {
            correlationEnvelope: envelope,
            diagnosisRecord: diagnosis,
            blastRadiusRecord: blastRadius,
            remediationCandidate: candidate,
        });
        // 6. Closed-Loop Deliberation Handoff Packaging
        const handoffPackage = this.handoffBridge.compileHandoffPackage(tenantId, policyDomain, {
            candidate,
            diagnosis,
            blastRadius,
            dossier,
            activePolicyVersion: input.activePolicyVersion,
        });
        await this.auditLedger.appendEvent(tenantId, policyDomain, 'HANDOFF_PACKAGE_COMPILED', {
            handoffId: handoffPackage.handoffId,
            remediationId: candidate.remediationId,
            dossierFingerprint: dossier.dossierFingerprint,
        });
        let transmitted = false;
        if (input.autoTransmitToDeliberation) {
            const transmitResult = this.handoffBridge.transmitHandoff(handoffPackage);
            transmitted = transmitResult.transmitted;
            await this.auditLedger.appendEvent(tenantId, policyDomain, 'HANDOFF_PACKAGE_TRANSMITTED', {
                handoffId: handoffPackage.handoffId,
                registered: transmitResult.registeredInDeliberationRegistry,
            });
        }
        return Object.freeze({
            dossier,
            handoffPackage,
            transmitted,
        });
    }
}
