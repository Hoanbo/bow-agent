// src/core/governedPolicyLifecycle/GovernedPolicyLifecycleTypes.ts
// Component 1178: GovernedPolicyLifecycleTypes (REAL)
//
// Canonical contracts, branded IDs, 8-state lifecycle, 16 checkpoints, 32 audit events,
// typed error hierarchy, and pure deterministic SHA-256 hashers for MS-1.5.21.

import { createHash } from 'crypto';
import type {
  PolicyDomain,
  RiskLevel,
  HumanDecisionToken,
  HumanDecisionRecord,
} from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type {
  CanonicalStrategicPolicy,
  AuthoritativeRatificationRecord,
  PolicyDeploymentRecord,
  PolicyRollbackRecord,
} from '../governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.js';

// ============================================================================
// 1. BRANDED IDENTIFIERS
// ============================================================================
export type PolicyLifecycleRecordId = string & { readonly __brand: unique symbol };
export type PolicyIncidentId = string & { readonly __brand: unique symbol };
export type PolicyLineageNodeId = string & { readonly __brand: unique symbol };
export type OperationalEvidenceDossierId = string & { readonly __brand: unique symbol };
export type OperationalAuditRecordId = string & { readonly __brand: unique symbol };

// ============================================================================
// 2. 8-STATE POLICY LIFECYCLE FINITE-STATE MACHINE
// ============================================================================
export type PolicyLifecycleState =
  | 'PROPOSED'
  | 'RATIFIED'
  | 'STAGED'
  | 'ACTIVE'
  | 'DEGRADED'
  | 'SUSPENDED'
  | 'ROLLED_BACK'
  | 'RETIRED';

export const ALL_LIFECYCLE_STATES: readonly PolicyLifecycleState[] = Object.freeze([
  'PROPOSED',
  'RATIFIED',
  'STAGED',
  'ACTIVE',
  'DEGRADED',
  'SUSPENDED',
  'ROLLED_BACK',
  'RETIRED',
]);

export const TERMINAL_LIFECYCLE_STATES: ReadonlySet<PolicyLifecycleState> = new Set([
  'RETIRED',
]);

export const ACTIVE_OPERATIONAL_STATES: ReadonlySet<PolicyLifecycleState> = new Set([
  'ACTIVE',
  'DEGRADED',
]);

export const PAUSED_OPERATIONAL_STATES: ReadonlySet<PolicyLifecycleState> = new Set([
  'SUSPENDED',
]);

// ============================================================================
// 3. HARD CEILINGS & THRESHOLDS
// ============================================================================
export const HEALTH_THRESHOLD_DEGRADED = 0.95;
export const HEALTH_THRESHOLD_CRITICAL = 0.85;
export const HEALTH_THRESHOLD_RESTORED = 0.98;
export const MAX_DECISION_LATENCY_OVERHEAD_MS = 50;
export const MAX_LINEAGE_DEPTH = 100;
export const MAX_ACTIVE_INCIDENTS_PER_DOMAIN = 50;
export const MAX_TOKEN_TTL_MS = 3_600_000; // 1 hour
export const MAX_LIFECYCLE_MUTEX_WAIT_MS = 5_000; // 5 seconds
export const GENESIS_PREV_HASH = '0'.repeat(64);

// ============================================================================
// 4. CANONICAL CONSTITUTIONAL INVARIANTS
// ============================================================================
export const GOVERNED_POLICY_LIFECYCLE_INVARIANTS = Object.freeze([
  'SOLE_HUMAN_AUTHORITY = TRUE',
  'HUMAN_AUTHORITY_COUNT = 1',
  'SECOND_HUMAN_AUTHORITY = FORBIDDEN',
  'ACTIVE_TWO_PERSON_AUTHORITY = NONE',
  'AGENT_CAPABILITY != HUMAN_AUTHORITY',
  'HUMAN_APPROVAL != AUTO_APPROVE',
  'HASH != AUTHORIZATION',
  'PDP_INGESTION != RATIFICATION',
  'ROLLBACK != POLICY_CREATION',
  'ROLLBACK != ESCALATION',
  'EMERGENCY_STOP > GOVERNANCE',
  'EMERGENCY_STOP > DEPLOYMENT',
  'EMERGENCY_STOP > ROLLBACK',
  'EMERGENCY_STOP > LIFECYCLE',
  'STORE_REFERENCE != MUTATION',
  'BACKUP_INTEGRITY != AUTHORIZATION',
  'OBSERVATION != DECISION',
  'DECISION != AUTHORIZATION',
  'AUTHORIZATION != MUTATION',
  'RECOMMENDATION != AUTHORIZATION',
  'EVIDENCE != MUTATION_AUTHORITY',
  'AUTOMATION != REACTIVATION',
  'RETIRED_IS_TERMINAL',
  'TENANT_BOUNDARY_STRICT',
]);

