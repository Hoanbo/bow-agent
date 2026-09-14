// src/core/goal/goalTypes.ts
// BOWCON V4.0 — MS-1.5.04: NATIVE GOAL FORMATION & PRIORITY GRAPH TYPES
// Component 1008 — REAL
//
// Invariants:
// COGNITION != AUTHORITY
// GOAL != TASK
// PRIORITY != AUTHORIZATION
// VECTOR_MATCH != GOAL_TRUTH
// WORKING_STATE != DURABLE_TRUTH
// USER_STOP > ALL_MUTATION
// LLM_OUTPUT != AUTHORITATIVE_GOAL
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_CYCLE == TRUE
// FAIL_CLOSED_ON_MALFORMED_GOAL == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE

import crypto from 'node:crypto';
import type { CognitiveIntent } from '../cognitive/cognitiveTypes.js';

export const GOAL_SCHEMA_VERSION = 1;
export const MAX_GOALS_PER_TENANT = 500;
export const MAX_SUBGOALS_PER_GOAL = 20;
export const MAX_GRAPH_DEPTH = 8;
export const MAX_EDGES_PER_GOAL = 30;
export const MAX_TITLE_LENGTH = 200;
export const MAX_DESCRIPTION_LENGTH = 2000;

// ============================================================================
// 1. ERROR TAXONOMY
// ============================================================================

export class GoalError extends Error {
  public readonly code: string;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'GoalError';
    this.code = code;
    this.details = details ? Object.freeze({ ...details }) : undefined;
  }
}

export class GoalValidationError extends GoalError {
  public readonly validationErrors: readonly string[];
  constructor(message: string, errors: string[] = [], details?: Record<string, unknown>) {
    super('GOAL_VALIDATION_ERROR', `${message}: ${errors.join('; ')}`, { errors, ...details });
    this.name = 'GoalValidationError';
    this.validationErrors = Object.freeze([...errors]);
  }
}

export class GoalTransitionError extends GoalError {
  constructor(fromStatus: string, toStatus: string, reason?: string) {
    super(
      'GOAL_TRANSITION_ERROR',
      `Illegal goal lifecycle transition from '${fromStatus}' to '${toStatus}'${reason ? `: ${reason}` : ''}`,
      { fromStatus, toStatus, reason }
    );
    this.name = 'GoalTransitionError';
  }
}

export class GoalGraphCycleError extends GoalError {
  public readonly cyclePath: readonly string[];
  constructor(cyclePath: string[] = []) {
    super(
      'GOAL_GRAPH_CYCLE_ERROR',
      `Cyclic dependency detected in goal graph: ${cyclePath.join(' -> ')}`,
      { cyclePath }
    );
    this.name = 'GoalGraphCycleError';
    this.cyclePath = Object.freeze([...cyclePath]);
  }
}

export class GoalConcurrencyError extends GoalError {
  public readonly expectedVersion: number;
  public readonly actualVersion: number;

  constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>) {
    super(
      'GOAL_CONCURRENCY_ERROR',
      `Optimistic concurrency violation: expected version ${expectedVersion} but found ${actualVersion}`,
      { expectedVersion, actualVersion, ...details }
    );
    this.name = 'GoalConcurrencyError';
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

export class CrossTenantGoalError extends GoalError {
  constructor(requestedTenant: string, activeTenant: string) {
    super(
      'CROSS_TENANT_GOAL_ERROR',
      `Security violation: cross-tenant access blocked between requested '${requestedTenant}' and active '${activeTenant}'`,
      { requestedTenant, activeTenant }
    );
    this.name = 'CrossTenantGoalError';
  }
}

export class GoalUserStopError extends GoalError {
  constructor(checkpoint: string) {
    super(
      'GOAL_USER_STOP_ERROR',
      `Goal mutation preempted at checkpoint '${checkpoint}' because USER_STOP is active`,
      { checkpoint }
    );
    this.name = 'GoalUserStopError';
  }
}

export class GoalCoTProhibitedError extends GoalError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GOAL_COT_PROHIBITED_ERROR', message, details);
    this.name = 'GoalCoTProhibitedError';
  }
}

export class GoalIntegrityError extends GoalError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GOAL_INTEGRITY_ERROR', message, details);
    this.name = 'GoalIntegrityError';
  }
}

export class GoalSecurityError extends GoalError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('GOAL_SECURITY_ERROR', message, details);
    this.name = 'GoalSecurityError';
  }
}

