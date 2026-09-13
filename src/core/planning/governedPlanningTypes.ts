// src/core/planning/governedPlanningTypes.ts
// BOWCON V4.0 — MS-1.4.04: GOVERNED MULTI-STEP ACTION PLANNER TYPES
//
// Invariants:
// LLM_OUTPUT != AUTHORITY
// LLM_PROPOSAL != EXECUTION
// CONFIDENCE != AUTHORIZATION
// PLAN != EXECUTION
// PLANNER != TOOL_EXECUTOR
// COGNITION != AUTHORIZATION
// USER_STOP > PLANNER
//
// Candidate plans are strictly UNTRUSTED DATA. MS-1.4.04 never executes tools,
// mutates AgentTask lifecycle state, issues execution tokens, or bypasses PDP/PEP.

import type { PlanActionType, PlanRiskLevel } from './planningTypes.js';
import type { CognitiveResult } from '../cognitive/cognitiveTypes.js';
import type { AssembledContext } from '../contextAssembly/contextTypes.js';

export const GOVERNED_PLANNER_VERSION = '4.0.0';

/**
 * Hard bounded limits for the governed planner.
 */
export const PLANNER_LIMITS = {
  MAX_STEPS: 20,
  MAX_DEPENDENCIES: 50,
  MAX_PARAMETER_BYTES: 8192,
  MAX_PLAN_SIZE_BYTES: 65536,
  MAX_INTENT_LENGTH: 512,
  MAX_TARGET_LENGTH: 256,
  MAX_ASSUMPTIONS: 10,
  MAX_CONSTRAINTS: 20,
} as const;

/**
 * Governed planner configuration options.
 */
export interface GovernedPlannerConfig {
  readonly maxSteps?: number;
  readonly maxDependencies?: number;
  readonly maxParameterBytes?: number;
  readonly maxPlanSizeBytes?: number;
  readonly enforceStrictApprovalOnHighRisk?: boolean;
  readonly deterministicTimestamp?: string;
  /**
   * Hard invariant: Autonomous actions are never allowed.
   */
  readonly allowAutonomousActions?: false;
}

/**
 * Canonical request contract for governed multi-step action planning.
 */
export interface GovernedPlanningRequest {
  readonly requestId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly expectedTaskVersion: number;
  readonly cognitiveResult: CognitiveResult;
  readonly assembledContext?: AssembledContext;
  readonly constraints?: readonly string[];
  readonly plannerConfig?: GovernedPlannerConfig;
  readonly correlationId?: string;
  readonly signal?: AbortSignal;
}

/**
 * Individual inert candidate step within a governed plan.
 * Contains NO executable callbacks, NO tool invocations, NO execution authority.
 */
export interface GovernedCandidateStep {
  readonly stepId: string;
  readonly sequence: number;
  readonly actionType: PlanActionType;
  readonly intent: string;
  readonly target?: string;
  readonly parameters: Readonly<Record<string, unknown>>;
  readonly dependencies: readonly string[];
  readonly expectedOutcome: string;
  readonly riskLevel: PlanRiskLevel;
  readonly requiresApproval: boolean;
  readonly capabilityId?: string;
  readonly status: 'CANDIDATE';
}

/**
 * Directed dependency edge between two candidate steps.
 */
export interface PlanDependencyEdge {
  readonly fromStepId: string; // Prerequisite step
  readonly toStepId: string;   // Dependent step
}

/**
 * Directed Acyclic Graph (DAG) representation of candidate step dependencies.
 */
export interface PlanDag {
  readonly nodes: readonly string[];
  readonly edges: readonly PlanDependencyEdge[];
  readonly topologicalOrder: readonly string[];
  readonly levels: readonly (readonly string[])[];
}

/**
 * Summary of risk and approval requirements across all candidate steps.
 */
export interface PlanRiskSummary {
  readonly overallRisk: PlanRiskLevel;
  readonly highestStepRisk: PlanRiskLevel;
  readonly riskCounts: Readonly<Record<PlanRiskLevel, number>>;
  readonly approvalRequiredStepCount: number;
  readonly requiresHumanApproval: boolean;
}

/**
 * Canonical Governed Candidate Plan.
 * This is UNTRUSTED DATA representing a candidate proposal only.
 */
export interface GovernedCandidatePlan {
  readonly planId: string;
  readonly requestId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly taskVersion: number;
  readonly objective: string;
  readonly assumptions: readonly string[];
  readonly constraints: readonly string[];
  readonly steps: readonly GovernedCandidateStep[];
  readonly dag: PlanDag;
  readonly riskSummary: PlanRiskSummary;
  readonly requiresApproval: boolean;
  /**
   * Explicit architectural tags:
   * Confirms this data structure is candidate-only and holds no execution authority.
   */
  readonly isCandidatePlanOnly: true;
  readonly isAuthorized: false;
  readonly provenanceHash: string;
  readonly timestamp: string;
}

/**
 * Validation metadata for candidate plan integrity.
 */
