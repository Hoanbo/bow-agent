import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export type PolicyLifecycleRecordId = string & {
    readonly __brand: unique symbol;
};
export type PolicyIncidentId = string & {
    readonly __brand: unique symbol;
};
export type PolicyLineageNodeId = string & {
    readonly __brand: unique symbol;
};
export type OperationalEvidenceDossierId = string & {
    readonly __brand: unique symbol;
};
export type OperationalAuditRecordId = string & {
    readonly __brand: unique symbol;
};
export type PolicyLifecycleState = 'PROPOSED' | 'RATIFIED' | 'STAGED' | 'ACTIVE' | 'DEGRADED' | 'SUSPENDED' | 'ROLLED_BACK' | 'RETIRED';
export declare const ALL_LIFECYCLE_STATES: readonly PolicyLifecycleState[];
export declare const TERMINAL_LIFECYCLE_STATES: ReadonlySet<PolicyLifecycleState>;
export declare const ACTIVE_OPERATIONAL_STATES: ReadonlySet<PolicyLifecycleState>;
export declare const PAUSED_OPERATIONAL_STATES: ReadonlySet<PolicyLifecycleState>;
export declare const HEALTH_THRESHOLD_DEGRADED = 0.95;
export declare const HEALTH_THRESHOLD_CRITICAL = 0.85;
export declare const HEALTH_THRESHOLD_RESTORED = 0.98;
export declare const MAX_DECISION_LATENCY_OVERHEAD_MS = 50;
export declare const MAX_LINEAGE_DEPTH = 100;
export declare const MAX_ACTIVE_INCIDENTS_PER_DOMAIN = 50;
export declare const MAX_TOKEN_TTL_MS = 3600000;
export declare const MAX_LIFECYCLE_MUTEX_WAIT_MS = 5000;
export declare const GENESIS_PREV_HASH: string;
export declare const GOVERNED_POLICY_LIFECYCLE_INVARIANTS: readonly string[];
export type PolicyLifecycleSecurityCheckpoint = 'CP_LFC_01_TENANT_ISOLATION' | 'CP_LFC_02_STATE_TRANSITION_VALIDITY' | 'CP_LFC_03_OCC_VERSION_CAS' | 'CP_LFC_04_SINGLE_FLIGHT_LOCK' | 'CP_LFC_05_SOLE_HUMAN_SIGNATURE' | 'CP_LFC_06_ANTI_AGENT_IDENTITY' | 'CP_LFC_07_SECONDARY_AUTHORITY_REJECTION' | 'CP_LFC_08_NONCE_REPLAY_DEFENSE' | 'CP_LFC_09_EMERGENCY_STOP_DOMINANCE' | 'CP_LFC_10_USER_STOP_INTERLOCK' | 'CP_LFC_11_AUTOMATION_REACTIVATION_BARRIER' | 'CP_LFC_12_RETIRED_TERMINAL_BARRIER' | 'CP_LFC_13_HEALTH_OBSERVATION_INTEGRITY' | 'CP_LFC_14_INCIDENT_SAFETY_HALT' | 'CP_LFC_15_LINEAGE_ANCESTRY_COMMITMENT' | 'CP_LFC_16_EVIDENCE_DEEP_FREEZE';
export type LifecycleAuditEventType = 'LIFECYCLE_STATE_TRANSITIONED' | 'POLICY_HEALTH_EVALUATED' | 'POLICY_HEALTH_DEGRADED' | 'POLICY_HEALTH_RESTORED' | 'POLICY_INCIDENT_OPENED' | 'POLICY_INCIDENT_RESOLVED' | 'SAFETY_HALT_ENGAGED' | 'POLICY_SUSPENDED_AUTOMATIC' | 'POLICY_SUSPENDED_MANUAL' | 'POLICY_REACTIVATION_AUTHORIZED' | 'POLICY_REACTIVATION_REJECTED' | 'POLICY_DEGRADATION_OVERRIDDEN' | 'POLICY_RETIRED' | 'EMERGENCY_STOP_ENGAGED' | 'EMERGENCY_STOP_CLEARED' | 'USER_STOP_ENGAGED' | 'LINEAGE_NODE_ATTACHED' | 'EVIDENCE_DOSSIER_COMPILED' | 'OCC_CONFLICT_BLOCKED' | 'SINGLE_FLIGHT_CONTENTION_BLOCKED' | 'CROSS_TENANT_ACCESS_BLOCKED' | 'ANTI_AGENT_IDENTITY_BLOCKED' | 'SECONDARY_AUTHORITY_BLOCKED' | 'NONCE_REPLAY_BLOCKED' | 'EXPIRED_TOKEN_BLOCKED' | 'TAMPERED_LINEAGE_BLOCKED' | 'TAMPERED_DOSSIER_BLOCKED' | 'AUDIT_CHAIN_VERIFIED' | 'AUDIT_CHAIN_CORRUPTED' | 'PERSISTENCE_ATOMIC_SWAP_COMPLETED' | 'PERSISTENCE_CRASH_RECOVERED' | 'RUNTIME_SYNC_BROADCAST';
export interface PolicyLifecycleRecord {
    readonly recordId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly policyId: string;
    readonly policyVersion: number;
    readonly lifecycleVersion: number;
    readonly state: PolicyLifecycleState;
    readonly previousState: PolicyLifecycleState;
    readonly reason: string;
    readonly transitionTrigger: 'AUTOMATIC_SAFETY_INTERLOCK' | 'HEALTH_DRIFT' | 'OPERATOR_COMMAND' | 'PDP_DEPLOYMENT' | 'EMERGENCY_STOP' | 'ROLLBACK';
    readonly authorizationRef?: {
        readonly operatorId: string;
        readonly nonce: string;
        readonly tokenSignature: string;
    };
    readonly canonicalPolicyHash: string;
    readonly ratificationId: string;
    readonly updatedAt: number;
    readonly recordHash: string;
}
export interface PolicyHealthMetrics {
    readonly decisionComplianceRatio: number;
    readonly driftDivergenceRate: number;
    readonly latencyOverheadMs: number;
    readonly interDomainConflictCount: number;
}
export interface PolicyHealthReport {
    readonly reportId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly policyVersion: number;
    readonly metrics: PolicyHealthMetrics;
    readonly compositeScore: number;
    readonly status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    readonly evaluatedAt: number;
    readonly reportHash: string;
}
export type PolicyIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PolicyIncidentType = 'INC_HEALTH_DEGRADED' | 'INC_INTEGRITY_DRIFT' | 'INC_INTER_DOMAIN_CONFLICT' | 'INC_AUDIT_CHAIN_BREAK' | 'INC_EMERGENCY_STOP_TRIPPED' | 'INC_UNAUTHORIZED_MUTATION_ATTEMPT';
export type PolicyIncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED';
export interface PolicyIncidentRecord {
    readonly incidentId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly policyVersion: number;
    readonly incidentType: PolicyIncidentType;
    readonly severity: PolicyIncidentSeverity;
    readonly status: PolicyIncidentStatus;
    readonly description: string;
    readonly triggeredStateChange?: PolicyLifecycleState;
    readonly openedAt: number;
    readonly resolvedAt?: number;
    readonly resolvedBy?: string;
    readonly resolutionJustification?: string;
    readonly incidentHash: string;
}
export type PolicyLineageNodeType = 'PROPOSAL' | 'DOSSIER' | 'RATIFICATION' | 'DEPLOYMENT' | 'LIFECYCLE_STATE' | 'INCIDENT' | 'ROLLBACK';
export interface PolicyLineageNode {
    readonly nodeId: string;
    readonly nodeType: PolicyLineageNodeType;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly entityId: string;
    readonly parentNodeIds: readonly string[];
    readonly parentHashes: readonly string[];
    readonly timestamp: number;
    readonly metadata: Record<string, unknown>;
    readonly nodeHash: string;
}
export interface PolicyLineageGraphSnapshot {
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly policyVersion: number;
    readonly nodes: readonly PolicyLineageNode[];
    readonly rootNodeId: string;
    readonly latestNodeId: string;
    readonly graphFingerprint: string;
}
export interface PolicyOperationalEvidenceDossier {
    readonly dossierId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly policyId: string;
    readonly policyVersion: number;
    readonly lifecycleState: PolicyLifecycleState;
    readonly canonicalPolicyHash: string;
    readonly latestHealthReport: PolicyHealthReport;
    readonly activeIncidents: readonly PolicyIncidentRecord[];
    readonly lineageGraphFingerprint: string;
    readonly humanAuthorizationsCount: number;
    readonly compiledAt: number;
    readonly dossierFingerprint: string;
}
export interface PolicyLifecycleAuditEvent {
    readonly eventId: string;
    readonly eventType: LifecycleAuditEventType;
    readonly tenantId: string;
    readonly policyDomain?: PolicyDomain;
    readonly policyId?: string;
    readonly policyVersion?: number;
    readonly lifecycleVersion?: number;
    readonly fromState?: PolicyLifecycleState;
    readonly toState?: PolicyLifecycleState;
    readonly operatorId?: string;
    readonly details: Record<string, unknown>;
    readonly timestamp: number;
    readonly prevHash: string;
    readonly eventHash: string;
}
export declare class GovernedPolicyLifecycleBaseError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}
export declare class InvalidLifecycleTransitionError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class UnauthorizedLifecycleMutationError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class AntiAgentIdentityRejectedError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class SecondaryAuthorityRejectedError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyLifecycleOCCConflictError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyLifecycleTenantIsolationError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyLifecycleTerminalStateError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyLifecycleInterlockActiveError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyHealthThresholdError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyIncidentManagementError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyLineageIntegrityError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyOperationalEvidenceError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare class PolicyLifecycleAuditIntegrityError extends GovernedPolicyLifecycleBaseError {
    constructor(message: string);
}
export declare function canonicalJsonStringify(obj: unknown): string;
export declare function deepFreeze<T>(obj: T): T;
export declare function computeLifecycleRecordHash(record: Omit<PolicyLifecycleRecord, 'recordHash'>): string;
export declare function computeHealthReportHash(report: Omit<PolicyHealthReport, 'reportHash'>): string;
export declare function computeIncidentRecordHash(incident: Omit<PolicyIncidentRecord, 'incidentHash'>): string;
export declare function computeLineageNodeHash(node: Omit<PolicyLineageNode, 'nodeHash'>): string;
export declare function computeEvidenceDossierHash(dossier: Omit<PolicyOperationalEvidenceDossier, 'dossierFingerprint'>): string;
export declare function computeLifecycleAuditHash(prevHash: string, event: Omit<PolicyLifecycleAuditEvent, 'eventHash' | 'prevHash'> | Record<string, unknown>): string;
