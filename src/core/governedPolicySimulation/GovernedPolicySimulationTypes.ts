// src/core/governedPolicySimulation/GovernedPolicySimulationTypes.ts
// Component 1208: GovernedPolicySimulationTypes (REAL)
//
// Canonical contracts, branded IDs, simulation taxonomy, 32 audit event types,
// typed error hierarchy, and deterministic SHA-256 hashers for MS-1.5.24.
// Định nghĩa các giao ước chuẩn, định danh branded, phân loại mô phỏng, 32 loại sự kiện kiểm toán,
// hệ thống phân cấp lỗi và các hàm băm SHA-256 tiền định cho MS-1.5.24.

import { createHash } from 'node:crypto';
import type { PolicyDomain, PolicyDelta } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyViolationRecord, RuntimeComplianceEvidenceDossier } from '../governedRuntimeCompliance/GovernedRuntimeComplianceTypes.js';

// ============================================================================
// 1. BRANDED IDENTIFIERS & CONSTRUCTORS
// ============================================================================
export type SimulationSessionId = string & { readonly __brand: unique symbol };
export type CounterfactualEvaluationId = string & { readonly __brand: unique symbol };
export type ShadowRunId = string & { readonly __brand: unique symbol };
export type SimulationDossierId = string & { readonly __brand: unique symbol };
export type SimulationAuditRecordId = string & { readonly __brand: unique symbol };
export type SimulationHandoffId = string & { readonly __brand: unique symbol };

export interface EmergencyStopProvider {
  isEmergencyStopActive(): boolean;
}

export function asSimulationSessionId(id: string): SimulationSessionId {
  return id as SimulationSessionId;
}
export function asCounterfactualEvaluationId(id: string): CounterfactualEvaluationId {
  return id as CounterfactualEvaluationId;
}
export function asShadowRunId(id: string): ShadowRunId {
  return id as ShadowRunId;
}
export function asSimulationDossierId(id: string): SimulationDossierId {
  return id as SimulationDossierId;
}
export function asSimulationAuditRecordId(id: string): SimulationAuditRecordId {
  return id as SimulationAuditRecordId;
}
export function asSimulationHandoffId(id: string): SimulationHandoffId {
  return id as SimulationHandoffId;
}

// ============================================================================
// 2. SIMULATION MODALITIES & TAXONOMY
// ============================================================================
export type SimulationMode =
  | 'HISTORICAL_REPLAY'
  | 'COUNTERFACTUAL_PROJECTION'
  | 'INVARIANT_ANALYSIS'
  | 'SYNTHETIC_STRESS'
  | 'SHADOW_DUAL_EVAL'
  | 'FULL_PIPELINE';

export type SimulationVerdict =
  | 'STABLE'
  | 'REGRESSIVE'
  | 'DEADLOCK_DETECTED'
  | 'INSUFFICIENT_EVIDENCE'
  | 'HIGH_REGRESSION_RISK'
  | 'PROJECTION_VALIDATED';

export type SimulationSessionState =
  | 'INITIATED'
  | 'REPLAYING'
  | 'PROJECTING'
  | 'INVARIANT_CHECKING'
  | 'STRESS_TESTING'
  | 'SHADOW_EVALUATING'
  | 'DOSSIER_COMPILED'
  | 'HANDED_OFF'
  | 'REPLAY_FAILED'
  | 'PROJECTION_FAILED'
  | 'DEADLOCK_TERMINATED'
  | 'STRESS_FAILED'
  | 'EXPIRED'
  | 'SUPERSEDED';

// ============================================================================
// 3. CORE DATA CONTRACTS
// ============================================================================

/**
 * Historical observation item used as replay corpus input
 */
export interface HistoricalObservationItem {
  readonly observationId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly actionType: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly timestamp: number;
  readonly wasCompliant: boolean;
  readonly violationDetails?: Readonly<Record<string, unknown>>;
}

/**
 * Result of historical execution replay
 */
export interface ReplayExecutionResult {
  readonly totalReplayed: number;
  readonly newlyDeniedCount: number;
  readonly newlyPermittedCount: number;
  readonly unchangedCount: number;
  readonly falseRejectionCount: number; // previously compliant actions now denied
  readonly trueMitigationCount: number;  // previously violating actions now correctly blocked
  readonly corpusHash: string;
  readonly replayedAt: number;
}

/**
 * Counterfactual operational assurance projection
 */
