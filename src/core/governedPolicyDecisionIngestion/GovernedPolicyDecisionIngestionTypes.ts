// src/core/governedPolicyDecisionIngestion/GovernedPolicyDecisionIngestionTypes.ts
// Component 1168: GovernedPolicyDecisionIngestionTypes (REAL)
//
// Canonical types, branded IDs, 18-state lifecycle, 16 checkpoints, 38 audit event types,
// typed error hierarchy, and 8 deterministic SHA-256 hashers for MS-1.5.20.
// Định nghĩa kiểu dữ liệu chuẩn, ID định danh, máy trạng thái vòng đời 18 bước, 16 điểm kiểm soát an ninh,
// 38 sự kiện kiểm toán và 8 hàm băm SHA-256 cho MS-1.5.20.

import { createHash } from 'crypto';
import type {
  PolicyDomain,
  PolicyDelta,
  RiskLevel,
  PdpPolicyHandoffPackage,
  HumanDecisionToken,
  HumanDecisionRecord,
} from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import {
  canonicalPolicyDeltaArray,
  computePolicyDeltaHash,
} from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';

export { canonicalPolicyDeltaArray, computePolicyDeltaHash };

// ============================================================================
// 1. BRANDED IDENTIFIERS & ENVELOPES
// ============================================================================
export interface PdpPolicyHandoffEnvelope {
  readonly handoffPackage: PdpPolicyHandoffPackage;
  readonly humanDecisionToken: HumanDecisionToken;
  readonly humanDecisionRecord?: HumanDecisionRecord;
}

export type HandoffId = string & { readonly __brand: unique symbol };
export type RatificationId = string & { readonly __brand: unique symbol };
export type StrategicPolicyId = string & { readonly __brand: unique symbol };
export type DeploymentId = string & { readonly __brand: unique symbol };
export type RollbackId = string & { readonly __brand: unique symbol };
export type ShadowReportId = string & { readonly __brand: unique symbol };

// ============================================================================
// 2. HARD CEILINGS & BOUNDS (TRẦN GIỚI HẠN BẤT BIẾN)
// ============================================================================
export const MAX_HANDOFFS_IN_FLIGHT = 5;
export const MAX_DELTAS_PER_PROPOSAL = 50;
export const MAX_POLICY_SIZE_BYTES = 512 * 1024; // 512 KB
export const MAX_CANONICAL_RULES = 500;
export const MAX_SHADOW_EVAL_TRACES = 500;
export const MAX_CANARY_COHORTS = 10;
export const MAX_HANDOFF_TTL_MS = 86_400_000; // 24 hours
export const MAX_CRITICAL_TTL_MS = 3_600_000; // configurable bounded default
export const MAX_MUTEX_WAIT_MS = 5_000; // 5 seconds
export const MAX_ROLLBACK_LINEAGE_DEPTH = 20;
export const MAX_AUDIT_LEDGER_FILE_BYTES = 50 * 1024 * 1024; // 50 MB

// ============================================================================
// 3. CANONICAL CONSTITUTIONAL INVARIANTS (NGUYÊN TẮC HIẾN PHÁP BẤT BIẾN)
// ============================================================================
export const GOVERNED_POLICY_DECISION_INGESTION_INVARIANTS = Object.freeze([
  'MS-1.5.20 RECEIVES GOVERNANCE. MS-1.5.20 DOES NOT INVENT GOVERNANCE.',
  'RECOMMENDATION != POLICY',
  'DELIBERATION != APPROVAL',
  'APPROVED_FOR_PDP_HANDOFF != POLICY_APPROVED',
  'APPROVED_FOR_PDP_HANDOFF != EXECUTION_AUTHORIZATION',
  'HUMAN_APPROVAL != AUTONOMOUS_APPROVAL',
  'PDP_INGESTION != POLICY_RATIFICATION',
  'POLICY_RATIFICATION != POLICY_ACTIVATION',
  'POLICY_ACTIVATION != AGENT_EXECUTION',
  'RATIFICATION != TOOL_EXECUTION',
  'SIMULATION != EXECUTION',
  'SHADOW_RESULT != AUTHORIZATION',
  'ROLLBACK != POLICY_CREATION',
  'ROLLBACK != AUTHORITY_ESCALATION',
  'ROLLBACK != PDP_BYPASS',
  'TENANT_SCOPE != GLOBAL_SCOPE',
  'HASH != AUTHORIZATION',
  'STATE != PRIVILEGE',
  'PERSISTENCE != EXECUTION',
  'AGENT_CAPABILITY != HUMAN_AUTHORITY',
]);

