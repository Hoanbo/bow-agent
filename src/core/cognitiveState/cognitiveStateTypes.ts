// src/core/cognitiveState/cognitiveStateTypes.ts
// BOWCON V4.0 — MS-1.5.02: PERSISTENT COGNITIVE STATE CONTRACTS & ERROR HIERARCHY
// Component 989 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// REASONING != AUTHORIZATION
// COGNITIVE_STATE != TASK_STATE
// WORKING_STATE != DURABLE_TRUTH
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE
// FAIL_CLOSED_ON_MALFORMED_STATE == TRUE
// USER_STOP > ALL_COGNITIVE_MUTATION

import crypto from 'node:crypto';
import type { CognitiveIntent, CognitiveRiskLevel } from '../cognitive/cognitiveTypes.js';

export const COGNITIVE_STATE_SCHEMA_VERSION = 1;
export const MAX_COGNITIVE_STATE_BYTES = 512 * 1024; // 512 KB hard ceiling
export const MAX_RECENT_OBSERVATIONS = 10;
export const MAX_SECONDARY_ATTENTION_TARGETS = 3;
export const MAX_ATTENTION_STACK_DEPTH = 5;
export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

// ============================================================================
// 1. ERROR HIERARCHY
// ============================================================================

export class CognitiveStateError extends Error {
  public readonly code: string;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'CognitiveStateError';
    this.code = code;
    this.details = details ? Object.freeze({ ...details }) : undefined;
  }
}

export class CognitiveStateValidationError extends CognitiveStateError {
  public readonly validationErrors: readonly string[];
  constructor(message: string, errors: string[] = [], details?: Record<string, unknown>) {
    super('COGNITIVE_STATE_VALIDATION_ERROR', `${message}: ${errors.join('; ')}`, { errors, ...details });
    this.name = 'CognitiveStateValidationError';
    this.validationErrors = Object.freeze([...errors]);
  }
}

export class CognitiveStateConcurrencyError extends CognitiveStateError {
  public readonly expectedVersion: number;
  public readonly actualVersion: number;

  constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>) {
    super(
      'COGNITIVE_STATE_CONCURRENCY_ERROR',
      `Optimistic concurrency violation: expected stateVersion ${expectedVersion} but found ${actualVersion}`,
      { expectedVersion, actualVersion, ...details }
    );
    this.name = 'CognitiveStateConcurrencyError';
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

export class CognitiveStateSizeLimitError extends CognitiveStateError {
  public readonly byteLength: number;
  public readonly limitBytes: number;

  constructor(actualBytes: number, limitBytes: number = MAX_COGNITIVE_STATE_BYTES) {
    super(
      'COGNITIVE_STATE_SIZE_LIMIT_ERROR',
      `Cognitive state partition size ${actualBytes} bytes exceeds maximum limit of ${limitBytes} bytes`,
      { actualBytes, limitBytes }
    );
    this.name = 'CognitiveStateSizeLimitError';
    this.byteLength = actualBytes;
    this.limitBytes = limitBytes;
  }
}

export class CognitiveStateRecoveryError extends CognitiveStateError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('COGNITIVE_STATE_RECOVERY_ERROR', message, details);
    this.name = 'CognitiveStateRecoveryError';
  }
}

export class CognitiveStateIntegrityError extends CognitiveStateError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('COGNITIVE_STATE_INTEGRITY_ERROR', message, details);
    this.name = 'CognitiveStateIntegrityError';
  }
}

export class CrossTenantCognitiveStateError extends CognitiveStateError {
  constructor(requestedTenant: string, activeTenant: string) {
    super(
      'CROSS_TENANT_COGNITIVE_STATE_ERROR',
      `Unauthorized cross-tenant access: tenant '${activeTenant}' attempted to access state of '${requestedTenant}'`,
      { requestedTenant, activeTenant }
    );
    this.name = 'CrossTenantCognitiveStateError';
  }
}

export class CognitiveStateUserStopError extends CognitiveStateError {
  constructor(checkpoint: string) {
    super(
      'COGNITIVE_STATE_USER_STOP_ACTIVE',
      `Cognitive state mutation blocked at checkpoint '${checkpoint}' because USER_STOP is active`,
      { checkpoint }
    );
    this.name = 'CognitiveStateUserStopError';
  }
}

