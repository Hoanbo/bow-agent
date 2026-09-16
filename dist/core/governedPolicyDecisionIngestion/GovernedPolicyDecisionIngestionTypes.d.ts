import type { PolicyDomain, PolicyDelta, RiskLevel, PdpPolicyHandoffPackage, HumanDecisionToken, HumanDecisionRecord } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { canonicalPolicyDeltaArray, computePolicyDeltaHash } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export { canonicalPolicyDeltaArray, computePolicyDeltaHash };
export interface PdpPolicyHandoffEnvelope {
    readonly handoffPackage: PdpPolicyHandoffPackage;
    readonly humanDecisionToken: HumanDecisionToken;
    readonly humanDecisionRecord?: HumanDecisionRecord;
}
export type HandoffId = string & {
    readonly __brand: unique symbol;
};
export type RatificationId = string & {
    readonly __brand: unique symbol;
};
export type StrategicPolicyId = string & {
    readonly __brand: unique symbol;
};
export type DeploymentId = string & {
    readonly __brand: unique symbol;
};
export type RollbackId = string & {
    readonly __brand: unique symbol;
};
export type ShadowReportId = string & {
    readonly __brand: unique symbol;
};
export declare const MAX_HANDOFFS_IN_FLIGHT = 5;
export declare const MAX_DELTAS_PER_PROPOSAL = 50;
export declare const MAX_POLICY_SIZE_BYTES: number;
export declare const MAX_CANONICAL_RULES = 500;
export declare const MAX_SHADOW_EVAL_TRACES = 500;
export declare const MAX_CANARY_COHORTS = 10;
export declare const MAX_HANDOFF_TTL_MS = 86400000;
export declare const MAX_CRITICAL_TTL_MS = 3600000;
export declare const MAX_MUTEX_WAIT_MS = 5000;
export declare const MAX_ROLLBACK_LINEAGE_DEPTH = 20;
export declare const MAX_AUDIT_LEDGER_FILE_BYTES: number;
export declare const GOVERNED_POLICY_DECISION_INGESTION_INVARIANTS: readonly string[];
export type ActiveOperationalLifecycleStatus = 'INTAKE_RECEIVED' | 'INTAKE_VALIDATED' | 'HUMAN_TOKEN_VERIFYING' | 'HUMAN_TOKEN_VERIFIED' | 'RATIFYING_PDP' | 'RATIFIED' | 'COMPILING' | 'COMPILED' | 'SHADOW_EVALUATING' | 'CANARY_ACTIVE' | 'FULLY_ACTIVE';
export type ResolvedOutcomeLifecycleStatus = 'REJECTED_BY_GATEWAY' | 'RATIFICATION_DENIED' | 'DEPLOYMENT_ROLLED_BACK' | 'SUPERSEDED';
export type TerminalFaultLifecycleStatus = 'FAULT_CRASH_RECOVERED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP';
export type IngestionLifecycleStatus = ActiveOperationalLifecycleStatus | ResolvedOutcomeLifecycleStatus | TerminalFaultLifecycleStatus;
export declare const TERMINAL_INGESTION_STATES: ReadonlySet<IngestionLifecycleStatus>;
export type PolicyIngestionSecurityCheckpoint = 'CP_01_HANDOFF_SCHEMA' | 'CP_02_REPLAY_DEFENSE' | 'CP_03_TENANT_ISOLATION' | 'CP_04_HUMAN_SIGNATURE' | 'CP_05_ELEVATED_SINGLE_HUMAN_AFFIRMATION' | 'CP_06_PROVENANCE_INTEGRITY' | 'CP_07_TOCTOU_HASH_MATCH' | 'CP_08_CONSTITUTIONAL_AXIOM' | 'CP_09_BASE_VERSION_OCC' | 'CP_10_CANONICAL_COMPILATION' | 'CP_11_ATOMIC_PERSISTENCE' | 'CP_12_SHADOW_NON_ACTUATION' | 'CP_13_CANARY_HEALTH_GATE' | 'CP_14_ROLLBACK_LINEAGE' | 'CP_15_USER_EMERGENCY_STOP' | 'CP_16_EXECUTION_FIREWALL';
export type PolicyDeploymentStage = 'SHADOW' | 'CANARY' | 'ACTIVE' | 'ROLLED_BACK';
export type CanaryRing = 0 | 1 | 2 | 3 | 4;
export interface CanaryRingDefinition {
    ring: CanaryRing;
    name: 'Shadow' | 'Internal' | 'Extended' | 'Broad' | 'Full Active';
    trafficPercentage: number;
    description: string;
}
export declare const CANARY_RINGS: Record<CanaryRing, CanaryRingDefinition>;
export interface CanonicalPolicyRule {
    ruleId: string;
    fieldPath: string;
    action: 'ALLOW' | 'DENY' | 'REQUIRE_HUMAN_APPROVAL';
    parameters: Record<string, any>;
    riskLevel: RiskLevel;
    immutable: boolean;
}
export interface CanonicalStrategicPolicy {
    policyId: string;
    tenantId: string;
    policyDomain: PolicyDomain;
    policyVersion: number;
    parentVersion: number;
    rules: Record<string, CanonicalPolicyRule>;
    metadata: {
        ratificationId: string;
        proposalId: string;
        ratifiedAt: number;
        effectiveAt?: number;
        expiresAt?: number;
        provenanceHash: string;
        canonicalHash: string;
        policyDeltaHash?: string;
    };
}
export interface AuthoritativeRatificationRecord {
    ratificationId: string;
    handoffId: string;
    proposalId: string;
    tenantId: string;
    policyDomain: PolicyDomain;
    policyVersion: number;
    parentVersion: number;
    canonicalPolicyHash: string;
    dossierProvenanceHash: string;
    humanSignatures: string[];
    ratifiedBy: string;
    ratifiedAt: number;
    status: 'RATIFIED' | 'REVOKED';
    ratificationSignature: string;
}
export interface PolicyDeploymentRecord {
    deploymentId: string;
    ratificationId: string;
    tenantId: string;
    policyDomain: PolicyDomain;
    policyVersion: number;
    stage: PolicyDeploymentStage;
    canaryRing: CanaryRing;
    canaryCohort?: string[];
    activatedAt: number;
    activeUntil?: number;
    deploymentLockHash: string;
    previousActiveVersion: number;
}
export interface ShadowEvaluationReport {
    reportId: string;
    policyId: string;
    tenantId: string;
    policyDomain: PolicyDomain;
    evaluatedTracesCount: number;
    mismatchCount: number;
    divergenceRate: number;
    latencyOverheadMs: number;
    passed: boolean;
    evaluatedAt: number;
    reportHash: string;
}
export interface PolicyRollbackRecord {
    rollbackId: string;
    tenantId: string;
    policyDomain: PolicyDomain;
    fromVersion: number;
    toVersion: number;
    reason: string;
    triggeredBy: 'AUTOMATIC_CIRCUIT_BREAKER' | 'AUTOMATIC_HEALTH_CHECK' | 'MANUAL_OPERATOR_REVOCATION' | 'USER_STOP' | 'EMERGENCY_STOP';
    rolledBackAt: number;
    verifiedBackupHash: string;
    rollbackRecordHash: string;
}
export type IngestionAuditEventType = 'HANDOFF_RECEIVED' | 'HANDOFF_VALIDATED' | 'HANDOFF_REJECTED_SCHEMA' | 'HANDOFF_REJECTED_EXPIRED' | 'HANDOFF_REJECTED_REPLAY' | 'HUMAN_TOKEN_VERIFIED' | 'HUMAN_TOKEN_REJECTED_INVALID_SIG' | 'HUMAN_TOKEN_REJECTED_EXPIRED' | 'HUMAN_TOKEN_REJECTED_NONCE_REUSED' | 'CRITICAL_PROPOSAL_AFFIRMED' | 'CRITICAL_PROPOSAL_REJECTED' | 'POLICY_RATIFIED_BY_PDP' | 'RATIFICATION_REJECTED_INVARIANT_VIOLATION' | 'RATIFICATION_REJECTED_OCC_CONFLICT' | 'CANONICAL_POLICY_COMPILED' | 'POLICY_COMPILATION_FAILED' | 'SHADOW_EVALUATION_STARTED' | 'SHADOW_EVALUATION_COMPLETED' | 'SHADOW_EVALUATION_FAILED' | 'CANARY_RING_ASSIGNED' | 'CANARY_DEPLOYMENT_STARTED' | 'CANARY_HEALTH_CHECK_PASSED' | 'CANARY_HEALTH_CHECK_FAILED' | 'CANARY_PROMOTION_AUTHORIZED' | 'FULL_ACTIVATION_STARTED' | 'FULL_ACTIVATION_COMPLETED' | 'FULL_ACTIVATION_FAILED' | 'POLICY_ROLLED_BACK_AUTOMATIC' | 'POLICY_ROLLED_BACK_MANUAL' | 'ROLLBACK_FAILED' | 'USER_STOP_INTERLOCK_ENGAGED' | 'EMERGENCY_STOP_ENGAGED' | 'CIRCUIT_BREAKER_TRIPPED' | 'TENANT_BOUNDARY_VIOLATION_BLOCKED' | 'PROVENANCE_CHAIN_VERIFIED' | 'PROVENANCE_CHAIN_CORRUPTED' | 'ACTIVE_RUNTIME_SYNC_BROADCAST' | 'ACTIVE_RUNTIME_SYNC_ACKNOWLEDGED';
export interface IngestionAuditEvent {
    eventId: string;
    eventType: IngestionAuditEventType;
    tenantId: string;
    policyDomain?: PolicyDomain;
    policyId?: string;
    proposalId?: string;
    handoffId?: string;
    ratificationId?: string;
    operatorId?: string;
    details: Record<string, any>;
    timestamp: number;
    prevHash: string;
    eventHash: string;
}
export declare class GovernedPolicyDecisionIngestionBaseError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class PolicyHandoffSchemaValidationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class PolicyHandoffReplayError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class HumanDecisionVerificationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class CriticalAffirmationVerificationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class AuthoritativePolicyRatificationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class PolicyCompilationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class PolicyVersionOCCConflictError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class PolicyStagedDeploymentError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class PolicyRollbackError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class PolicyTenantIsolationError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class PolicyCircuitBreakerTrippedError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare class PolicyIngestionInterlockActiveError extends GovernedPolicyDecisionIngestionBaseError {
    constructor(message: string);
}
export declare function computeCanonicalPolicyDeltaHash(deltas: PolicyDelta[]): string;
export declare function computeHandoffIntakeHash(payload: any): string;
export declare function computeHumanDecisionTokenHash(operatorId: string, proposalId: string, dossierHash: string, nonce: string, policyDeltaHash?: string): string;
export declare function computeRatificationRecordHash(record: Omit<AuthoritativeRatificationRecord, 'ratificationSignature'>): string;
export declare function computeCanonicalPolicyHash(policy: CanonicalStrategicPolicy): string;
export declare function computeShadowEvaluationReportHash(report: Omit<ShadowEvaluationReport, 'reportHash'>): string;
export declare function computePolicyDeploymentRecordHash(record: PolicyDeploymentRecord): string;
export declare function computeRollbackRecordHash(record: Omit<PolicyRollbackRecord, 'rollbackRecordHash'>): string;
export declare function computeIngestionAuditHash(event: Omit<IngestionAuditEvent, 'eventHash'>): string;
