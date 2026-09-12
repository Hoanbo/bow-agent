// src/core/policyDecision/policyRemediationPlanner.ts
// BOWCON V4.0 — MS-1.3.64: GOVERNED POLICY DECISION & CONTROLLED REMEDIATION LAYER
//
// Governed Policy Remediation Planner (Component 730).
// Synthesizes deterministic, explainable remediation plans from approved decision proposals.
// Classifies blast radius, identifies required authority levels, and permanently forbids
// any remediation targeting hard-forbidden actions.
// Never executes remediation directly.
//
// Bộ lập kế hoạch khắc phục chính sách có quản trị (Thành phần 730).
// Tổng hợp các kế hoạch khắc phục có thể giải thích, có tính xác định từ các đề xuất quyết định đã duyệt.
// Phân loại bán kính ảnh hưởng, xác định cấp thẩm quyền cần thiết và cấm vĩnh viễn
// bất kỳ hành động khắc phục nào nhắm vào các hành động bị cấm tuyệt đối.
// Không bao giờ trực tiếp thực thi việc khắc phục.
//
// Authority Invariants:
// - PLAN != EXECUTION
// - ZERO_DIRECT_TOOL_EXECUTION
// - HARD_FORBIDDEN_IMMUTABLE: transfer_funds, delete_database, bypass_robot_interlocks, execute_untrusted_host_script
// - USER_STOP > ALL_PLANNING_OPERATIONS
// - STRICT_TENANT_ISOLATION
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export const HARD_FORBIDDEN_ACTIONS = Object.freeze([
    'transfer_funds',
    'delete_database',
    'bypass_robot_interlocks',
    'execute_untrusted_host_script',
]);
export class PolicyRemediationPlanner {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Remediation planning suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('REMEDIATION_PLANNER_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), path.resolve(process.cwd(), 'data', 'partitions'));
    }
    /**
     * Asserts that none of the proposed actions or target tools violate hard-forbidden immutability.
     * Khẳng định không có hành động hoặc công cụ mục tiêu nào vi phạm tính bất biến của hành động bị cấm tuyệt đối.
     */
    assertHardForbiddenImmutability(targetAction) {
        const normalized = targetAction.toLowerCase().trim();
        for (const forbidden of HARD_FORBIDDEN_ACTIONS) {
            if (normalized.includes(forbidden)) {
                throw new Error(`HARD_FORBIDDEN_REMEDIATION_DENIED: Action '${targetAction}' violates permanent immutable safety floor (${forbidden})`);
            }
        }
    }
    /**
     * Creates a deterministic, explainable PolicyRemediationPlan from an approved decision proposal.
     * Tạo một PolicyRemediationPlan có tính xác định, có thể giải thích từ một đề xuất quyết định đã duyệt.
     */
    createRemediationPlan(proposal) {
        // 1. Fail closed on USER_STOP
        this.assertUserStopInactive();
        // 2. Strict tenant isolation
        this.validateTenant(proposal.tenantPartition);
        // 3. Verify proposal state is valid for planning
        if (proposal.state !== 'APPROVED' && proposal.state !== 'PENDING_HUMAN_REVIEW') {
            throw new Error(`ILLEGAL_PLANNING_STATE: Cannot create remediation plan from proposal in state '${proposal.state}'`);
        }
        // 4. Assert hard-forbidden actions are not targeted
        if (proposal.rationale) {
            for (const forbidden of HARD_FORBIDDEN_ACTIONS) {
                if (proposal.rationale.includes(forbidden)) {
                    // If the rationale mentions forbidden actions in a way that attempts to allow or remediate them:
                    if (!proposal.rationale.includes('blocked') && !proposal.rationale.includes('quarantined')) {
                        this.assertHardForbiddenImmutability(forbidden);
                    }
                }
            }
        }
        // 5. Determine blast radius, proposed actions, and required role deterministically
        let blastRadius = 'TENANT_LOCAL';
        let requiredOperatorRole = 'GOVERNED_OPERATOR';
        const proposedActions = [];
        const safetyPreconditions = [
            'USER_STOP must remain inactive throughout operation',
            'Circuit breaker status verified clear',
            'Immutable hard-forbidden safety floor active',
        ];
        switch (proposal.recommendation) {
            case 'BLOCK_POLICY_CANDIDATE':
                blastRadius = 'RING_WIDE';
                requiredOperatorRole = 'MASTER_HUMAN_OPERATOR';
                proposedActions.push('Trip circuit breaker for candidate policy package');
                proposedActions.push('Demote candidate assignment to RING_0 shadow observation only');
                proposedActions.push('Record security block in canonical AuditLedger');
                safetyPreconditions.push('Verify zero active executions in flight for candidate');
                break;
            case 'ROLLBACK_TO_BASELINE':
                blastRadius = 'COHORT_CANARY';
                requiredOperatorRole = 'MASTER_HUMAN_OPERATOR';
                proposedActions.push('Dispatch rollback request to PolicyCanaryRollbackEngine');
                proposedActions.push('Restore previous active baseline policy snapshot');
                proposedActions.push('Notify tenant administrator of cohort rollback');
                safetyPreconditions.push('Verify baseline snapshot checksum matches durable store');
                break;
            case 'QUARANTINE_BROKEN_PROVENANCE':
                blastRadius = 'TENANT_LOCAL';
                requiredOperatorRole = 'MASTER_HUMAN_OPERATOR';
                proposedActions.push('Quarantine candidate package from further promotion');
                proposedActions.push('Isolate tenant partition provenance records for investigation');
                safetyPreconditions.push('Validate cryptographic provenance chain break location');
                break;
            case 'HOLD_CANARY':
                blastRadius = 'TENANT_LOCAL';
                requiredOperatorRole = 'GOVERNED_OPERATOR';
                proposedActions.push('Maintain current ring observation window');
                proposedActions.push('Prevent automated promotion evaluation until health stabilizes');
                break;
            case 'CALIBRATE_GUARDRAIL':
                blastRadius = 'TENANT_LOCAL';
                requiredOperatorRole = 'GOVERNED_OPERATOR';
                proposedActions.push('Adjust non-safety guardrail thresholds (timeout, retry delay)');
                proposedActions.push('Validate calibrated policy via counterfactual simulation');
                safetyPreconditions.push('Verify calibration does not touch hard-forbidden actions');
                break;
            case 'ISOLATE_TENANT_COHORT':
                blastRadius = 'COHORT_CANARY';
                requiredOperatorRole = 'MASTER_HUMAN_OPERATOR';
                proposedActions.push('Detach canary cohort routing for target tenant');
                proposedActions.push('Direct 100% traffic to verified baseline policy');
                break;
            case 'RESET_STALE_CANDIDATE':
                blastRadius = 'TENANT_LOCAL';
                requiredOperatorRole = 'GOVERNED_OPERATOR';
                proposedActions.push('Evict stale canary candidate from live memory');
                proposedActions.push('Reinitialize candidate in STAGED status');
                break;
            case 'PROCEED_TO_NEXT_RING_REVIEW':
                blastRadius = 'GLOBAL';
                requiredOperatorRole = 'MASTER_HUMAN_OPERATOR';
                proposedActions.push('Prepare promotion request for next ring (requires separate operator token)');
                proposedActions.push('Verify unbroken provenance chain before ring promotion');
                safetyPreconditions.push('Verify health monitor status is HEALTHY');
                break;
        }
        const planId = `plan_${Date.now()}_${proposal.proposalId}`;
        const explainableSummary = `Remediation plan '${planId}' for proposal '${proposal.proposalId}' (type: ${proposal.recommendation}, blast radius: ${blastRadius}). Requires ${requiredOperatorRole} authority. Actions: ${proposedActions.join('; ')}.`;
        return Object.freeze({
            planId,
            proposalId: proposal.proposalId,
            tenantPartition: proposal.tenantPartition,
            candidateId: proposal.candidateId,
            remediationType: proposal.recommendation,
            blastRadius,
            requiredOperatorRole,
            proposedActions: Object.freeze(proposedActions),
            safetyPreconditions: Object.freeze(safetyPreconditions),
            plannedAt: new Date().toISOString(),
            explainableSummary,
        });
    }
}
export const globalPolicyRemediationPlanner = new PolicyRemediationPlanner();