export class CognitiveStateTransitionError extends CognitiveStateError {
  constructor(fromState: string, toState: string, reason?: string) {
    super(
      'COGNITIVE_STATE_TRANSITION_ERROR',
      `Illegal cognitive lifecycle transition from '${fromState}' to '${toState}'${reason ? `: ${reason}` : ''}`,
      { fromState, toState, reason }
    );
    this.name = 'CognitiveStateTransitionError';
  }
}

export class CognitiveStatePromotionError extends CognitiveStateError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('COGNITIVE_STATE_PROMOTION_ERROR', message, details);
    this.name = 'CognitiveStatePromotionError';
  }
}

// ============================================================================
// 2. LIFECYCLE TAXONOMY
// ============================================================================

export type CognitiveLifecycleState =
  | 'UNINITIALIZED'
  | 'INITIALIZING'
  | 'ACTIVE'
  | 'INTERRUPTED'
  | 'SUSPENDED'
  | 'RECOVERING'
  | 'CLOSED';

export const LEGAL_LIFECYCLE_TRANSITIONS: Readonly<Record<CognitiveLifecycleState, readonly CognitiveLifecycleState[]>> = {
  UNINITIALIZED: ['INITIALIZING', 'RECOVERING', 'CLOSED'],
  INITIALIZING: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
  ACTIVE: ['INTERRUPTED', 'SUSPENDED', 'CLOSED'],
  INTERRUPTED: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
  SUSPENDED: ['RECOVERING', 'ACTIVE', 'CLOSED'],
  RECOVERING: ['ACTIVE', 'SUSPENDED', 'CLOSED'],
  CLOSED: ['INITIALIZING', 'RECOVERING'],
};

// ============================================================================
// 3. WORKING REGISTERS STRUCTURES
// ============================================================================

export interface FocusDescriptor {
  readonly subject: string;
  readonly domain: string;
  readonly establishedAt: string;
  readonly rationale: string;
}

export interface AttentionTargetDescriptor {
  readonly targetId: string;
  readonly targetType: 'FILE' | 'FUNCTION' | 'TASK_STEP' | 'ERROR' | 'ENTITY' | 'TOPIC';
  readonly targetValue: string;
  readonly salienceScore: number; // 0.0 to 1.0
  readonly assignedAt: string;
}

export interface CognitiveHypothesis {
  readonly hypothesisId: string;
  readonly summary: string;
  readonly status: 'SPECULATIVE' | 'VERIFYING' | 'REFUTED' | 'VERIFIED';
  readonly confidence: number; // 0.0 to 1.0
  readonly verificationCriteria?: string;
  readonly evidenceIds?: readonly string[];
}

export interface CognitivePendingDecision {
  readonly decisionId: string;
  readonly actionCandidate: string;
  readonly estimatedRisk: CognitiveRiskLevel;
  readonly requiresApproval: boolean;
  readonly rationale: string;
  readonly evaluatedAt: string;
}

export interface CognitiveObservation {
  readonly observationId: string;
  readonly source: string;
  readonly content: string;
  readonly observedAt: string;
  readonly salience: number;
}

export interface LastVerifiedStateReference {
  readonly verificationId: string;
  readonly stateChecksum: string;
  readonly verifiedAt: string;
  readonly verifiedByOracle: string;
}

export interface WorkingRegisters {
  readonly current_focus: FocusDescriptor | null;
  readonly active_intent: CognitiveIntent | null;
  readonly active_goal_ref: string | null;
  readonly attention_target: AttentionTargetDescriptor | null;
  readonly active_constraints: readonly string[];
  readonly active_entities: Readonly<Record<string, unknown>>;
  readonly unresolved_questions: readonly string[];
  readonly hypotheses: readonly CognitiveHypothesis[];
  readonly pending_decisions: readonly CognitivePendingDecision[];
  readonly recent_observations: readonly CognitiveObservation[]; // Max 10 items
  readonly current_environment: Readonly<Record<string, unknown>>;
  readonly active_task_ref: string | null;
  readonly cognitive_priority: number; // 0.0 to 1.0
  readonly uncertainty_state: Readonly<Record<string, unknown>>;
  readonly last_verified_state: LastVerifiedStateReference | null;
}