// ============================================================================
// 5. 16 SECURITY CHECKPOINTS
// ============================================================================
export type PolicyLifecycleSecurityCheckpoint =
  | 'CP_LFC_01_TENANT_ISOLATION'
  | 'CP_LFC_02_STATE_TRANSITION_VALIDITY'
  | 'CP_LFC_03_OCC_VERSION_CAS'
  | 'CP_LFC_04_SINGLE_FLIGHT_LOCK'
  | 'CP_LFC_05_SOLE_HUMAN_SIGNATURE'
  | 'CP_LFC_06_ANTI_AGENT_IDENTITY'
  | 'CP_LFC_07_SECONDARY_AUTHORITY_REJECTION'
  | 'CP_LFC_08_NONCE_REPLAY_DEFENSE'
  | 'CP_LFC_09_EMERGENCY_STOP_DOMINANCE'
  | 'CP_LFC_10_USER_STOP_INTERLOCK'
  | 'CP_LFC_11_AUTOMATION_REACTIVATION_BARRIER'
  | 'CP_LFC_12_RETIRED_TERMINAL_BARRIER'
  | 'CP_LFC_13_HEALTH_OBSERVATION_INTEGRITY'
  | 'CP_LFC_14_INCIDENT_SAFETY_HALT'
  | 'CP_LFC_15_LINEAGE_ANCESTRY_COMMITMENT'
  | 'CP_LFC_16_EVIDENCE_DEEP_FREEZE';

// ============================================================================
// 6. 32 OPERATIONAL AUDIT EVENT TYPES
// ============================================================================
export type LifecycleAuditEventType =
  | 'LIFECYCLE_STATE_TRANSITIONED'
  | 'POLICY_HEALTH_EVALUATED'
  | 'POLICY_HEALTH_DEGRADED'
  | 'POLICY_HEALTH_RESTORED'
  | 'POLICY_INCIDENT_OPENED'
  | 'POLICY_INCIDENT_RESOLVED'
  | 'SAFETY_HALT_ENGAGED'
  | 'POLICY_SUSPENDED_AUTOMATIC'
  | 'POLICY_SUSPENDED_MANUAL'
  | 'POLICY_REACTIVATION_AUTHORIZED'
  | 'POLICY_REACTIVATION_REJECTED'
  | 'POLICY_DEGRADATION_OVERRIDDEN'
  | 'POLICY_RETIRED'
  | 'EMERGENCY_STOP_ENGAGED'
  | 'EMERGENCY_STOP_CLEARED'
  | 'USER_STOP_ENGAGED'
  | 'LINEAGE_NODE_ATTACHED'
  | 'EVIDENCE_DOSSIER_COMPILED'
  | 'OCC_CONFLICT_BLOCKED'
  | 'SINGLE_FLIGHT_CONTENTION_BLOCKED'
  | 'CROSS_TENANT_ACCESS_BLOCKED'
  | 'ANTI_AGENT_IDENTITY_BLOCKED'
  | 'SECONDARY_AUTHORITY_BLOCKED'
  | 'NONCE_REPLAY_BLOCKED'
  | 'EXPIRED_TOKEN_BLOCKED'
  | 'TAMPERED_LINEAGE_BLOCKED'
  | 'TAMPERED_DOSSIER_BLOCKED'
  | 'AUDIT_CHAIN_VERIFIED'
  | 'AUDIT_CHAIN_CORRUPTED'
  | 'PERSISTENCE_ATOMIC_SWAP_COMPLETED'
  | 'PERSISTENCE_CRASH_RECOVERED'
  | 'RUNTIME_SYNC_BROADCAST';

// ============================================================================
// 7. CONTRACT DEFINITIONS
// ============================================================================

export interface PolicyLifecycleRecord {
  readonly recordId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly policyId: string;
  readonly policyVersion: number;
  readonly lifecycleVersion: number; // Monotonic OCC counter
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
  readonly decisionComplianceRatio: number; // 0.0 - 1.0 (expected >= 0.98)
  readonly driftDivergenceRate: number;      // 0.0 - 1.0 (expected <= 0.02)
  readonly latencyOverheadMs: number;        // ms (expected <= 50)
  readonly interDomainConflictCount: number; // 0 = healthy, > 0 conflict detected
}