export interface PlanValidationMetadata {
  readonly valid: boolean;
  readonly validatedAt: string;
  readonly stepCount: number;
  readonly edgeCount: number;
  readonly passedValidationRules: readonly string[];
}

/**
 * Planner runtime execution metadata.
 */
export interface PlannerRuntimeMetadata {
  readonly plannerVersion: string;
  readonly durationMs: number;
  readonly deterministicTimestampUsed: boolean;
  readonly cognitiveModelUsed: string;
}

/**
 * Canonical response contract from the governed planner.
 */
export interface GovernedPlanningResponse {
  readonly requestId: string;
  readonly taskId: string;
  readonly tenantId: string;
  readonly taskVersion: number;
  readonly candidatePlan: GovernedCandidatePlan;
  readonly validationMetadata: PlanValidationMetadata;
  readonly provenanceHash: string;
  readonly timestamp: string;
  readonly plannerMetadata: PlannerRuntimeMetadata;
  readonly status: 'CANDIDATE_PRODUCED';
}

/**
 * Audit event type constants for governed planner domain.
 */
export const PLANNER_AUDIT_DOMAIN = 'agent_action_planner';

export const PlannerAuditEventType = {
  PLANNER_STARTED: 'PLANNER_STARTED',
  PLANNER_COMPLETED: 'PLANNER_COMPLETED',
  PLANNER_VALIDATION_FAILED: 'PLANNER_VALIDATION_FAILED',
  PLANNER_DAG_INVALID: 'PLANNER_DAG_INVALID',
  PLANNER_STALE_REJECTED: 'PLANNER_STALE_REJECTED',
  PLANNER_USER_STOP_ABORTED: 'PLANNER_USER_STOP_ABORTED',
  PLANNER_PLAN_REJECTED: 'PLANNER_PLAN_REJECTED',
} as const;

export type PlannerAuditEventType = typeof PlannerAuditEventType[keyof typeof PlannerAuditEventType];

/**
 * Base error class for Governed Planning.
 */
export class GovernedPlanningError extends Error {
  public readonly code: string;
  public readonly details?: unknown;

  constructor(code: string, message: string, details?: unknown) {
    super(`[${code}] ${message}`);
    this.name = 'GovernedPlanningError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when plan structural or safety validation fails.
 */
export class PlanValidationError extends GovernedPlanningError {
  public readonly validationErrors: readonly string[];

  constructor(message: string, validationErrors: readonly string[] = []) {
    super('PLAN_VALIDATION_FAILED', message, { validationErrors });
    this.name = 'PlanValidationError';
    this.validationErrors = validationErrors;
  }
}

/**
 * Thrown when cycle or invalid edge is detected in plan DAG.
 */
export class PlanDagCycleError extends GovernedPlanningError {
  public readonly cycleNodes: readonly string[];

  constructor(message: string, cycleNodes: readonly string[] = []) {
    super('PLAN_DAG_CYCLE_DETECTED', message, { cycleNodes });
    this.name = 'PlanDagCycleError';
    this.cycleNodes = cycleNodes;
  }
}

/**
 * Thrown when planning is aborted by USER_STOP supremacy.
 */
export class PlanUserStopError extends GovernedPlanningError {
  constructor(message = 'Planning aborted by USER_STOP supremacy') {
    super('PLAN_USER_STOP_ABORTED', message);
    this.name = 'PlanUserStopError';
  }
}

/**
 * Thrown when task version mismatch is detected (stale plan protection).
 */
export class StaleTaskPlanError extends GovernedPlanningError {
  public readonly expectedVersion: number;
  public readonly authoritativeVersion: number;

  constructor(expectedVersion: number, authoritativeVersion: number) {
    super(
      'PLANNER_STALE_TASK_VERSION',
      `Planning rejected: expected task version ${expectedVersion} does not match authoritative version ${authoritativeVersion}`
    );
    this.name = 'StaleTaskPlanError';
    this.expectedVersion = expectedVersion;
    this.authoritativeVersion = authoritativeVersion;
  }
}

/**
 * Thrown when cross-tenant access or invalid tenant identifier is detected.
 */
export class CrossTenantPlanError extends GovernedPlanningError {
  constructor(message: string) {
    super('CROSS_TENANT_PLAN_REJECTED', message);
    this.name = 'CrossTenantPlanError';
  }
}

/**
 * Thrown when plan bounds (step count, dependencies, byte size) are exceeded.
 */
export class PlanBudgetExceededError extends GovernedPlanningError {
  constructor(message: string) {
    super('PLAN_BUDGET_EXCEEDED', message);
    this.name = 'PlanBudgetExceededError';
  }
}

/**
 * Thrown when planning is cancelled via AbortSignal.
 */
export class PlanAbortError extends GovernedPlanningError {
  constructor(message = 'Planning operation was aborted by signal') {
    super('PLAN_ABORTED', message);
    this.name = 'PlanAbortError';
  }
}