// ============================================================================
// 4. 18-STATE LIFECYCLE STATE MACHINE
// ============================================================================
export type ActiveOperationalLifecycleStatus =
  | 'INTAKE_RECEIVED'
  | 'INTAKE_VALIDATED'
  | 'HUMAN_TOKEN_VERIFYING'
  | 'HUMAN_TOKEN_VERIFIED'
  | 'RATIFYING_PDP'
  | 'RATIFIED'
  | 'COMPILING'
  | 'COMPILED'
  | 'SHADOW_EVALUATING'
  | 'CANARY_ACTIVE'
  | 'FULLY_ACTIVE';

export type ResolvedOutcomeLifecycleStatus =
  | 'REJECTED_BY_GATEWAY'
  | 'RATIFICATION_DENIED'
  | 'DEPLOYMENT_ROLLED_BACK'
  | 'SUPERSEDED';

export type TerminalFaultLifecycleStatus =
  | 'FAULT_CRASH_RECOVERED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP';

export type IngestionLifecycleStatus =
  | ActiveOperationalLifecycleStatus
  | ResolvedOutcomeLifecycleStatus
  | TerminalFaultLifecycleStatus;

export const TERMINAL_INGESTION_STATES: ReadonlySet<IngestionLifecycleStatus> = new Set([
  'REJECTED_BY_GATEWAY',
  'RATIFICATION_DENIED',
  'DEPLOYMENT_ROLLED_BACK',
  'SUPERSEDED',
  'FAULT_CRASH_RECOVERED',
  'HALTED_BY_USER_STOP',
  'HALTED_BY_EMERGENCY_STOP',
]);

// ============================================================================
// 5. SECURITY CHECKPOINTS (16 ĐIỂM KIỂM SOÁT AN NINH)
// ============================================================================
export type PolicyIngestionSecurityCheckpoint =
  | 'CP_01_HANDOFF_SCHEMA'
  | 'CP_02_REPLAY_DEFENSE'
  | 'CP_03_TENANT_ISOLATION'
  | 'CP_04_HUMAN_SIGNATURE'
  | 'CP_05_ELEVATED_SINGLE_HUMAN_AFFIRMATION'
  | 'CP_06_PROVENANCE_INTEGRITY'
  | 'CP_07_TOCTOU_HASH_MATCH'
  | 'CP_08_CONSTITUTIONAL_AXIOM'
  | 'CP_09_BASE_VERSION_OCC'
  | 'CP_10_CANONICAL_COMPILATION'
  | 'CP_11_ATOMIC_PERSISTENCE'
  | 'CP_12_SHADOW_NON_ACTUATION'
  | 'CP_13_CANARY_HEALTH_GATE'
  | 'CP_14_ROLLBACK_LINEAGE'
  | 'CP_15_USER_EMERGENCY_STOP'
  | 'CP_16_EXECUTION_FIREWALL';

// ============================================================================
// 6. DEPLOYMENT STAGES & CANARY RINGS
// ============================================================================
export type PolicyDeploymentStage = 'SHADOW' | 'CANARY' | 'ACTIVE' | 'ROLLED_BACK';

export type CanaryRing = 0 | 1 | 2 | 3 | 4;

export interface CanaryRingDefinition {
  ring: CanaryRing;
  name: 'Shadow' | 'Internal' | 'Extended' | 'Broad' | 'Full Active';
  trafficPercentage: number;
  description: string;
}