export interface PolicyHealthReport {
  readonly reportId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly policyVersion: number;
  readonly metrics: PolicyHealthMetrics;
  readonly compositeScore: number;          // 0.0 - 1.0
  readonly status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  readonly evaluatedAt: number;
  readonly reportHash: string;
}

export type PolicyIncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type PolicyIncidentType =
  | 'INC_HEALTH_DEGRADED'
  | 'INC_INTEGRITY_DRIFT'
  | 'INC_INTER_DOMAIN_CONFLICT'
  | 'INC_AUDIT_CHAIN_BREAK'
  | 'INC_EMERGENCY_STOP_TRIPPED'
  | 'INC_UNAUTHORIZED_MUTATION_ATTEMPT';

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

export type PolicyLineageNodeType =
  | 'PROPOSAL'
  | 'DOSSIER'
  | 'RATIFICATION'
  | 'DEPLOYMENT'
  | 'LIFECYCLE_STATE'
  | 'INCIDENT'
  | 'ROLLBACK';

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

// ============================================================================
// 8. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicyLifecycleBaseError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(`[MS-1.5.21][${code}] ${message}`);
    this.code = code;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidLifecycleTransitionError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'INVALID_LIFECYCLE_TRANSITION');
  }
}

export class UnauthorizedLifecycleMutationError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'UNAUTHORIZED_LIFECYCLE_MUTATION');
  }
}

export class AntiAgentIdentityRejectedError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'ANTI_AGENT_IDENTITY_REJECTED');
  }
}

export class SecondaryAuthorityRejectedError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'SECONDARY_AUTHORITY_REJECTED');
  }
}

export class PolicyLifecycleOCCConflictError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_LIFECYCLE_OCC_CONFLICT');
  }
}

export class PolicyLifecycleTenantIsolationError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_LIFECYCLE_TENANT_ISOLATION_ERROR');
  }
}

export class PolicyLifecycleTerminalStateError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_LIFECYCLE_TERMINAL_STATE_ERROR');
  }
}

export class PolicyLifecycleInterlockActiveError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_LIFECYCLE_INTERLOCK_ACTIVE');
  }
}

export class PolicyHealthThresholdError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_HEALTH_THRESHOLD_ERROR');
  }
}

export class PolicyIncidentManagementError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_INCIDENT_MANAGEMENT_ERROR');
  }
}

export class PolicyLineageIntegrityError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_LINEAGE_INTEGRITY_ERROR');
  }
}

export class PolicyOperationalEvidenceError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_OPERATIONAL_EVIDENCE_ERROR');
  }
}

export class PolicyLifecycleAuditIntegrityError extends GovernedPolicyLifecycleBaseError {
  constructor(message: string) {
    super(message, 'POLICY_LIFECYCLE_AUDIT_INTEGRITY_ERROR');
  }
}

// ============================================================================
// 9. PURE DETERMINISTIC SERIALIZATION & HASHERS
// ============================================================================

export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const entries = keys.map((k) => `"${k}":${canonicalJsonStringify((obj as Record<string, unknown>)[k])}`);
  return '{' + entries.join(',') + '}';
}

export function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj as any)) {
    const val = (obj as any)[key];
    if (val !== null && typeof val === 'object' && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

export function computeLifecycleRecordHash(record: Omit<PolicyLifecycleRecord, 'recordHash'>): string {
  const canonical = canonicalJsonStringify(record);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeHealthReportHash(report: Omit<PolicyHealthReport, 'reportHash'>): string {
  const canonical = canonicalJsonStringify(report);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeIncidentRecordHash(incident: Omit<PolicyIncidentRecord, 'incidentHash'>): string {
  const canonical = canonicalJsonStringify(incident);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeLineageNodeHash(node: Omit<PolicyLineageNode, 'nodeHash'>): string {
  const canonical = canonicalJsonStringify(node);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeEvidenceDossierHash(dossier: Omit<PolicyOperationalEvidenceDossier, 'dossierFingerprint'>): string {
  const canonical = canonicalJsonStringify(dossier);
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function computeLifecycleAuditHash(
  prevHash: string,
  event: Omit<PolicyLifecycleAuditEvent, 'eventHash' | 'prevHash'> | Record<string, unknown>
): string {
  const { eventHash, prevHash: _p, ...rest } = event as any;
  const canonical = canonicalJsonStringify(rest);
  return createHash('sha256').update(prevHash + canonical, 'utf8').digest('hex');
}
