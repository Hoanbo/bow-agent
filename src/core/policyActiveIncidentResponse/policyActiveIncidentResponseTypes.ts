// src/core/policyActiveIncidentResponse/policyActiveIncidentResponseTypes.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Canonical Contracts & DTOs (Component 830).
// Defines immutable branded types, explicit incident states, degradation categories,
// and safety boundary contracts for governed active policy incident governance.
//
// Core Authority Invariants:
// - INCIDENT_DETECTION != POLICY_AUTHORITY
// - DEGRADATION_DETECTION != POLICY_MUTATION
// - EMERGENCY_SAFETY_BOUNDARY != POLICY_AUTHORITY
// - EMERGENCY_SAFETY_BOUNDARY != POLICY_MUTATION
// - INCIDENT_RESPONSE != AUTONOMOUS_ROLLBACK
// - INCIDENT_RESPONSE != AUTONOMOUS_RECOVERY
// - INCIDENT_RESPONSE != AUTONOMOUS_REPAIR
// - PDP != POLICY_AUTHORITY
// - PEP != POLICY_AUTHORITY
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO AUTONOMOUS POLICY ACTIVATION
// - ZERO AUTONOMOUS ROLLBACK / SUNSET / RECOVERY
// - ZERO AUTONOMOUS REPAIR
// - ZERO DIRECT TOOL EXECUTION
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED

import type { ActivePolicyStateId } from '../policyStagedActivation/policyStagedActivationTypes.js';
import type { RuntimePolicySnapshotId } from '../policyActiveRuntime/policyActiveRuntimeTypes.js';

// ============================================================================
// BRANDED IDENTIFIERS
// ============================================================================

export type ActiveIncidentId = string & { readonly __brand: unique symbol };
export type IncidentDetectionId = string & { readonly __brand: unique symbol };
export type DegradationEventId = string & { readonly __brand: unique symbol };
export type SafetyBoundaryActivationId = string & { readonly __brand: unique symbol };
export type IncidentEscalationId = string & { readonly __brand: unique symbol };
export type IncidentResolutionId = string & { readonly __brand: unique symbol };
export type IncidentProvenanceId = string & { readonly __brand: unique symbol };

export function createActiveIncidentId(raw: string): ActiveIncidentId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_INCIDENT_ID: raw incident id must be a non-empty string');
  }
  return raw.trim() as ActiveIncidentId;
}

export function createIncidentDetectionId(raw: string): IncidentDetectionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_DETECTION_ID: raw detection id must be a non-empty string');
  }
  return raw.trim() as IncidentDetectionId;
}

export function createDegradationEventId(raw: string): DegradationEventId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_DEGRADATION_EVENT_ID: raw degradation event id must be a non-empty string');
  }
  return raw.trim() as DegradationEventId;
}

export function createSafetyBoundaryActivationId(raw: string): SafetyBoundaryActivationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_SAFETY_BOUNDARY_ACTIVATION_ID: raw activation id must be a non-empty string');
  }
  return raw.trim() as SafetyBoundaryActivationId;
}

export function createIncidentEscalationId(raw: string): IncidentEscalationId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_INCIDENT_ESCALATION_ID: raw escalation id must be a non-empty string');
  }
  return raw.trim() as IncidentEscalationId;
}

export function createIncidentResolutionId(raw: string): IncidentResolutionId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_INCIDENT_RESOLUTION_ID: raw resolution id must be a non-empty string');
  }
  return raw.trim() as IncidentResolutionId;
}

export function createIncidentProvenanceId(raw: string): IncidentProvenanceId {
  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new Error('INVALID_INCIDENT_PROVENANCE_ID: raw provenance id must be a non-empty string');
  }
  return raw.trim() as IncidentProvenanceId;
}

// ============================================================================
// EXPLICIT STATE TYPES & ENUMS
// ============================================================================

export type IncidentLifecycleState =
  | 'DETECTED'
  | 'CLASSIFIED'
  | 'ESCALATED'
  | 'SAFETY_BOUNDARY_ACTIVE'
  | 'AWAITING_HUMAN_REVIEW'
  | 'RESOLVED'
  | 'CLOSED';

export type IncidentSeverity =
  | 'NORMAL'
  | 'DEGRADED'
  | 'INCIDENT'
  | 'CRITICAL';

export type ActivePolicyIncidentSeverity = IncidentSeverity;

export type DegradationCategory =
  | 'ELEVATED_POLICY_DENIALS'
  | 'ENFORCEMENT_INCONSISTENCY'
  | 'RUNTIME_SNAPSHOT_MISMATCH'
  | 'PDP_PEP_DISAGREEMENT'
  | 'POLICY_VERSION_DRIFT'
  | 'STALE_ACTIVE_RUNTIME'
  | 'REPEATED_RECONCILIATION_FAILURE'
  | 'PROVENANCE_INCONSISTENCY'
  | 'HARD_FORBIDDEN_FLOOR_BREACH'
  | 'CORRUPTED_ACTIVE_STATE'
  | 'TENANT_ISOLATION_ANOMALY';

export type SafetyBoundaryStatus =
  | 'INACTIVE'
  | 'ACTIVE'
  | 'RESTRICTED_FALLBACK'
  | 'FAIL_CLOSED';

// ============================================================================
// DTO CONTRACTS
// ============================================================================

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
  // Absolute Invariant Assertions:
  readonly isActivePolicy: false;          // Strictly false: INCIDENT != ACTIVE_POLICY
  readonly isPolicyMutation: false;        // Strictly false: ZERO POLICY MUTATION
  readonly isAutonomousMutation: false;    // Strictly false: ZERO AUTONOMOUS MUTATION
  readonly isAutonomousRollback: false;    // Strictly false: ZERO AUTONOMOUS ROLLBACK
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
  readonly enforcesHardForbiddenFloor: true; // Hard-forbidden actions always strictly FORBIDDEN
  readonly isPolicyAuthority: false;        // Boundary holds zero policy authority
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
  readonly denialAnomalyThreshold?: number; // default: 5 denials within detection window
  readonly reconciliationFailureThreshold?: number; // default: 1 failure
}