// ============================================================================
// 4. ATTENTION MANAGEMENT STRUCTURES
// ============================================================================

export interface AttentionFrame {
  readonly frameId: string;
  readonly primaryTarget: AttentionTargetDescriptor | null;
  readonly secondaryTargets: readonly AttentionTargetDescriptor[];
  readonly activePriority: number;
  readonly interruptedBy: string;
  readonly savedAt: string;
}

export interface AttentionState {
  readonly primaryTarget: AttentionTargetDescriptor | null;
  readonly secondaryTargets: readonly AttentionTargetDescriptor[]; // Max 3
  readonly stack: readonly AttentionFrame[]; // Max depth 5
}

// ============================================================================
// 5. PROVENANCE & ROOT DOCUMENT
// ============================================================================

export interface CognitiveStateProvenance {
  readonly stateHash: string; // SHA-256 of canonical state
  readonly previousStateHash: string; // SHA-256 of parent state
  readonly stateVersion: number; // Monotonically increasing
  readonly mutatedBy: string;
  readonly mutationReason: string;
  readonly timestamp: string;
}

export interface CognitiveStateDocument {
  readonly schemaVersion: number;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly stateVersion: number;
  readonly lifecycleState: CognitiveLifecycleState;
  readonly registers: WorkingRegisters;
  readonly attention: AttentionState;
  readonly provenance: CognitiveStateProvenance;
}

// ============================================================================
// 6. CANONICALIZATION & PROVENANCE UTILITIES
// ============================================================================

const PROHIBITED_COT_KEYS = new Set([
  'internalreasoning',
  'chainofthought',
  'scratchpad',
  'scratchpadtokens',
  'privatedeliberation',
  'hiddenthoughts',
  'thoughtlog',
  'internalmonologue',
  'modelthinking',
]);

/**
 * Recursively canonicalizes an arbitrary object/array ensuring deterministic key sorting
 * and detecting prohibited chain-of-thought keys.
 */
export function canonicalizeStateValue(val: unknown, path = ''): unknown {
  if (val === null || typeof val !== 'object') {
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item, idx) => canonicalizeStateValue(item, `${path}[${idx}]`));
  }

  const sortedObj: Record<string, unknown> = {};
  const keys = Object.keys(val as Record<string, unknown>).sort();

  for (const key of keys) {
    const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
    if (PROHIBITED_COT_KEYS.has(lowerKey)) {
      throw new CognitiveStateValidationError('Raw chain-of-thought persistence is prohibited', [
        `Prohibited reasoning key detected at '${path}.${key}'`,
      ]);
    }

    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      throw new CognitiveStateValidationError('Prototype pollution key detected', [
        `Illegal key '${key}' at '${path}'`,
      ]);
    }

    const child = (val as Record<string, unknown>)[key];
    if (typeof child !== 'function' && typeof child !== 'symbol') {
      sortedObj[key] = canonicalizeStateValue(child, `${path}.${key}`);
    }
  }

  return sortedObj;
}

/**
 * Produces deterministic JSON string from canonical state document without volatile fields.
 */
export function serializeCanonicalState(doc: CognitiveStateDocument): string {
  // Exclude volatile self-referencing stateHash from payload being hashed
  const material = {
    schemaVersion: doc.schemaVersion,
    tenantId: doc.tenantId,
    sessionId: doc.sessionId,
    stateVersion: doc.stateVersion,
    lifecycleState: doc.lifecycleState,
    registers: doc.registers,
    attention: doc.attention,
    previousStateHash: doc.provenance.previousStateHash,
    mutatedBy: doc.provenance.mutatedBy,
    mutationReason: doc.provenance.mutationReason,
    timestamp: doc.provenance.timestamp,
  };

  const canonicalObj = canonicalizeStateValue(material);
  return JSON.stringify(canonicalObj);
}

/**
 * Computes SHA-256 provenance hash for a cognitive state document.
 */
export function computeCognitiveStateHash(doc: CognitiveStateDocument): string {
  const serialized = serializeCanonicalState(doc);
  return crypto.createHash('sha256').update(serialized, 'utf8').digest('hex');
}