export const CANARY_RINGS: Record<CanaryRing, CanaryRingDefinition> = Object.freeze({
  0: { ring: 0, name: 'Shadow', trafficPercentage: 0, description: '0% live traffic; pure replay shadow evaluation' },
  1: { ring: 1, name: 'Internal', trafficPercentage: 5, description: '5% traffic; internal canary cohort' },
  2: { ring: 2, name: 'Extended', trafficPercentage: 25, description: '25% traffic; non-critical federated missions' },
  3: { ring: 3, name: 'Broad', trafficPercentage: 50, description: '50% traffic; broad multi-agent federations' },
  4: { ring: 4, name: 'Full Active', trafficPercentage: 100, description: '100% traffic; canonical active production policy' },
});

// ============================================================================
// 7. CANONICAL POLICY CONTRACTS & RULES
// ============================================================================
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
  ratifiedBy: string; // PDP Authority Identifier
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
  divergenceRate: number; // 0.0 - 1.0
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

// ============================================================================
// 8. 38 CANONICAL AUDIT EVENT TYPES
// ============================================================================
export type IngestionAuditEventType =
  | 'HANDOFF_RECEIVED'
  | 'HANDOFF_VALIDATED'
  | 'HANDOFF_REJECTED_SCHEMA'
  | 'HANDOFF_REJECTED_EXPIRED'
  | 'HANDOFF_REJECTED_REPLAY'
  | 'HUMAN_TOKEN_VERIFIED'
  | 'HUMAN_TOKEN_REJECTED_INVALID_SIG'
  | 'HUMAN_TOKEN_REJECTED_EXPIRED'
  | 'HUMAN_TOKEN_REJECTED_NONCE_REUSED'
  | 'CRITICAL_PROPOSAL_AFFIRMED'
  | 'CRITICAL_PROPOSAL_REJECTED'
  | 'POLICY_RATIFIED_BY_PDP'
  | 'RATIFICATION_REJECTED_INVARIANT_VIOLATION'
  | 'RATIFICATION_REJECTED_OCC_CONFLICT'
  | 'CANONICAL_POLICY_COMPILED'
  | 'POLICY_COMPILATION_FAILED'
  | 'SHADOW_EVALUATION_STARTED'
  | 'SHADOW_EVALUATION_COMPLETED'
  | 'SHADOW_EVALUATION_FAILED'
  | 'CANARY_RING_ASSIGNED'
  | 'CANARY_DEPLOYMENT_STARTED'
  | 'CANARY_HEALTH_CHECK_PASSED'
  | 'CANARY_HEALTH_CHECK_FAILED'
  | 'CANARY_PROMOTION_AUTHORIZED'
  | 'FULL_ACTIVATION_STARTED'
  | 'FULL_ACTIVATION_COMPLETED'
  | 'FULL_ACTIVATION_FAILED'
  | 'POLICY_ROLLED_BACK_AUTOMATIC'
  | 'POLICY_ROLLED_BACK_MANUAL'
  | 'ROLLBACK_FAILED'
  | 'USER_STOP_INTERLOCK_ENGAGED'
  | 'EMERGENCY_STOP_ENGAGED'
  | 'CIRCUIT_BREAKER_TRIPPED'
  | 'TENANT_BOUNDARY_VIOLATION_BLOCKED'
  | 'PROVENANCE_CHAIN_VERIFIED'
  | 'PROVENANCE_CHAIN_CORRUPTED'
  | 'ACTIVE_RUNTIME_SYNC_BROADCAST'
  | 'ACTIVE_RUNTIME_SYNC_ACKNOWLEDGED';

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

// ============================================================================
// 9. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicyDecisionIngestionBaseError extends Error {
  public readonly code: string;
  constructor(message: string, code: string) {
    super(`[MS-1.5.20][${code}] ${message}`);
    this.code = code;
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class PolicyHandoffSchemaValidationError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'HANDOFF_SCHEMA_VALIDATION_ERROR');
  }
}

