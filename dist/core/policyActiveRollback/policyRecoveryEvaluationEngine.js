// src/core/policyActiveRollback/policyRecoveryEvaluationEngine.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Governed Recovery Evaluation Engine (Component 811).
// Evaluates governed policy recovery after a rollback, sunset, or emergency deactivation.
// Revalidates historical recovery targets, integrity, provenance, and hard-forbidden floor.
//
// Invariants:
// - RECOVERY_REQUEST != AUTONOMOUS_RECOVERY
// - ZERO_DIRECT_RUNTIME_MUTATION: Recovery produces governed recovery records, never directly mutates runtime
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - HARD_FORBIDDEN_PROTECTION: Hard-forbidden action floor cannot be downgraded
// - FAIL_CLOSED
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import path from 'node:path';
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from './policyActiveRollbackTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicyRecoveryEvaluationEngine {
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Recovery evaluation suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('RECOVERY_EVALUATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Independently evaluates a recovery request against a candidate recovery target.
     */
    evaluate(params) {
        this.assertUserStopInactive();
        const { request, target, currentActiveVersion } = params;
        const now = new Date().toISOString();
        const evalHash = crypto.createHash('sha256')
            .update(`${request?.recoveryRequestId}:${target?.targetId}:${now}`)
            .digest('hex');
        const evaluationId = `receval_${evalHash.substring(0, 16)}`;
        const checksPassed = [];
        const blockingReasons = [];
        // 1. Request & target presence
        if (!request) {
            return Object.freeze({
                evaluationId,
                recoveryRequestId: 'unknown_recovery',
                tenantPartition: 'UNKNOWN_TENANT',
                recoveryTargetVersion: 'UNKNOWN',
                targetId: 'unknown_target',
                valid: false,
                status: 'INVALID',
                checksPassed: [],
                blockingReasons: ['MISSING_RECOVERY_REQUEST: request is null or undefined'],
                evaluatedAt: now,
            });
        }
        if (!target) {
            return Object.freeze({
                evaluationId,
                recoveryRequestId: request.recoveryRequestId,
                tenantPartition: request.tenantPartition,
                recoveryTargetVersion: request.recoveryTargetVersion,
                targetId: 'unknown_target',
                valid: false,
                status: 'INVALID',
                checksPassed: [],
                blockingReasons: ['MISSING_RECOVERY_TARGET: target historical policy is null or undefined'],
                evaluatedAt: now,
            });
        }
        // 2. Strict tenant isolation
        try {
            this.validateTenant(request.tenantPartition);
            checksPassed.push('TENANT_ISOLATION_VERIFIED');
        }
        catch (err) {
            blockingReasons.push(`TENANT_ISOLATION_FAILURE: ${err.message}`);
        }
        // 3. Cross-tenant linkage
        if (request.tenantPartition !== target.tenantPartition) {
            blockingReasons.push(`CROSS_TENANT_LINKAGE_MISMATCH: Request tenant '${request.tenantPartition}' != Target tenant '${target.tenantPartition}'`);
        }
        else {
            checksPassed.push('TENANT_LINKAGE_MATCH');
        }
        // 4. Target identifier linkage
        if (request.targetId !== target.targetId) {
            blockingReasons.push(`TARGET_ID_MISMATCH: Request targetId '${request.targetId}' != Target object '${target.targetId}'`);
        }
        else {
            checksPassed.push('TARGET_ID_MATCH');
        }
        if (request.recoveryTargetVersion !== target.policyVersion) {
            blockingReasons.push(`TARGET_VERSION_MISMATCH: Request version '${request.recoveryTargetVersion}' != Target object '${target.policyVersion}'`);
        }
        else {
            checksPassed.push('TARGET_VERSION_MATCH');
        }
        // 5. Verification status of target
        if (!target.verified) {
            blockingReasons.push(`TARGET_NOT_VERIFIED: Historical target '${target.policyVersion}' is not verified`);
        }
        else {
            checksPassed.push('TARGET_VERIFIED');
        }
        if (!target.provenanceHeadHash || target.provenanceHeadHash.trim().length === 0) {
            blockingReasons.push('MISSING_TARGET_PROVENANCE: Target lacks valid provenanceHeadHash');
        }
        else {
            checksPassed.push('TARGET_PROVENANCE_PRESENT');
        }
        // 6. Active version conflict check (cannot recover to a version that is already active)
        if (currentActiveVersion && currentActiveVersion === target.policyVersion) {
            blockingReasons.push(`RECOVERY_TARGET_ALREADY_ACTIVE: Recovery target version '${target.policyVersion}' is already the currently active version`);
        }
        else {
            checksPassed.push('RECOVERY_TARGET_NOT_CURRENTLY_ACTIVE');
        }
        // 7. Hard-forbidden actions floor check
        const serialized = JSON.stringify(target.policyModifications ?? {}).toLowerCase();
        for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
            const explicitClass = target.policyModifications?.[forbidden] ??
                target.policyModifications?.actionClassifications?.[forbidden];
            if (explicitClass && explicitClass !== 'FORBIDDEN') {
                blockingReasons.push(`HARD_FORBIDDEN_DOWNGRADE: Target modifies '${forbidden}' to '${explicitClass}'`);
            }
            if (serialized.includes(`"${forbidden}":"permit"`) || serialized.includes(`"${forbidden}":"allowed"`)) {
                blockingReasons.push(`HARD_FORBIDDEN_DOWNGRADE: Target grants permission to '${forbidden}'`);
            }
        }
        if (!blockingReasons.some(r => r.includes('HARD_FORBIDDEN'))) {
            checksPassed.push('HARD_FORBIDDEN_FLOOR_INTACT');
        }
        // 8. Invariant checks
        if (request.isAutonomous !== false || request.isActivePolicy !== false) {
            blockingReasons.push('INVARIANT_VIOLATION: RecoveryRequest must have isAutonomous=false, isActivePolicy=false');
        }
        else {
            checksPassed.push('RECOVERY_REQUEST_INVARIANTS_VALID');
        }
        const isValid = blockingReasons.length === 0;
        const status = isValid ? 'VALID' : 'BLOCKED';
        return Object.freeze({
            evaluationId,
            recoveryRequestId: request.recoveryRequestId,
            tenantPartition: request.tenantPartition,
            recoveryTargetVersion: request.recoveryTargetVersion,
            targetId: target.targetId,
            valid: isValid,
            status,
            checksPassed: Object.freeze(checksPassed),
            blockingReasons: Object.freeze(blockingReasons),
            evaluatedAt: now,
        });
    }
}
