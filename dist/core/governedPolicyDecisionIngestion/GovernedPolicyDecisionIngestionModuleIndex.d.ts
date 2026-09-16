import type { PdpPolicyHandoffPackage, HumanDecisionRecord, HumanDecisionToken, HumanReviewRequirements } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { GOVERNED_POLICY_DECISION_INGESTION_INVARIANTS, MAX_HANDOFFS_IN_FLIGHT, MAX_DELTAS_PER_PROPOSAL, MAX_POLICY_SIZE_BYTES, MAX_CANONICAL_RULES, MAX_SHADOW_EVAL_TRACES, MAX_CANARY_COHORTS, MAX_HANDOFF_TTL_MS, MAX_MUTEX_WAIT_MS, MAX_ROLLBACK_LINEAGE_DEPTH, CANARY_RINGS, TERMINAL_INGESTION_STATES, GovernedPolicyDecisionIngestionBaseError, PolicyHandoffSchemaValidationError, PolicyHandoffReplayError, HumanDecisionVerificationError, CriticalAffirmationVerificationError, AuthoritativePolicyRatificationError, PolicyCompilationError, PolicyVersionOCCConflictError, PolicyStagedDeploymentError, PolicyRollbackError, PolicyTenantIsolationError, PolicyCircuitBreakerTrippedError, PolicyIngestionInterlockActiveError, computeHandoffIntakeHash, computeHumanDecisionTokenHash, computeRatificationRecordHash, computeCanonicalPolicyHash, computeShadowEvaluationReportHash, computePolicyDeploymentRecordHash, computeRollbackRecordHash, computeIngestionAuditHash, type HandoffId, type RatificationId, type StrategicPolicyId, type DeploymentId, type RollbackId, type ShadowReportId, type IngestionLifecycleStatus, type ActiveOperationalLifecycleStatus, type ResolvedOutcomeLifecycleStatus, type TerminalFaultLifecycleStatus, type PolicyIngestionSecurityCheckpoint, type PolicyDeploymentStage, type CanaryRing, type CanaryRingDefinition, type CanonicalPolicyRule, type CanonicalStrategicPolicy, type AuthoritativeRatificationRecord, type PolicyDeploymentRecord, type ShadowEvaluationReport, type PolicyRollbackRecord, type IngestionAuditEventType, type IngestionAuditEvent } from './GovernedPolicyDecisionIngestionTypes.js';
import { PdpPolicyHandoffIntakeGateway, type ValidatedIntakeRecord } from './PdpPolicyHandoffIntakeGateway.js';
import { HumanDecisionTokenVerificationEngine, type HumanVerificationResult } from './HumanDecisionTokenVerificationEngine.js';
import { AuthoritativePolicyRatificationEngine } from './AuthoritativePolicyRatificationEngine.js';
import { CanonicalStrategicPolicyCompiler } from './CanonicalStrategicPolicyCompiler.js';
import { StrategicPolicyVersionStore } from './StrategicPolicyVersionStore.js';
import { StrategicPolicyShadowEvaluationEngine, type HistoricalDecisionTrace } from './StrategicPolicyShadowEvaluationEngine.js';
import { StrategicPolicyStagedDeploymentController } from './StrategicPolicyStagedDeploymentController.js';
import { StrategicPolicyRollbackController } from './StrategicPolicyRollbackController.js';
import { CriticalAuditLedger } from './CriticalAuditLedger.js';
export { GOVERNED_POLICY_DECISION_INGESTION_INVARIANTS, MAX_HANDOFFS_IN_FLIGHT, MAX_DELTAS_PER_PROPOSAL, MAX_POLICY_SIZE_BYTES, MAX_CANONICAL_RULES, MAX_SHADOW_EVAL_TRACES, MAX_CANARY_COHORTS, MAX_HANDOFF_TTL_MS, MAX_MUTEX_WAIT_MS, MAX_ROLLBACK_LINEAGE_DEPTH, CANARY_RINGS, TERMINAL_INGESTION_STATES, GovernedPolicyDecisionIngestionBaseError, PolicyHandoffSchemaValidationError, PolicyHandoffReplayError, HumanDecisionVerificationError, CriticalAffirmationVerificationError, AuthoritativePolicyRatificationError, PolicyCompilationError, PolicyVersionOCCConflictError, PolicyStagedDeploymentError, PolicyRollbackError, PolicyTenantIsolationError, PolicyCircuitBreakerTrippedError, PolicyIngestionInterlockActiveError, computeHandoffIntakeHash, computeHumanDecisionTokenHash, computeRatificationRecordHash, computeCanonicalPolicyHash, computeShadowEvaluationReportHash, computePolicyDeploymentRecordHash, computeRollbackRecordHash, computeIngestionAuditHash, type HandoffId, type RatificationId, type StrategicPolicyId, type DeploymentId, type RollbackId, type ShadowReportId, type IngestionLifecycleStatus, type ActiveOperationalLifecycleStatus, type ResolvedOutcomeLifecycleStatus, type TerminalFaultLifecycleStatus, type PolicyIngestionSecurityCheckpoint, type PolicyDeploymentStage, type CanaryRing, type CanaryRingDefinition, type CanonicalPolicyRule, type CanonicalStrategicPolicy, type AuthoritativeRatificationRecord, type PolicyDeploymentRecord, type ShadowEvaluationReport, type PolicyRollbackRecord, type IngestionAuditEventType, type IngestionAuditEvent, PdpPolicyHandoffIntakeGateway, type ValidatedIntakeRecord, HumanDecisionTokenVerificationEngine, type HumanVerificationResult, AuthoritativePolicyRatificationEngine, CanonicalStrategicPolicyCompiler, StrategicPolicyVersionStore, StrategicPolicyShadowEvaluationEngine, type HistoricalDecisionTrace, StrategicPolicyStagedDeploymentController, StrategicPolicyRollbackController, CriticalAuditLedger, };
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
export declare class GovernedPolicyDecisionIngestionCoordinator {
    readonly intakeGateway: PdpPolicyHandoffIntakeGateway;
    readonly tokenVerifier: HumanDecisionTokenVerificationEngine;
    readonly ratificationEngine: AuthoritativePolicyRatificationEngine;
    readonly compiler: CanonicalStrategicPolicyCompiler;
    readonly versionStore: StrategicPolicyVersionStore;
    readonly shadowEngine: StrategicPolicyShadowEvaluationEngine;
    readonly deploymentController: StrategicPolicyStagedDeploymentController;
    readonly rollbackController: StrategicPolicyRollbackController;
    readonly auditLedger: CriticalAuditLedger;
    constructor(options?: {
        customStoreDir?: string;
        signingSecret?: string;
        ratificationSecret?: string;
        isUserStopActive?: (tenantId?: string) => boolean;
        isEmergencyStopActive?: (domain?: string) => boolean;
        nonceRegistryPath?: string;
        auditLedgerPath?: string;
    });
    /**
     * Execute full end-to-end governed ingestion, ratification, compilation, shadow, and staged deployment.
     */
    ingestAndDeployPolicy(params: {
        handoff: PdpPolicyHandoffPackage;
        token: HumanDecisionToken;
        record: HumanDecisionRecord;
        historicalTraces: HistoricalDecisionTrace[];
        callingTenantContext?: string;
        requirements?: HumanReviewRequirements;
    }): {
        intakeRecord: ValidatedIntakeRecord;
        humanVerification: HumanVerificationResult;
        ratificationRecord: AuthoritativeRatificationRecord;
        canonicalPolicy: CanonicalStrategicPolicy;
        shadowReport: ShadowEvaluationReport;
        deploymentRecord: PolicyDeploymentRecord;
    };
}
