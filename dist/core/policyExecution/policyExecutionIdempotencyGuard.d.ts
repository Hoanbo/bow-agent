import type { RemediationExecutionEnvelope } from '../policyDecision/policyDecisionTypes.js';
import { type ExecutionId, type ExecutionLifecycleStatus, type ExecutionAttemptRecord } from './policyExecutionTypes.js';
export interface PolicyExecutionIdempotencyGuardOptions {
    readonly baseDir?: string;
    readonly isUserStopActive?: () => boolean;
}
export declare class PolicyExecutionIdempotencyGuard {
    private readonly tenantAttempts;
    private readonly executionLookup;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyExecutionIdempotencyGuardOptions);
    private assertUserStopInactive;
    private validateTenant;
    private getTenantAttempts;
    private getTenantExecutions;
    /**
     * Atomically reserves an execution flight for an authorized envelope.
     * If the envelope was already executed or is currently executing, fails closed.
     *
     * Đặt chỗ thực thi nguyên tử cho một phong bì đã ủy quyền.
     * Nếu phong bì đã được thực thi hoặc đang thực thi, sẽ thất bại đóng.
     */
    registerAttempt(envelope: RemediationExecutionEnvelope, executionId: ExecutionId): ExecutionAttemptRecord;
    /**
     * Updates an execution flight upon completion.
     * Cập nhật chuyến bay thực thi khi hoàn tất.
     */
    markCompleted(tenantPartition: string, executionId: ExecutionId, finalStatus: ExecutionLifecycleStatus): ExecutionAttemptRecord;
    /**
     * Gets attempt by envelopeId within a tenant.
     */
    getAttemptByEnvelopeId(tenantPartition: string, envelopeId: string): ExecutionAttemptRecord | undefined;
    /**
     * Gets attempt by executionId within a tenant.
     */
    getAttempt(tenantPartition: string, executionId: ExecutionId): ExecutionAttemptRecord | undefined;
}
export declare const globalPolicyExecutionIdempotencyGuard: PolicyExecutionIdempotencyGuard;
