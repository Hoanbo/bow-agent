import type { ActivePolicyStateId } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshotId } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';
export type ActiveIncidentId = string & {
    readonly __brand: unique symbol;
};
export type IncidentDetectionId = string & {
    readonly __brand: unique symbol;
};
export type DegradationEventId = string & {
    readonly __brand: unique symbol;
};
export type SafetyBoundaryActivationId = string & {
    readonly __brand: unique symbol;
};
export type IncidentEscalationId = string & {
    readonly __brand: unique symbol;
};
export type IncidentResolutionId = string & {
    readonly __brand: unique symbol;
};
export type IncidentProvenanceId = string & {
    readonly __brand: unique symbol;
};
export declare function createActiveIncidentId(raw: string): ActiveIncidentId;
export declare function createIncidentDetectionId(raw: string): IncidentDetectionId;
export declare function createDegradationEventId(raw: string): DegradationEventId;
export declare function createSafetyBoundaryActivationId(raw: string): SafetyBoundaryActivationId;
export declare function createIncidentEscalationId(raw: string): IncidentEscalationId;
export declare function createIncidentResolutionId(raw: string): IncidentResolutionId;
export declare function createIncidentProvenanceId(raw: string): IncidentProvenanceId;
export type IncidentLifecycleState = 'DETECTED' | 'CLASSIFIED' | 'ESCALATED' | 'SAFETY_BOUNDARY_ACTIVE' | 'AWAITING_HUMAN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type IncidentSeverity = 'NORMAL' | 'DEGRADED' | 'INCIDENT' | 'CRITICAL';
export type ActivePolicyIncidentSeverity = IncidentSeverity;
export type DegradationCategory = 'ELEVATED_POLICY_DENIALS' | 'ENFORCEMENT_INCONSISTENCY' | 'RUNTIME_SNAPSHOT_MISMATCH' | 'PDP_PEP_DISAGREEMENT' | 'POLICY_VERSION_DRIFT' | 'STALE_ACTIVE_RUNTIME' | 'REPEATED_RECONCILIATION_FAILURE' | 'PROVENANCE_INCONSISTENCY' | 'HARD_FORBIDDEN_FLOOR_BREACH' | 'CORRUPTED_ACTIVE_STATE' | 'TENANT_ISOLATION_ANOMALY';
export type SafetyBoundaryStatus = 'INACTIVE' | 'ACTIVE' | 'RESTRICTED_FALLBACK' | 'FAIL_CLOSED';
/**
 * Normalised degradation signal observed from upstream runtime systems.
 */
export interface DegradationSignal {
    readonly signalId: DegradationEventId;
    readonly category: DegradationCategory;
    readonly severity: IncidentSeverity;
    readonly source: string;
    readonly message: string;
    readonly details: Record<string, any>;
    readonly observedAt: string;
}
/**
 * Immutable Active Policy Incident Record.
 */
export interface ActivePolicyIncidentRecord {
    readonly incidentId: ActiveIncidentId;
    readonly tenantPartition: string;
    readonly fingerprint: string;
    readonly activePolicyStateId: ActivePolicyStateId | null;
    readonly runtimeSnapshotId: RuntimePolicySnapshotId | null;
    readonly severity: IncidentSeverity;
    readonly state: IncidentLifecycleState;
    readonly primaryCategory: DegradationCategory;
    readonly signals: readonly DegradationSignal[];
    readonly safetyBoundaryStatus: SafetyBoundaryStatus;
    readonly escalationId: IncidentEscalationId | null;
    readonly detectedAt: string;
    readonly updatedAt: string;
    readonly resolvedAt: string | null;
    readonly resolvedBy: string | null;
    readonly resolutionRationale: string | null;
    readonly isActivePolicy: false;
    readonly isPolicyMutation: false;
    readonly isAutonomousMutation: false;
    readonly isAutonomousRollback: false;
}
/**
 * Immutable Human Escalation Record.
 */
export interface IncidentEscalationRecord {
    readonly escalationId: IncidentEscalationId;
    readonly incidentId: ActiveIncidentId;
    readonly tenantPartition: string;
    readonly severity: IncidentSeverity;
    readonly violatedInvariant: string;
    readonly requiredHumanAction: string;
    readonly escalatedAt: string;
    readonly isAutonomous: false;
    readonly provenanceHash: string;
}
/**
 * Active Emergency Safety Boundary state for a tenant.
 */
export interface SafetyBoundaryState {
    readonly boundaryActivationId: SafetyBoundaryActivationId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly status: SafetyBoundaryStatus;
    readonly reason: string;
    readonly activatedAt: string;
    readonly allowsReadOnlyFallback: boolean;
    readonly enforcesHardForbiddenFloor: true;
    readonly isPolicyAuthority: false;
}
/**
 * Cryptographic Provenance Record for incident response.
 */
export interface IncidentProvenanceRecord {
    readonly provenanceId: IncidentProvenanceId;
    readonly tenantPartition: string;
    readonly incidentId: ActiveIncidentId;
    readonly severity: IncidentSeverity;
    readonly eventType: string;
    readonly timestamp: string;
    readonly previousHash: string;
    readonly recordHash: string;
    readonly payloadHash: string;
}
/**
 * Configuration options for policyActiveIncidentResponse domain.
 */
export interface PolicyActiveIncidentResponseOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
    readonly denialAnomalyThreshold?: number;
    readonly reconciliationFailureThreshold?: number;
}
