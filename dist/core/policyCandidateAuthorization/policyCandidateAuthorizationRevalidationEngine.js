// src/core/policyCandidateAuthorization/policyCandidateAuthorizationRevalidationEngine.ts
// BOWCON V4.0 — MS-1.3.69: GOVERNED CANDIDATE AUTHORIZATION & ACTIVATION READINESS LAYER
//
// Governed Candidate Authorization Revalidation Engine (Component 777).
// Independently revalidates candidate drafts and authorization requests prior to human authorization.
// Verifies schemas, tenant isolation, validation results, constraints, freshness (TTL),
// supersession, contradictory evidence, and permanent hard-forbidden boundaries.
//
// Authority Invariants:
// - LEVEL_0_INSPECTION: Independent revalidation only; grants zero authority
// - FAIL_CLOSED: Invalid, blocked, expired, superseded, or contradictory candidates fail closed
// - STRICT_TENANT_ISOLATION: Resolved via resolveUserPartition
// - NEVER_REPAIR_INVALID_EVIDENCE: Bad inputs are never silently repaired
// - USER_STOP > EVERYTHING
import path from 'node:path';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
export const CANDIDATE_AUTHORIZATION_HARD_FORBIDDEN = [
    'transfer_funds',
    'delete_database',
    'bypass_robot_interlocks',
    'execute_untrusted_host_script',
];
export class PolicyCandidateAuthorizationRevalidationEngine {
    baseDir;
    isUserStopActiveFn;
    constructor(options) {
        this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Candidate authorization revalidation suspended by USER_STOP supremacy');
        }
    }
    validateTenant(tenantPartition) {
        if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
            throw new Error('REVALIDATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
        }
        resolveUserPartition(tenantPartition.trim(), this.baseDir);
    }
    /**
     * Independently revalidates a candidate authorization request.
     */
    revalidateCandidateForAuthorization(request) {
        this.assertUserStopInactive();
        const issues = [];
        // 1. Basic request integrity
        if (!request || !request.requestId || typeof request.requestId !== 'string' || request.requestId.trim().length === 0) {
            return Object.freeze({
                valid: false,
                candidateDraftId: (request?.candidateDraftId ?? 'UNKNOWN_DRAFT'),
                status: 'INVALID',
                tenantPartition: request?.tenantPartition ?? 'UNKNOWN_TENANT',
                issues: ['INVALID_REQUEST_PAYLOAD: Missing or malformed requestId'],
                revalidatedAt: new Date().toISOString(),
            });
        }
        // 2. Strict tenant isolation
        try {
            this.validateTenant(request.tenantPartition);
        }
        catch (err) {
            return Object.freeze({
                valid: false,
                candidateDraftId: request.candidateDraftId,
                status: 'BLOCKED',
                tenantPartition: request.tenantPartition,
                issues: [`TENANT_ISOLATION_FAILURE: ${err.message}`],
                revalidatedAt: new Date().toISOString(),
            });
        }
        // 3. Draft existence and format
        const draft = request.candidateDraft;
        if (!draft || !draft.candidateDraftId || typeof draft.candidateDraftId !== 'string') {
            issues.push('MISSING_CANDIDATE_DRAFT: Candidate authorization request lacks candidateDraft payload');
        }
        // 4. Linkage integrity
        if (draft) {
            if (request.candidateDraftId !== draft.candidateDraftId) {
                issues.push(`LINKAGE_MISMATCH: Request candidateDraftId '${request.candidateDraftId}' does not match draft '${draft.candidateDraftId}'`);
            }
            if (request.evolutionPlanId !== draft.evolutionPlanId) {
                issues.push(`LINKAGE_MISMATCH: Request evolutionPlanId '${request.evolutionPlanId}' does not match draft '${draft.evolutionPlanId}'`);
            }
            if (request.intakeId !== draft.intakeId) {
                issues.push(`LINKAGE_MISMATCH: Request intakeId '${request.intakeId}' does not match draft '${draft.intakeId}'`);
            }
            if (request.tenantPartition !== draft.tenantPartition) {
                issues.push(`LINKAGE_MISMATCH: Request tenantPartition '${request.tenantPartition}' does not match draft '${draft.tenantPartition}'`);
            }
        }
        // 5. Validation result re-check
        const validation = request.candidateValidation;
        if (!validation) {
            issues.push('MISSING_CANDIDATE_VALIDATION: Request lacks independent candidateValidation result');
        }
        else {
            if (validation.candidateDraftId !== request.candidateDraftId) {
                issues.push(`VALIDATION_LINKAGE_MISMATCH: Validation candidateDraftId '${validation.candidateDraftId}' does not match request`);
            }
            if (!validation.valid || validation.status !== 'VALID') {
                issues.push(`CANDIDATE_VALIDATION_NOT_VALID: Candidate validation status is '${validation.status}', valid=${validation.valid}`);
            }
            // Check for contradictory evidence: validation claimed valid: true but has reported issues
            if (validation.valid && Array.isArray(validation.issues) && validation.issues.length > 0) {
                return Object.freeze({
                    valid: false,
                    candidateDraftId: request.candidateDraftId,
                    status: 'CONTRADICTORY',
                    tenantPartition: request.tenantPartition,
                    issues: ['CONTRADICTORY_EVIDENCE: Validation claims valid=true but contains blocking issues: ' + validation.issues.join('; ')],
                    revalidatedAt: new Date().toISOString(),
                });
            }
        }
        // 6. Non-mutation invariants
        if (draft) {
            if (draft.isActivePolicy !== false) {
                issues.push('ACTIVE_POLICY_LEAKAGE: Candidate draft isActivePolicy must strictly be false');
            }
            if (draft.isPolicyMutation !== false) {
                issues.push('POLICY_MUTATION_LEAKAGE: Candidate draft isPolicyMutation must strictly be false');
            }
            if (draft.isAutonomousMutation !== false) {
                issues.push('AUTONOMOUS_MUTATION_LEAKAGE: Candidate draft isAutonomousMutation must strictly be false');
            }
        }
        // 7. Hard-forbidden actions check
        if (draft) {
            const serializedChanges = JSON.stringify(draft.proposedChanges ?? {});
            const lowerSerialized = (serializedChanges + ' ' + (draft.rationale ?? '')).toLowerCase();
            for (const forbidden of CANDIDATE_AUTHORIZATION_HARD_FORBIDDEN) {
                if (lowerSerialized.includes(forbidden.toLowerCase())) {
                    return Object.freeze({
                        valid: false,
                        candidateDraftId: request.candidateDraftId,
                        status: 'BLOCKED',
                        tenantPartition: request.tenantPartition,
                        issues: [`HARD_FORBIDDEN_ACTION_DETECTED: Candidate draft invokes forbidden action '${forbidden}'`],
                        revalidatedAt: new Date().toISOString(),
                    });
                }
            }
        }
        // 8. Freshness / TTL check
        if (request.expiresAt) {
            const expiresTime = Date.parse(request.expiresAt);
            if (Number.isNaN(expiresTime)) {
                issues.push(`MALFORMED_EXPIRATION: expiresAt '${request.expiresAt}' is not a valid ISO date`);
            }
            else if (Date.now() > expiresTime) {
                return Object.freeze({
                    valid: false,
                    candidateDraftId: request.candidateDraftId,
                    status: 'EXPIRED',
                    tenantPartition: request.tenantPartition,
                    issues: [`CANDIDATE_EXPIRED: Authorization request expired at ${request.expiresAt}`],
                    revalidatedAt: new Date().toISOString(),
                });
            }
        }
        else {
            issues.push('MISSING_EXPIRATION: Authorization request must specify an expiresAt timestamp');
        }
        // 9. Supersession check
        if (request.supersededBy && request.supersededBy.trim().length > 0) {
            return Object.freeze({
                valid: false,
                candidateDraftId: request.candidateDraftId,
                status: 'SUPERSEDED',
                tenantPartition: request.tenantPartition,
                issues: [`CANDIDATE_SUPERSEDED: Candidate draft was superseded by '${request.supersededBy}'`],
                revalidatedAt: new Date().toISOString(),
            });
        }
        // 10. Provenance head hash validity
        if (!request.provenanceHeadHash || typeof request.provenanceHeadHash !== 'string' || !/^[a-f0-9]{64}$/i.test(request.provenanceHeadHash)) {
            issues.push('INVALID_PROVENANCE_HEAD: Authorization request lacks a valid 64-char hex SHA-256 provenanceHeadHash');
        }
        // Determine final status
        if (issues.length > 0) {
            return Object.freeze({
                valid: false,
                candidateDraftId: request.candidateDraftId,
                status: 'INVALID',
                tenantPartition: request.tenantPartition,
                issues: Object.freeze(issues),
                revalidatedAt: new Date().toISOString(),
            });
        }
        return Object.freeze({
            valid: true,
            candidateDraftId: request.candidateDraftId,
            status: 'VALID',
            tenantPartition: request.tenantPartition,
            issues: Object.freeze([]),
            revalidatedAt: new Date().toISOString(),
        });
    }
}
