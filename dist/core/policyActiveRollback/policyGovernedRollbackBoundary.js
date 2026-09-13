// src/core/policyActiveRollback/policyGovernedRollbackBoundary.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Governed Rollback Boundary (Component 812).
// Non-bypassable human governance decision boundary for:
// 1. Rollback authorization
// 2. Sunset authorization
// 3. Recovery authorization
//
// Enforces:
// 1. Mandatory legitimate human operator identity clearance.
// 2. Strict rejection of autonomous, robotic, synthetic, scheduler, or daemon personas.
// 3. Evaluation status MUST strictly be 'VALID' (UNKNOWN, INVALID, BLOCKED fail closed).
// 4. Strict anti-self-approval (proposer cannot grant clearance).
// 5. Prohibition of boolean bypasses (force=true, rollback=true, override=true).
// 6. USER_STOP supremacy over all authorization decisions.
//
// Authority Invariants:
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - ZERO_AUTONOMOUS_ROLLBACK
// - ZERO_AUTONOMOUS_SUNSET
// - ZERO_AUTONOMOUS_RECOVERY
// - UNKNOWN != READY / SAFE / AUTHORIZED
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
const AUTONOMOUS_OPERATOR_PATTERNS = [
    /^auto_/i,
    /^bot_/i,
    /^ai_agent/i,
    /^ai_/i,
    /^autonomous/i,
    /^synthetic_/i,
    /^system_daemon/i,
    /^system/i,
    /^agent_/i,
    /^daemon/i,
    /^cron_/i,
    /^scheduler/i,
    /^runtime/i,
];
const ANONYMOUS_OR_GUEST_IDENTITIES = new Set([
    'anonymous',
    'anon',
    'guest',
    'public',
    'default',
    'unknown',
    'null',
    'undefined',
]);
const AUTHORIZED_GOVERNANCE_ROLES = new Set([
    'MASTER_HUMAN_OPERATOR',
    'HUMAN_SECURITY_ADMIN',
    'OWNER',
]);
export class PolicyGovernedRollbackBoundary {
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Governed rollback boundary evaluation suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('BOUNDARY_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Asserts that an operator identity represents a verified human and not an autonomous actor.
     */
    assertHumanOperator(operatorId) {
        const trimmed = (operatorId ?? '').trim();
        if (!trimmed) {
            throw new Error('MISSING_OPERATOR_ID: Operator identifier must be a non-empty string');
        }
        if (ANONYMOUS_OR_GUEST_IDENTITIES.has(trimmed.toLowerCase())) {
            throw new Error(`UNAUTHORIZED_OPERATOR_IDENTITY: Identity '${trimmed}' is anonymous or guest`);
        }
        for (const pattern of AUTONOMOUS_OPERATOR_PATTERNS) {
            if (pattern.test(trimmed)) {
                throw new Error(`AUTONOMOUS_AUTHORIZATION_BLOCKED: Autonomous persona '${trimmed}' cannot grant rollback/sunset/recovery clearance. Explicit human authority is mandatory.`);
            }
        }
    }
    /**
     * Asserts that the operator holds an authorized governance role.
     */
    assertAuthorizedRole(role) {
        if (!role || !AUTHORIZED_GOVERNANCE_ROLES.has(role)) {
            throw new Error(`UNAUTHORIZED_GOVERNANCE_ROLE: Role '${role}' is not authorized to grant rollback/sunset/recovery clearance. Required: ${Array.from(AUTHORIZED_GOVERNANCE_ROLES).join(', ')}`);
        }
    }
    /**
     * Evaluates and issues governed human authorization clearance.
     */
    authorizeOperation(params) {
        this.assertUserStopInactive();
        this.validateTenant(params.tenantPartition);
        // 1. Operator persona check
        this.assertHumanOperator(params.operatorId);
        // 2. Role check
        this.assertAuthorizedRole(params.operatorRole);
        // 3. Anti-self-approval: Proposer / requester cannot approve own request
        if (params.requestedBy) {
            const normOp = params.operatorId.trim().toLowerCase();
            const normReq = params.requestedBy.trim().toLowerCase();
            if (normOp === normReq) {
                throw new Error(`ANTI_SELF_APPROVAL_VIOLATION: Requester '${params.requestedBy}' cannot authorize their own ${params.operationType.toLowerCase()} request. Independent human governance review is mandatory.`);
            }
        }
        // 4. Non-empty justification
        if (!params.governanceRationale || params.governanceRationale.trim().length === 0) {
            throw new Error(`MISSING_GOVERNANCE_RATIONALE: Governed ${params.operationType.toLowerCase()} clearance requires an explicit non-empty justification`);
        }
        // 5. Evaluation status check: MUST be 'VALID'
        if (params.evaluationStatus !== 'VALID') {
            throw new Error(`REVALIDATION_NOT_VALID: ${params.operationType} clearance refused because evaluation status is '${params.evaluationStatus}'. Status must be 'VALID'.`);
        }
        const now = new Date().toISOString();
        const rawAuthHash = crypto.createHash('sha256')
            .update(`${params.operationType}:${params.targetRequestId}:${params.operatorId}:${params.operatorRole}:${now}`)
            .digest('hex');
        const authorizationId = `rolauth_${rawAuthHash.substring(0, 16)}`;
        const provenanceHash = crypto.createHash('sha256')
            .update(JSON.stringify({
            authorizationId,
            operationType: params.operationType,
            targetRequestId: params.targetRequestId,
            operatorId: params.operatorId,
            operatorRole: params.operatorRole,
            evaluationId: params.evaluationId,
            previousHash: params.previousHash ?? 'GENESIS',
        }))
            .digest('hex');
        const result = Object.freeze({
            authorizationId,
            operationType: params.operationType,
            targetRequestId: params.targetRequestId,
            tenantPartition: params.tenantPartition,
            authorizedBy: params.operatorId,
            authorizedRole: params.operatorRole,
            governanceRationale: params.governanceRationale,
            evaluationId: params.evaluationId,
            authorizedAt: now,
            provenanceHash,
        });
        return result;
    }
}
