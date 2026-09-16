// src/core/governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionModuleIndex.ts
// Component 1177: GovernedPolicyDecisionIngestionModuleIndex (REAL)
//
// Master coordinator and public module export for Governed Policy Decision Ingestion,
// Canonical Ratification & Atomic Staged Deployment Engine (MS-1.5.20).
// Bộ điều phối trung tâm và điểm xuất khẩu công khai cho Động cơ tiếp nhận quyết định chính sách,
// phê chuẩn chuẩn mực và triển khai phân tầng nguyên tử có kiểm soát (MS-1.5.20).
import { GOVERNED_POLICY_DECISION_INGESTION_INVARIANTS, MAX_HANDOFFS_IN_FLIGHT, MAX_DELTAS_PER_PROPOSAL, MAX_POLICY_SIZE_BYTES, MAX_CANONICAL_RULES, MAX_SHADOW_EVAL_TRACES, MAX_CANARY_COHORTS, MAX_HANDOFF_TTL_MS, MAX_MUTEX_WAIT_MS, MAX_ROLLBACK_LINEAGE_DEPTH, CANARY_RINGS, TERMINAL_INGESTION_STATES, GovernedPolicyDecisionIngestionBaseError, PolicyHandoffSchemaValidationError, PolicyHandoffReplayError, HumanDecisionVerificationError, CriticalAffirmationVerificationError, AuthoritativePolicyRatificationError, PolicyCompilationError, PolicyVersionOCCConflictError, PolicyStagedDeploymentError, PolicyRollbackError, PolicyTenantIsolationError, PolicyCircuitBreakerTrippedError, PolicyIngestionInterlockActiveError, computeHandoffIntakeHash, computeHumanDecisionTokenHash, computeRatificationRecordHash, computeCanonicalPolicyHash, computeShadowEvaluationReportHash, computePolicyDeploymentRecordHash, computeRollbackRecordHash, computeIngestionAuditHash, } from './GovernedPolicyDecisionIngestionTypes.js';
import { PdpPolicyHandoffIntakeGateway } from './PdpPolicyHandoffIntakeGateway.js';
import { HumanDecisionTokenVerificationEngine } from './HumanDecisionTokenVerificationEngine.js';
import { AuthoritativePolicyRatificationEngine } from './AuthoritativePolicyRatificationEngine.js';
import { CanonicalStrategicPolicyCompiler } from './CanonicalStrategicPolicyCompiler.js';
import { StrategicPolicyVersionStore } from './StrategicPolicyVersionStore.js';
import { StrategicPolicyShadowEvaluationEngine } from './StrategicPolicyShadowEvaluationEngine.js';
import { StrategicPolicyStagedDeploymentController } from './StrategicPolicyStagedDeploymentController.js';
import { StrategicPolicyRollbackController } from './StrategicPolicyRollbackController.js';
import { CriticalAuditLedger } from './CriticalAuditLedger.js';
export { GOVERNED_POLICY_DECISION_INGESTION_INVARIANTS, MAX_HANDOFFS_IN_FLIGHT, MAX_DELTAS_PER_PROPOSAL, MAX_POLICY_SIZE_BYTES, MAX_CANONICAL_RULES, MAX_SHADOW_EVAL_TRACES, MAX_CANARY_COHORTS, MAX_HANDOFF_TTL_MS, MAX_MUTEX_WAIT_MS, MAX_ROLLBACK_LINEAGE_DEPTH, CANARY_RINGS, TERMINAL_INGESTION_STATES, GovernedPolicyDecisionIngestionBaseError, PolicyHandoffSchemaValidationError, PolicyHandoffReplayError, HumanDecisionVerificationError, CriticalAffirmationVerificationError, AuthoritativePolicyRatificationError, PolicyCompilationError, PolicyVersionOCCConflictError, PolicyStagedDeploymentError, PolicyRollbackError, PolicyTenantIsolationError, PolicyCircuitBreakerTrippedError, PolicyIngestionInterlockActiveError, computeHandoffIntakeHash, computeHumanDecisionTokenHash, computeRatificationRecordHash, computeCanonicalPolicyHash, computeShadowEvaluationReportHash, computePolicyDeploymentRecordHash, computeRollbackRecordHash, computeIngestionAuditHash, PdpPolicyHandoffIntakeGateway, HumanDecisionTokenVerificationEngine, AuthoritativePolicyRatificationEngine, CanonicalStrategicPolicyCompiler, StrategicPolicyVersionStore, StrategicPolicyShadowEvaluationEngine, StrategicPolicyStagedDeploymentController, StrategicPolicyRollbackController, CriticalAuditLedger, };
/**
 * Master Governed Policy Decision Ingestion Coordinator.
 * Orchestrates the full lifecycle from handoff ingestion through ratification,
 * compilation, shadow evaluation, staged canary rollout, and rollback.
};

/**
 * Master Governed Policy Decision Ingestion Coordinator.
 * Orchestrates the full lifecycle from handoff ingestion through ratification,
 * compilation, shadow evaluation, staged canary rollout, and rollback.
 */