export interface CounterfactualAssuranceProjection {
  readonly baselineAssurance: number;       // A_baseline in [0, 1]
  readonly projectedAssurance: number;      // A_proj in [0, 1]
  readonly assuranceDelta: number;          // ΔA = A_proj - A_baseline
  readonly falsePositiveRejectionRate: number; // τ_fr = newlyDeniedValid / totalValid
  readonly isHighRegressionRisk: boolean;   // τ_fr > 0.05
  readonly projectionHash: string;
  readonly calculatedAt: number;
}

/**
 * Directed edge representing policy rule dependency
 */
export interface PolicyDomainDependency {
  readonly sourceDomain: PolicyDomain;
  readonly targetDomain: PolicyDomain;
  readonly constraintName: string;
  readonly prerequisiteRuleId: string;
}

/**
 * Result of cross-domain invariant and deadlock check
 */
export interface CrossDomainInvariantResult {
  readonly hasDeadlock: boolean;
  readonly circularDependencies: readonly (readonly string[])[];
  readonly conflictingRules: readonly string[];
  readonly invariantCheckHash: string;
  readonly checkedAt: number;
}

/**
 * Synthetic stress test input parameters
 */
export interface SyntheticStressConfig {
  readonly iterationCount: number;
  readonly simulateRateBurst: boolean;
  readonly simulateResourceCeiling: boolean;
  readonly simulateMalformedPayload: boolean;
  readonly recursionDepthLimit?: number;
  readonly timeoutMs?: number;
}

/**
 * Result of synthetic stress test harness
 */
export interface SyntheticStressResult {
  readonly totalProbes: number;
  readonly passedProbes: number;
  readonly failedProbes: number;
  readonly boundaryBreakages: readonly string[];
  readonly stressHash: string;
  readonly executedAt: number;
}

/**
 * Live shadow dual-evaluation tap record
 */
export interface ShadowEvaluationRecord {
  readonly shadowRunId: ShadowRunId;
  readonly observationId: string;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly activePolicyDecision: 'ALLOW' | 'DENY';
  readonly shadowCandidateDecision: 'ALLOW' | 'DENY';
  readonly isDivergent: boolean;
  readonly divergenceReason?: string;
  readonly evaluatedAt: number;
}

/**
 * Compiled simulation evidence dossier
 */
export interface PolicySimulationEvidenceDossier {
  readonly dossierId: SimulationDossierId;
  readonly sessionId: SimulationSessionId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly candidatePolicyHash: string;
  readonly basePolicyHash: string;
  readonly replayResult: ReplayExecutionResult;
  readonly assuranceProjection: CounterfactualAssuranceProjection;
  readonly invariantResult: CrossDomainInvariantResult;
  readonly stressResult: SyntheticStressResult;
  readonly shadowSummary: {
    readonly totalShadowEvaluations: number;
    readonly totalDivergences: number;
  };
  readonly overallVerdict: SimulationVerdict;
  readonly simulationDossierFingerprint: string;
  readonly compiledAt: number;
  readonly expiresAt: number;
}

/**
 * Handoff package delivered to MS-1.5.19 Deliberation Gateway
 */
export interface SimulationAdvisoryPackage {
  readonly handoffId: SimulationHandoffId;
  readonly dossierId: SimulationDossierId;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly candidatePolicyHash: string;
  readonly basePolicyHash: string;
  readonly overallVerdict: SimulationVerdict;
  readonly assuranceDelta: number;
  readonly falseRejectionRate: number;
  readonly isHighRegressionRisk: boolean;
  readonly dossierFingerprint: string;
  readonly handoffNonce: string;
  readonly packagedAt: number;
  readonly expiresAt: number;
}

