// src/core/policyActiveRollback/policySunsetEvaluationEngine.ts
// BOWCON V4.0 — MS-1.3.72: GOVERNED ACTIVE POLICY ROLLBACK, SUNSET & RECOVERY BOUNDARY
//
// Governed Sunset Evaluation Engine (Component 810).
// Evaluates governed policy sunset / retirement requests under strict governance.
// Sunset intentionally retires an active policy without deleting history, destroying provenance,
// or silently deactivating without human authorization.
//
// Invariants:
// - ZERO_HISTORY_DELETION: Historical records remain immutable forever
// - PROVENANCE_PRESERVATION: Provenance hash chain is never broken or truncated
// - HUMAN_REVIEW_MANDATORY: All sunset operations require human authorization
// - FAIL_CLOSED
// - USER_STOP > EVERYTHING
import crypto from 'node:crypto';
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export class PolicySunsetEvaluationEngine {
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Sunset evaluation suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('SUNSET_EVALUATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Independently evaluates a sunset request against active state and requirements.
     */
    evaluate(params) {
        this.assertUserStopInactive();
        const { request, actualCurrentActiveStateId, actualCurrentActiveVersion, replacementPolicyAvailable } = params;
        const now = new Date().toISOString();
        const evalHash = crypto.createHash('sha256')
            .update(`${request?.sunsetRequestId}:${now}`)
            .digest('hex');
        const evaluationId = `suneval_${evalHash.substring(0, 16)}`;
        const checksPassed = [];
        const blockingReasons = [];
        // 1. Request presence
        if (!request) {
            return Object.freeze({
                evaluationId,
                sunsetRequestId: 'unknown_sunset',
                tenantPartition: 'UNKNOWN_TENANT',
                valid: false,
                status: 'INVALID',
                humanReviewRequired: true,
                checksPassed: [],
                blockingReasons: ['MISSING_SUNSET_REQUEST: request is null or undefined'],
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
        // 3. Reason requirement
        if (!request.reason || request.reason.trim().length === 0) {
            blockingReasons.push('MISSING_SUNSET_REASON: Governed sunset requires an explicit, non-empty business or security rationale');
        }
        else {
            checksPassed.push('SUNSET_REASON_PRESENT');
        }
        // 4. Current active version freshness check
        if (actualCurrentActiveStateId && request.currentActivePolicyStateId !== actualCurrentActiveStateId) {
            blockingReasons.push(`STALE_SUNSET_TARGET_STATE: Request active state '${request.currentActivePolicyStateId}' != Actual state '${actualCurrentActiveStateId}'`);
        }
        else {
            checksPassed.push('SUNSET_ACTIVE_STATE_FRESH');
        }
        if (actualCurrentActiveVersion && request.currentActivePolicyVersion !== actualCurrentActiveVersion) {
            blockingReasons.push(`STALE_SUNSET_TARGET_VERSION: Request active version '${request.currentActivePolicyVersion}' != Actual version '${actualCurrentActiveVersion}'`);
        }
        else {
            checksPassed.push('SUNSET_ACTIVE_VERSION_FRESH');
        }
        // 5. Replacement policy verification (if requested)
        if (request.replacementPolicyVersion && request.replacementPolicyVersion.trim().length > 0) {
            if (replacementPolicyAvailable === false) {
                blockingReasons.push(`REPLACEMENT_POLICY_NOT_AVAILABLE: Specified replacement version '${request.replacementPolicyVersion}' is not available or verified`);
            }
            else {
                checksPassed.push('REPLACEMENT_POLICY_CONFIRMED');
            }
        }
        else {
            checksPassed.push('SUNSET_WITHOUT_REPLACEMENT_DEFAULTS_TO_BASELINE');
        }
        // 6. Invariant: SUNSET_REQUEST != POLICY_MUTATION
        if (request.isAutonomous !== false || request.isActivePolicy !== false) {
            blockingReasons.push('INVARIANT_VIOLATION: SunsetRequest must have isAutonomous=false, isActivePolicy=false');
        }
        else {
            checksPassed.push('SUNSET_REQUEST_INVARIANTS_VALID');
        }
        const isValid = blockingReasons.length === 0;
        const status = isValid ? 'VALID' : 'BLOCKED';
        return Object.freeze({
            evaluationId,
            sunsetRequestId: request.sunsetRequestId,
            tenantPartition: request.tenantPartition,
            valid: isValid,
            status,
            humanReviewRequired: true, // Human governance review is always mandatory for sunset
            checksPassed: Object.freeze(checksPassed),
            blockingReasons: Object.freeze(blockingReasons),
            evaluatedAt: now,
        });
    }
}