export class GovernedPolicyDecisionIngestionCoordinator {
    intakeGateway;
    tokenVerifier;
    ratificationEngine;
    compiler;
    versionStore;
    shadowEngine;
    deploymentController;
    rollbackController;
    auditLedger;
    constructor(options) {
        this.intakeGateway = new PdpPolicyHandoffIntakeGateway({
            isUserStopActive: options?.isUserStopActive,
            isEmergencyStopActive: options?.isEmergencyStopActive,
        });
        this.tokenVerifier = new HumanDecisionTokenVerificationEngine({
            signingSecret: options?.signingSecret,
            nonceRegistryPath: options?.nonceRegistryPath,
            isUserStopActive: options?.isUserStopActive,
            isEmergencyStopActive: options?.isEmergencyStopActive,
        });
        this.ratificationEngine = new AuthoritativePolicyRatificationEngine({
            ratificationSecret: options?.ratificationSecret,
            isUserStopActive: options?.isUserStopActive,
            isEmergencyStopActive: options?.isEmergencyStopActive,
        });
        this.compiler = new CanonicalStrategicPolicyCompiler();
        this.versionStore = new StrategicPolicyVersionStore(options?.customStoreDir, {
            tokenVerifier: this.tokenVerifier,
            isEmergencyStopActive: options?.isEmergencyStopActive,
            isUserStopActive: options?.isUserStopActive,
        });
        this.shadowEngine = new StrategicPolicyShadowEvaluationEngine();
        this.deploymentController = new StrategicPolicyStagedDeploymentController(this.versionStore, {
            isUserStopActive: options?.isUserStopActive,
            isEmergencyStopActive: options?.isEmergencyStopActive,
        });
        this.rollbackController = new StrategicPolicyRollbackController(this.versionStore, this.deploymentController, this.tokenVerifier, options?.isEmergencyStopActive);
        this.auditLedger = new CriticalAuditLedger(options?.auditLedgerPath);
    }
    /**
     * Execute full end-to-end governed ingestion, ratification, compilation, shadow, and staged deployment.
     */
    ingestAndDeployPolicy(params) {
        // 1. Ingestion & Schema Gate
        const critical = params.requirements?.elevatedSingleHumanAffirmationRequired === true;
        let intakeRecord;
        try {
            intakeRecord = this.intakeGateway.ingestHandoff(params.handoff, params.callingTenantContext);
            // 2. Cryptographic Human Decision Token Verification
            const humanVerification = this.tokenVerifier.verifyDecisionToken(params.token, params.record, params.handoff.dossierProvenanceHash, params.requirements);
            if (params.token.policyDomain !== params.handoff.policyDomain ||
                params.token.proposalId !== params.handoff.proposalId || params.token.dossierId !== params.handoff.dossierId ||
                params.token.policyDeltaHash !== params.handoff.policyDeltaHash || params.record.tenantId !== params.handoff.tenantId ||
                humanVerification.dossierProvenanceHash !== params.handoff.dossierProvenanceHash) {
                throw new HumanDecisionVerificationError('TOCTOU_BINDING_MISMATCH: token, record, and handoff commitments must agree.');
            }
            // 3. Authoritative PDP Ratification
            const currentVersion = this.versionStore.getActivePolicy(params.handoff.tenantId, params.handoff.policyDomain);
            const expectedBase = currentVersion?.policyVersion || 0;
            const ratificationRecord = this.ratificationEngine.ratifyPolicy(intakeRecord, humanVerification, params.handoff.proposedChanges, expectedBase);
            this.versionStore.saveRatificationRecord(ratificationRecord);
            // 4. Deterministic Canonical Compilation
            const canonicalPolicy = this.compiler.compilePolicy(ratificationRecord, params.handoff.proposedChanges, currentVersion);
            this.versionStore.savePolicyVersion(canonicalPolicy);
            // 5. Read-Only Shadow Evaluation
            const shadowReport = this.shadowEngine.evaluateShadow(canonicalPolicy, params.historicalTraces);
            // 6. Initiate Staged Deployment (Ring 0 Shadow)
            const deploymentRecord = this.deploymentController.initiateDeployment(canonicalPolicy, shadowReport, {
                token: params.token,
                record: params.record,
            });
            if (critical)
                this.auditLedger.append('CRITICAL_PROPOSAL_AFFIRMED', params.handoff.tenantId, { decision: 'APPROVE', tokenHash: humanVerification.tokenHash }, { proposalId: params.handoff.proposalId, handoffId: params.handoff.handoffId, policyDomain: params.handoff.policyDomain });
            return {
                intakeRecord: intakeRecord,
                humanVerification,
                ratificationRecord,
                canonicalPolicy,
                shadowReport,
                deploymentRecord,
            };
        }
        catch (error) {
            if (critical)
                this.auditLedger.append('CRITICAL_PROPOSAL_REJECTED', params.handoff.tenantId, { reason: error instanceof Error ? error.message : 'UNKNOWN_REJECTION' }, { proposalId: params.handoff.proposalId, handoffId: params.handoff.handoffId, policyDomain: params.handoff.policyDomain });
            throw error;
        }
        finally {
            this.intakeGateway.releaseInFlight(params.handoff.tenantId);
        }
    }
}