// ============================================================================
// 4. AUDIT EVENT TYPES (32 CANONICAL EVENTS)
// ============================================================================
export type SimulationAuditEventType =
  | 'SIMULATION_SESSION_INITIATED'
  | 'HISTORICAL_REPLAY_STARTED'
  | 'HISTORICAL_REPLAY_COMPLETED'
  | 'HISTORICAL_REPLAY_FAILED'
  | 'ASSURANCE_PROJECTION_STARTED'
  | 'ASSURANCE_PROJECTION_COMPLETED'
  | 'ASSURANCE_PROJECTION_FAILED'
  | 'HIGH_REGRESSION_RISK_FLAGGED'
  | 'INVARIANT_CHECK_STARTED'
  | 'INVARIANT_CHECK_PASSED'
  | 'CROSS_DOMAIN_DEADLOCK_DETECTED'
  | 'INVARIANT_CHECK_FAILED'
  | 'SYNTHETIC_STRESS_STARTED'
  | 'SYNTHETIC_STRESS_COMPLETED'
  | 'SYNTHETIC_STRESS_FAILED'
  | 'SHADOW_TAP_REGISTERED'
  | 'SHADOW_TAP_EVALUATED'
  | 'SHADOW_DIVERGENCE_DETECTED'
  | 'SIMULATION_DOSSIER_COMPILED'
  | 'SIMULATION_DOSSIER_PERSISTED'
  | 'SIMULATION_DOSSIER_FROZEN'
  | 'SIMULATION_HANDOFF_PREPARED'
  | 'SIMULATION_HANDOFF_TRANSMITTED'
  | 'SIMULATION_HANDOFF_EXPIRED'
  | 'SIMULATION_HANDOFF_DUPLICATE_REJECTED'
  | 'EMERGENCY_STOP_ENCOUNTERED'
  | 'CROSS_TENANT_ACCESS_PREVENTED'
  | 'PROMPT_INJECTION_SANITIZED'
  | 'AUDIT_LEDGER_INTEGRITY_VERIFIED'
  | 'AUDIT_LEDGER_CHAIN_CORRUPTED'
  | 'SIMULATION_PIPELINE_SUCCEEDED'
  | 'SIMULATION_PIPELINE_FAILED';

export interface SimulationAuditRecord {
  readonly recordId: SimulationAuditRecordId;
  readonly eventType: SimulationAuditEventType;
  readonly tenantId: string;
  readonly policyDomain: PolicyDomain;
  readonly sessionId?: SimulationSessionId;
  readonly details: Readonly<Record<string, unknown>>;
  readonly previousEventHash: string;
  readonly eventHash: string;
  readonly timestamp: number;
}

// ============================================================================
// 5. CONSTANTS & INVARIANTS
// ============================================================================
export const GENESIS_SIMULATION_HASH = '0'.repeat(64);
export const MAX_HANDOFF_TTL_MS = 86_400_000; // 24 hours
export const DEFAULT_SIMULATION_DOSSIER_TTL_MS = 7 * 86_400_000; // 7 days
export const DEFAULT_FALSE_REJECTION_THRESHOLD = 0.05; // 5%
export const MAX_LOCK_TIMEOUT_MS = 5000;

export const GOVERNED_POLICY_SIMULATION_INVARIANTS = Object.freeze({
  SOLE_HUMAN_AUTHORITY: true,
  HUMAN_AUTHORITY_COUNT: 1,
  SECOND_HUMAN_AUTHORITY: false,
  ACTIVE_TWO_PERSON_AUTHORITY: 'NONE',
  AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: true,
  HUMAN_APPROVAL_NOT_AUTO_APPROVE: true,
  SIMULATION_NOT_RATIFICATION: true,
  SIMULATION_NOT_ACTIVATION: true,
  SIMULATION_NOT_MUTATION: true,
  SIMULATION_NOT_AUTHORIZATION: true,
  SIMULATION_RESULT_NOT_APPROVAL: true,
  SIMULATION_SCORE_NOT_AUTHORITY: true,
  SHADOW_VERDICT_NOT_PDP_DECISION: true,
  SHADOW_NOT_LIVE_EXECUTION: true,
  SHADOW_NOT_CANARY: true,
  REPLAY_NOT_ACTUATION: true,
  COUNTERFACTUAL_NOT_FACTUAL: true,
  HASH_NOT_AUTHORIZATION: true,
  EMERGENCY_STOP_DOMINATES: true,
  TENANT_BOUNDARY_STRICT: true,
});

// ============================================================================
// 6. TYPED ERROR HIERARCHY
// ============================================================================
export class GovernedPolicySimulationBaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GovernedPolicySimulationBaseError';
  }
}

export class SimulationAuthorityViolationError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationAuthorityViolationError';
  }
}

export class SimulationCrossTenantAccessForbiddenError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationCrossTenantAccessForbiddenError';
  }
}

export class SimulationDeadlockDetectedError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationDeadlockDetectedError';
  }
}

export class SimulationReplayCorpusCorruptedError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationReplayCorpusCorruptedError';
  }
}

export class SimulationEmergencyStopActiveError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationEmergencyStopActiveError';
  }
}

