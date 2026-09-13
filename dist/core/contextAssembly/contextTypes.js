// src/core/contextAssembly/contextTypes.ts
// BOWCON V4.0 — MS-1.4.03: CONTEXT ASSEMBLY & DYNAMIC COMPACTION TYPES
//
// Invariants:
// CONTEXT != AUTHORITY
// CONTEXT != PLAN
// CONTEXT != EXECUTION
// CONTEXT != POLICY
// CONTEXT != MEMORY COMMIT
// HARD_MAX_PROMPT_TOKENS <= 8192
// DEFAULT_MAX_PROMPT_TOKENS == 4096
// DEFAULT_MAX_COMPLETION_TOKENS == 2048
// TIER_1_CRITICAL_IMMUTABLE == TRUE
export const HARD_MAX_PROMPT_TOKENS = 8192;
export const DEFAULT_MAX_PROMPT_TOKENS = 4096;
export const DEFAULT_MAX_COMPLETION_TOKENS = 2048;
/**
 * Priority tiers for context fragments during assembly and compaction.
 * Lower numbers have strictly higher preservation priority.
 */
export var ContextTier;
(function (ContextTier) {
    ContextTier[ContextTier["TIER_1_CRITICAL"] = 1] = "TIER_1_CRITICAL";
    ContextTier[ContextTier["TIER_2_HIGH"] = 2] = "TIER_2_HIGH";
    ContextTier[ContextTier["TIER_3_MEDIUM"] = 3] = "TIER_3_MEDIUM";
    ContextTier[ContextTier["TIER_4_LOW"] = 4] = "TIER_4_LOW";
})(ContextTier || (ContextTier = {}));
// ---------------------------------------------------------------------------
// ERROR HIERARCHY
// ---------------------------------------------------------------------------
export class ContextAssemblyError extends Error {
    code;
    details;
    constructor(message, code = 'CONTEXT_ASSEMBLY_ERROR', details) {
        super(`[${code}] ${message}`);
        this.name = this.constructor.name;
        this.code = code;
        this.details = details ? Object.freeze({ ...details }) : undefined;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
export class ContextSourceUnavailableError extends ContextAssemblyError {
    constructor(source, reason, details) {
        super(`Mandatory context source '${source}' is unavailable: ${reason || 'Not found'}`, 'CONTEXT_SOURCE_UNAVAILABLE', { source, reason, ...details });
    }
}
export class ContextSourceCorruptedError extends ContextAssemblyError {
    constructor(source, reason, details) {
        super(`Context source '${source}' is corrupted: ${reason || 'Integrity violation'}`, 'CONTEXT_SOURCE_CORRUPTED', { source, reason, ...details });
    }
}
export class ContextBudgetExceededError extends ContextAssemblyError {
    limit;
    actual;
    constructor(limit, actual, messageOrDetails) {
        const customMsg = typeof messageOrDetails === 'string' ? messageOrDetails : undefined;
        const details = typeof messageOrDetails === 'object' ? messageOrDetails : undefined;
        super(customMsg || `Context token budget exceeded: limit=${limit}, actual=${actual} (compaction unable to reduce further without violating Tier 1 safety)`, 'CONTEXT_BUDGET_EXCEEDED', { limit, actual, ...details });
        this.limit = limit;
        this.actual = actual;
    }
}
export class ContextUserStopError extends ContextAssemblyError {
    stage;
    constructor(stage) {
        super(`Context assembly aborted by USER_STOP during stage '${stage}'`, 'CONTEXT_USER_STOP_ERROR', { stage });
        this.stage = stage;
    }
}
export class CrossTenantContextError extends ContextAssemblyError {
    requestedTenantId;
    actualTenantId;
    constructor(requestedTenantId, actualTenantId, details) {
        super(`Cross-tenant context violation: requested '${requestedTenantId}' but resource belongs to '${actualTenantId}'`, 'CROSS_TENANT_CONTEXT_ERROR', { requestedTenantId, actualTenantId, ...details });
        this.requestedTenantId = requestedTenantId;
        this.actualTenantId = actualTenantId;
    }
}
export class StaleTaskContextError extends ContextAssemblyError {
    expectedVersion;
    actualVersion;
    constructor(taskId, expectedVersion, actualVersion) {
        super(`Stale task context for task '${taskId}': expected version ${expectedVersion}, but actual task version is ${actualVersion}`, 'STALE_TASK_CONTEXT_ERROR', { taskId, expectedVersion, actualVersion });
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }
}
export class ContextValidationError extends ContextAssemblyError {
    validationErrors;
    constructor(message, errors = []) {
        super(`Context validation error: ${message}${errors.length > 0 ? ` (${errors.join(', ')})` : ''}`, 'CONTEXT_VALIDATION_ERROR', { validationErrors: errors });
        this.validationErrors = Object.freeze([...errors]);
    }
}