export class GoalCapacityError extends GoalError {
  constructor(currentCount: number, maxCount: number, entityType = 'goals') {
    super(
      'GOAL_CAPACITY_ERROR',
      `Capacity exceeded for ${entityType}: current ${currentCount}, maximum allowed is ${maxCount}`,
      { currentCount, maxCount, entityType }
    );
    this.name = 'GoalCapacityError';
  }
}

// ============================================================================
// 2. GOAL TAXONOMY & CONTRACTS
// ============================================================================

export type GoalOrigin =
  | 'USER_DIRECTIVE'
  | 'SYSTEM_EVENT'
  | 'COGNITIVE_REGISTER'
  | 'TASK_OUTCOME';

export type GoalStatus =
  | 'PROPOSED'
  | 'VALIDATING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ABANDONED'
  | 'REJECTED';

export type GovernedGoalStatus = GoalStatus;

export type GoalEdgeType =
  | 'PARENT_OF'
  | 'DEPENDS_ON'
  | 'BLOCKS'
  | 'CONFLICTS_WITH';

export type GoalConflictType =
  | 'RESOURCE_EXCLUSION'
  | 'POLICY_CONTRADICTION'
  | 'INSTRUCTIONAL_CONTRADICTION';

export interface GoalPriorityVector {
  readonly importance: number;         // I in [0.0, 1.0]
  readonly urgency: number;            // U in [0.0, 1.0]
  readonly userEmphasis: number;       // E in [0.0, 1.0]
  readonly risk: number;               // R in [0.0, 1.0]
  readonly dependencyPressure: number; // D in [0.0, 1.0]
  readonly blockingImpact: number;      // B in [0.0, 1.0]
}

export interface GoalPriorityWeights {
  readonly wi: number; // Importance weight (default 0.25)
  readonly wu: number; // Urgency weight (default 0.20)
  readonly we: number; // User Emphasis weight (default 0.25)
  readonly wr: number; // Risk weight (default -0.10)
  readonly wd: number; // Dependency weight (default 0.15)
  readonly wb: number; // Blocking Impact weight (default 0.25)
}

export const CANONICAL_PRIORITY_WEIGHTS: GoalPriorityWeights = Object.freeze({
  wi: 0.25,
  wu: 0.20,
  we: 0.25,
  wr: -0.10,
  wd: 0.15,
  wb: 0.25,
});

