// src/core/policyDecision/policyControlledRemediationBoundary.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Governed Policy Controlled Remediation Boundary (Component 732).
// Enforces that only human-authorized, safety-verified remediation requests
// cross into execution envelopes for existing governed engines.
// Strictly forbids arbitrary tool execution, shell commands, or PEP bypass.
//
// Ranh giới khắc phục có kiểm soát chính sách có quản trị (Thành phần 732).
// Thực thi rằng chỉ các yêu cầu khắc phục đã được con người ủy quyền, đã xác minh an toàn
// mới được chuyển thành phong bì thực thi cho các động cơ có quản trị hiện có.
// Nghiêm cấm thực thi công cụ tùy tiện, lệnh shell hoặc vượt qua PEP.
//
// Authority Invariants:
// - ZERO_DIRECT_TOOL_EXECUTION: Never executes tools or shell commands directly
// - PEP_SUPREMACY: All execution requests route to existing GovernedPolicyEnforcementPoint / Rollback engines
// - HARD_FORBIDDEN_IMMUTABLE: Block all operations touching hard-forbidden actions
// - USER_STOP > ALL_BOUNDARY_OPERATIONS
// - CIRCUIT_BREAKER_SAFETY_INTERLOCK
import crypto from 'node:crypto';
import path from 'node:path';
import { HARD_FORBIDDEN_ACTIONS } from './policyRemediationPlanner.js';
import { globalPolicyCanaryCircuitBreaker } from '../policyCanary/policyCanaryCircuitBreaker.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyControlledRemediationBoundary {
    circuitBreaker;
    isUserStopActiveFn;
    constructor(options) {
        this.circuitBreaker = options?.circuitBreaker ?? globalPolicyCanaryCircuitBreaker;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Remediation boundary operations suspended by USER_STOP');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('BOUNDARY_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
    }
    /**
     * Validates safety preconditions and creates a governed execution envelope.
     * Does NOT call tools directly; prepares the envelope for downstream governed dispatch.
     *
     * Thẩm định các điều kiện tiên quyết an toàn và tạo phong bì thực thi có quản trị.
     * KHÔNG gọi trực tiếp công cụ; chuẩn bị phong bì cho việc điều phối có quản trị tiếp theo.
     */
    dispatchRemediation(request) {
        // 1. Fail closed on USER_STOP
        this.assertUserStopInactive();
        // 2. Strict tenant isolation
        this.validateTenant(request.tenantPartition);
        // 3. Verify request is AUTHORIZED
        if (request.state !== 'AUTHORIZED') {
            throw new Error(`UNAUTHORIZED_REMEDIATION_DENIED: Cannot dispatch remediation in state '${request.state}' (must be AUTHORIZED)`);
        }
        if (!request.authorizationToken) {
            throw new Error('MISSING_AUTHORIZATION_TOKEN: Remediation request lacks valid authorization token');
        }
        // 4. Assert hard-forbidden actions are not targeted
        for (const action of request.plan.proposedActions) {
            const lower = action.toLowerCase();
            for (const forbidden of HARD_FORBIDDEN_ACTIONS) {
                if (lower.includes(forbidden)) {
                    throw new Error(`HARD_FORBIDDEN_IMMUTABLE_DENIED: Remediation action '${action}' violates hard-forbidden safety floor (${forbidden})`);
                }
            }
        }
        // 5. Check circuit breaker status
        const cbStatus = this.circuitBreaker.getStatus(request.tenantPartition);
        if (cbStatus.tripped && request.plan.remediationType !== 'BLOCK_POLICY_CANDIDATE' && request.plan.remediationType !== 'ROLLBACK_TO_BASELINE') {
            throw new Error(`CIRCUIT_BREAKER_ACTIVE_BLOCKED: Circuit breaker is tripped (${cbStatus.tripReason ?? 'TRIPPED'}). Remediation blocked.`);
        }
        // 6. Build governed execution envelope
        const envelopeId = `env_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const envelope = Object.freeze({
            envelopeId,
            requestId: request.requestId,
            proposalId: request.proposalId,
            tenantPartition: request.tenantPartition,
            candidateId: request.candidateId,
            targetRing: request.plan.targetRing,
            actionType: request.plan.remediationType,
            authorizedOperatorId: request.authorizationToken.operatorUserId,
            safetyFloorVerified: true,
            circuitBreakerClear: !cbStatus.tripped || request.plan.remediationType === 'BLOCK_POLICY_CANDIDATE' || request.plan.remediationType === 'ROLLBACK_TO_BASELINE',
            userStopClear: true,
            preparedAt: new Date().toISOString(),
            dispatchPayload: Object.freeze({
                planId: request.plan.planId,
                remediationType: request.plan.remediationType,
                blastRadius: request.plan.blastRadius,
                proposedActions: [...request.plan.proposedActions],
            }),
        });
        return Object.freeze({
            requestId: request.requestId,
            proposalId: request.proposalId,
            tenantPartition: request.tenantPartition,
            success: true,
            state: 'EXECUTION_PENDING',
            envelope,
            completedAt: new Date().toISOString(),
        });
    }
}
export const globalPolicyControlledRemediationBoundary = new PolicyControlledRemediationBoundary();