export class PolicyHandoffReplayError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'HANDOFF_REPLAY_ERROR');
  }
}

export class HumanDecisionVerificationError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'HUMAN_DECISION_VERIFICATION_ERROR');
  }
}

export class CriticalAffirmationVerificationError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'CRITICAL_AFFIRMATION_VERIFICATION_ERROR');
  }
}

export class AuthoritativePolicyRatificationError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'AUTHORITATIVE_RATIFICATION_ERROR');
  }
}

export class PolicyCompilationError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'POLICY_COMPILATION_ERROR');
  }
}

export class PolicyVersionOCCConflictError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'POLICY_VERSION_OCC_CONFLICT_ERROR');
  }
}

export class PolicyStagedDeploymentError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'POLICY_STAGED_DEPLOYMENT_ERROR');
  }
}

export class PolicyRollbackError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'POLICY_ROLLBACK_ERROR');
  }
}

export class PolicyTenantIsolationError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'TENANT_ISOLATION_ERROR');
  }
}

export class PolicyCircuitBreakerTrippedError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'CIRCUIT_BREAKER_TRIPPED_ERROR');
  }
}

export class PolicyIngestionInterlockActiveError extends GovernedPolicyDecisionIngestionBaseError {
  constructor(message: string) {
    super(message, 'INTERLOCK_ACTIVE_ERROR');
  }
}

// ============================================================================
// 10. DETERMINISTIC SHA-256 HASH HELPERS
// ============================================================================
function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalizeJson).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + canonicalizeJson(obj[k])).join(',') + '}';
}

export function computeCanonicalPolicyDeltaHash(deltas: PolicyDelta[]): string {
  return computePolicyDeltaHash(deltas);
}

export function computeHandoffIntakeHash(payload: any): string {
  return createHash('sha256').update(canonicalizeJson(payload)).digest('hex');
}

export function computeHumanDecisionTokenHash(
  operatorId: string,
  proposalId: string,
  dossierHash: string,
  nonce: string,
  policyDeltaHash?: string
): string {
  const payload = policyDeltaHash
    ? `${operatorId}:${proposalId}:${dossierHash}:${policyDeltaHash}:${nonce}`
    : `${operatorId}:${proposalId}:${dossierHash}:${nonce}`;
  return createHash('sha256').update(payload).digest('hex');
}

export function computeRatificationRecordHash(record: Omit<AuthoritativeRatificationRecord, 'ratificationSignature'>): string {
  return createHash('sha256').update(canonicalizeJson(record)).digest('hex');
}

export function computeCanonicalPolicyHash(policy: CanonicalStrategicPolicy): string {
  const normalized = {
    policyId: policy.policyId,
    tenantId: policy.tenantId,
    policyDomain: policy.policyDomain,
    policyVersion: policy.policyVersion,
    parentVersion: policy.parentVersion,
    rules: policy.rules,
  };
  return createHash('sha256').update(canonicalizeJson(normalized)).digest('hex');
}

export function computeShadowEvaluationReportHash(report: Omit<ShadowEvaluationReport, 'reportHash'>): string {
  return createHash('sha256').update(canonicalizeJson(report)).digest('hex');
}

export function computePolicyDeploymentRecordHash(record: PolicyDeploymentRecord): string {
  return createHash('sha256').update(canonicalizeJson(record)).digest('hex');
}

export function computeRollbackRecordHash(record: Omit<PolicyRollbackRecord, 'rollbackRecordHash'>): string {
  return createHash('sha256').update(canonicalizeJson(record)).digest('hex');
}

export function computeIngestionAuditHash(event: Omit<IngestionAuditEvent, 'eventHash'>): string {
  const content = `${event.eventId}:${event.eventType}:${event.tenantId}:${event.timestamp}:${event.prevHash}:${canonicalizeJson(event.details)}`;
  return createHash('sha256').update(content).digest('hex');
}