export interface GoalProposalInput {
  readonly tenantId: string;
  readonly sessionId?: string;
  readonly parentGoalId?: string | null;
  readonly origin: GoalOrigin;
  readonly sourceIntent: string | CognitiveIntent;
  readonly title: string;
  readonly description: string;
  readonly successCriteria: readonly string[];
  readonly failureCriteria?: readonly string[];
  readonly constraints?: readonly string[];
  readonly priorityVector?: Partial<GoalPriorityVector>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface GovernedGoal {
  readonly goalId: string;
  readonly parentGoalId: string | null;
  readonly tenantId: string;
  readonly sessionId?: string;
  readonly origin: GoalOrigin;
  readonly sourceIntent: string | CognitiveIntent;
  readonly title: string;
  readonly description: string;
  readonly successCriteria: readonly string[];
  readonly failureCriteria: readonly string[];
  readonly constraints: readonly string[];
  readonly priorityScore: number; // Bounded [0.0, 1.0]
  readonly priorityVector: GoalPriorityVector;
  readonly status: GoalStatus;
  readonly statusReason?: string;
  readonly activeTaskRefs: readonly string[];
  readonly version: number;
  readonly provenanceHash: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface GoalEdge {
  readonly edgeId: string;
  readonly sourceGoalId: string;
  readonly targetGoalId: string;
  readonly edgeType: GoalEdgeType;
  readonly tenantId: string;
  readonly metadata?: Readonly<Record<string, unknown>>;
  readonly createdAt: string;
}

export interface GoalConflictDescriptor {
  readonly conflictId: string;
  readonly goalIdA: string;
  readonly goalIdB: string;
  readonly conflictType: GoalConflictType;
  readonly severity: 'HIGH' | 'CRITICAL';
  readonly reason: string;
  readonly detectedAt: string;
}

export interface GoalGraphDocument {
  readonly schemaVersion: number;
  readonly tenantId: string;
  readonly graphVersion: number;
  readonly goals: readonly GovernedGoal[];
  readonly edges: readonly GoalEdge[];
  readonly conflicts: readonly GoalConflictDescriptor[];
  readonly provenanceHash: string;
  readonly lastUpdatedAt: string;
  readonly recoveredFromBackup?: boolean;
}

// ============================================================================
// 3. SECURITY & CANONICAL UTILITIES
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

export function isSafeObjectKey(key: string): boolean {
  if (typeof key !== 'string') return false;
  const k = key.trim().toLowerCase();
  return k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
}

export function assertNoChainOfThought(val: unknown, path = ''): void {
  if (val === null || val === undefined) return;

  if (typeof val === 'string') {
    const lower = val.toLowerCase();
    if (
      lower.includes('<thought>') ||
      lower.includes('</thought>') ||
      lower.includes('[internal deliberation]') ||
      lower.includes('[scratchpad]') ||
      lower.includes('internal reason')
    ) {
      throw new GoalCoTProhibitedError(
        `Raw chain-of-thought tokens detected in text at '${path}'`,
        { path }
      );
    }
    return;
  }

  if (Array.isArray(val)) {
    val.forEach((item, idx) => assertNoChainOfThought(item, `${path}[${idx}]`));
    return;
  }

  if (typeof val === 'object') {
    for (const key of Object.getOwnPropertyNames(val)) {
      if (!isSafeObjectKey(key)) {
        throw new GoalSecurityError(
          `Prototype pollution key detected: '${key}' at '${path}'`,
          { key, path }
        );
      }
      const lowerKey = key.toLowerCase().replace(/[^a-z]/g, '');
      if (PROHIBITED_COT_KEYS.has(lowerKey)) {
        throw new GoalCoTProhibitedError(
          `Prohibited reasoning key detected at '${path}.${key}'`,
          { key, path }
        );
      }
      assertNoChainOfThought((val as Record<string, unknown>)[key], `${path}.${key}`);
    }
  }
}

export const assertNoProhibitedReasoning = assertNoChainOfThought;

/**
 * Computes deterministic goal identifier from canonical material.
 */
export function computeDeterministicGoalId(
  tenantId: string,
  sourceIntent: string | CognitiveIntent,
  title: string,
  createdAt: string
): string {
  const intentStr =
    typeof sourceIntent === 'string'
      ? sourceIntent
      : (sourceIntent as any)?.intentId || JSON.stringify(sourceIntent);
  const hash = crypto
    .createHash('sha256')
    .update(`${tenantId}:${intentStr}:${title.trim().toLowerCase()}:${createdAt}`, 'utf8')
    .digest('hex')
    .slice(0, 16);
  return `goal_${hash}`;
}

/**
 * Computes deterministic SHA-256 hash of a GovernedGoal.
 */
export function computeGoalHash(
  goal: Omit<GovernedGoal, 'provenanceHash'>,
  previousHash = '0'.repeat(64)
): string {
  const material = {
    goalId: goal.goalId,
    parentGoalId: goal.parentGoalId,
    tenantId: goal.tenantId,
    sessionId: goal.sessionId ?? null,
    origin: goal.origin,
    sourceIntent: goal.sourceIntent,
    title: goal.title,
    description: goal.description,
    successCriteria: [...goal.successCriteria].sort(),
    failureCriteria: [...goal.failureCriteria].sort(),
    constraints: [...goal.constraints].sort(),
    priorityScore: goal.priorityScore,
    status: goal.status,
    statusReason: goal.statusReason ?? null,
    activeTaskRefs: [...goal.activeTaskRefs].sort(),
    version: goal.version,
    createdAt: goal.createdAt,
    previousHash,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}

/**
 * Computes deterministic provenance hash for the entire GoalGraphDocument.
 */
export function computeGraphProvenanceHash(
  doc: Omit<GoalGraphDocument, 'provenanceHash'>
): string {
  const material = {
    schemaVersion: doc.schemaVersion,
    tenantId: doc.tenantId,
    graphVersion: doc.graphVersion,
    goalHashes: doc.goals.map((g) => `${g.goalId}:${g.provenanceHash}`).sort(),
    edgeHashes: doc.edges
      .map((e) => `${e.sourceGoalId}:${e.edgeType}:${e.targetGoalId}`)
      .sort(),
    conflictHashes: doc.conflicts
      .map((c) => `${c.conflictId}:${c.goalIdA}:${c.goalIdB}:${c.conflictType}`)
      .sort(),
    lastUpdatedAt: doc.lastUpdatedAt,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}
