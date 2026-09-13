import { type ExecutionId, type ExecutionRecoveryDisposition, type PolicyExecutionOptions } from './policyExecutionTypes.js';
import { PolicyExecutionIdempotencyGuard } from './policyExecutionIdempotencyGuard.js';
import { PolicyExecutionAuditEngine } from './policyExecutionAuditEngine.js';
export interface PolicyExecutionRecoveryEngineOptions extends PolicyExecutionOptions {
    readonly idempotencyGuard?: PolicyExecutionIdempotencyGuard;
    readonly auditEngine?: PolicyExecutionAuditEngine;
}
export declare class PolicyExecutionRecoveryEngine {
    private readonly idempotencyGuard;
    private readonly auditEngine;
    private readonly maxExecutionDurationMs;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyExecutionRecoveryEngineOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Reconciles a single in-flight execution flight.
     * Điều hòa một chuyến bay thực thi đang diễn ra.
     */
    reconcileFlight(tenantPartition: string, executionId: ExecutionId): ExecutionRecoveryDisposition;
}
export declare const globalPolicyExecutionRecoveryEngine: PolicyExecutionRecoveryEngine;