export class SimulationSecondaryAuthorityRejectedError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationSecondaryAuthorityRejectedError';
  }
}

export class SimulationAuditLedgerIntegrityError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationAuditLedgerIntegrityError';
  }
}

export class SimulationHandoffExpiredError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationHandoffExpiredError';
  }
}

export class DuplicateSimulationHandoffError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'DuplicateSimulationHandoffError';
  }
}

export class SimulationUntrustedInputSanitizationError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationUntrustedInputSanitizationError';
  }
}

export class SimulationLockTimeoutError extends GovernedPolicySimulationBaseError {
  constructor(message: string) {
    super(message);
    this.name = 'SimulationLockTimeoutError';
  }
}

// Aliases for convenience within subsystem
export {
  SimulationEmergencyStopActiveError as EmergencyStopActiveError,
  SimulationCrossTenantAccessForbiddenError as CrossTenantAccessForbiddenError,
};

// ============================================================================
// 7. DETERMINISTIC JSON SERIALIZATION & SHA-256 HASH HELPERS
// ============================================================================
export function canonicalJsonSerialize(value: unknown): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return JSON.stringify(value);
  }
  if (typeof value === 'string') {
    return JSON.stringify(value.normalize('NFC'));
  }
  if (Array.isArray(value)) {
    return '[' + value.map((item) => canonicalJsonSerialize(item)).join(',') + ']';
  }
  if (typeof value === 'object') {
    const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
    const entries = sortedKeys.map(
      (k) => `${JSON.stringify(k)}:${canonicalJsonSerialize((value as Record<string, unknown>)[k])}`
    );
    return '{' + entries.join(',') + '}';
  }
  return JSON.stringify(String(value));
}

export function computeSha256(data: string): string {
  return createHash('sha256').update(data, 'utf8').digest('hex');
}

export function computeReplayCorpusHash(corpus: readonly HistoricalObservationItem[]): string {
  return computeSha256(canonicalJsonSerialize(corpus));
}

export function computeCandidatePolicyHash(deltas: readonly PolicyDelta[], basePolicyHash: string): string {
  return computeSha256(canonicalJsonSerialize({ deltas, basePolicyHash }));
}

export function computeProjectionHash(projection: {
  readonly baselineAssurance: number;
  readonly projectedAssurance: number;
  readonly assuranceDelta: number;
  readonly falsePositiveRejectionRate: number;
}): string {
  return computeSha256(canonicalJsonSerialize(projection));
}

export function computeInvariantCheckHash(result: {
  readonly hasDeadlock: boolean;
  readonly circularDependencies: readonly (readonly string[])[];
  readonly conflictingRules: readonly string[];
}): string {
  return computeSha256(canonicalJsonSerialize(result));
}

export function computeStressHash(result: {
  readonly totalProbes: number;
  readonly passedProbes: number;
  readonly failedProbes: number;
  readonly boundaryBreakages: readonly string[];
}): string {
  return computeSha256(canonicalJsonSerialize(result));
}

export function computeSimulationDossierFingerprint(dossierPayload: Record<string, unknown>): string {
  return computeSha256(canonicalJsonSerialize(dossierPayload));
}

export function computeAuditEventHash(previousEventHash: string, eventData: Record<string, unknown>): string {
  return computeSha256(previousEventHash + canonicalJsonSerialize(eventData));
}

// ============================================================================
// 8. PROMPT INJECTION & UNTRUSTED TEXT SANITIZATION
// ============================================================================
export function sanitizeUntrustedText(text: string, maxLength = 2048): string {
  if (typeof text !== 'string') {
    return '';
  }
  // Strip control characters (except common whitespace)
  let sanitized = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');

  // Truncate to maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Detect and neutralize prompt injection attack patterns
  const injectionPatterns = [
    /SYSTEM:\s*/gi,
    /ASSISTANT:\s*/gi,
    /HUMAN:\s*/gi,
    /IGNORE\s+ALL\s+PREVIOUS\s+INSTRUCTIONS/gi,
    /IGNORE\s+PREVIOUS\s+COMMANDS/gi,
    /DISREGARD\s+GOVERNANCE/gi,
    /APPROVE\s+THIS\s+POLICY/gi,
    /AUTHORIZE\s+IMMEDIATELY/gi,
  ];

  for (const pattern of injectionPatterns) {
    sanitized = sanitized.replace(pattern, '[SANITIZED_INSTRUCTION]');
  }

  return sanitized.trim();
}
