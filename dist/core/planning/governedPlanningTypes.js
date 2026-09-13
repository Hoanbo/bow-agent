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
};
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
};
/**
 * Base error class for Governed Planning.
 */
export class GovernedPlanningError extends Error {
    code;
    details;
    constructor(code, message, details) {
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
    validationErrors;
    constructor(message, validationErrors = []) {
        super('PLAN_VALIDATION_FAILED', message, { validationErrors });
        this.name = 'PlanValidationError';
        this.validationErrors = validationErrors;
    }
}
/**
 * Thrown when cycle or invalid edge is detected in plan DAG.
 */
export class PlanDagCycleError extends GovernedPlanningError {
    cycleNodes;
    constructor(message, cycleNodes = []) {
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
    expectedVersion;
    authoritativeVersion;
    constructor(expectedVersion, authoritativeVersion) {
        super('PLANNER_STALE_TASK_VERSION', `Planning rejected: expected task version ${expectedVersion} does not match authoritative version ${authoritativeVersion}`);
        this.name = 'StaleTaskPlanError';
        this.expectedVersion = expectedVersion;
        this.authoritativeVersion = authoritativeVersion;
    }
}
/**
 * Thrown when cross-tenant access or invalid tenant identifier is detected.
 */
export class CrossTenantPlanError extends GovernedPlanningError {
    constructor(message) {
        super('CROSS_TENANT_PLAN_REJECTED', message);
        this.name = 'CrossTenantPlanError';
    }
}
/**
 * Thrown when plan bounds (step count, dependencies, byte size) are exceeded.
 */
export class PlanBudgetExceededError extends GovernedPlanningError {
    constructor(message) {
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
