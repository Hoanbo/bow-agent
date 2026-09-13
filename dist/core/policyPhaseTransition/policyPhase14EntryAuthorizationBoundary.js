// src/core/policyPhaseTransition/policyPhase14EntryAuthorizationBoundary.ts
// BOWCON V4.0 — MS-1.3.77: GOVERNED PHASE EXIT AUTHORIZATION, TRANSITION & PHASE 1.4 ENTRY BOUNDARY
//
// Phase 1.4 Entry Authorization Boundary (Component 877).
// Establishes the separate, non-bypassable Human Authorization Boundary for entering Phase 1.4.
// Enforces:
// 1. Mandatory legitimate human identity verification.
// 2. Strict rejection of autonomous, robotic, synthetic, scheduler, or daemon personas.
// 3. Mandatory human role authorization (MASTER_HUMAN_OPERATOR, HUMAN_SECURITY_ADMIN, OWNER).
// 4. Strict anti-self-approval (requester cannot self-authorize entry).
// 5. Anti-replay and deterministic fingerprinting.
// 6. USER_STOP supremacy over all authorization operations.
//
// Authority Invariants:
// - HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// - ANTI_SELF_APPROVAL
// - AUTONOMOUS_PHASE_1_4_ENTRY = FORBIDDEN
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import * as crypto from 'crypto';
import { createPhase14EntryAuthorizationId, } from './policyPhaseTransitionTypes.js';
const AUTONOMOUS_ACTOR_PATTERNS = [
    /^auto_/i,
    /^bot_/i,
    /^ai_agent/i,
    /^ai_/i,
    /^autonomous/i,
    /^synthetic_/i,
    /^system_daemon/i,
    /^system_auto/i,
    /^system/i,
    /^agent_/i,
    /^daemon/i,
    /^cron_/i,
    /^scheduler/i,
    /^service_/i,
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
const AUTHORIZED_HUMAN_ROLES = new Set([
    'MASTER_HUMAN_OPERATOR',
    'HUMAN_SECURITY_ADMIN',
    'OWNER',
]);
export class PolicyPhase14EntryAuthorizationBoundary {
    consumedFingerprints = new Set();
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Phase 1.4 entry authorization gate suspended by USER_STOP supremacy');
        }
    }
    /**
     * Evaluates separate human authorization for entering Phase 1.4.
     */
    authorizePhase14Entry(readiness, request) {
        this.assertUserStopInactive();
        if (!readiness || !readiness.readinessId) {
            throw new Error('INVALID_READINESS: Phase 1.4 entry readiness record is required');
        }
        if (!request || !request.readinessId) {
            throw new Error('INVALID_REQUEST: Phase 1.4 entry authorization request is required');
        }
        // 1. Cross-readiness binding check
        if (readiness.readinessId !== request.readinessId) {
            throw new Error(`BINDING_MISMATCH: Readiness ID '${readiness.readinessId}' does not match request '${request.readinessId}'`);
        }
        // 2. Cross-tenant isolation check
        if (readiness.tenantId !== request.tenantId) {
            throw new Error(`CROSS_TENANT_ACCESS_REJECTED: Readiness tenant '${readiness.tenantId}' does not match request tenant '${request.tenantId}'`);
        }
        // 3. Verify readiness status
        if (readiness.status !== 'PHASE_1_4_ENTRY_READY' || !readiness.prerequisitesSatisfied) {
            throw new Error(`ENTRY_NOT_READY: Cannot authorize Phase 1.4 entry when readiness status is '${readiness.status}'`);
        }
        const authorizedBy = (request.authorizedBy ?? '').trim();
        if (authorizedBy.length === 0) {
            throw new Error('AUTHORIZATION_SECURITY_VIOLATION: authorizedBy operatorId must be a non-empty string');
        }
        // 4. Reject anonymous and guest actors
        if (ANONYMOUS_OR_GUEST_IDENTITIES.has(authorizedBy.toLowerCase())) {
            throw new Error(`ANONYMOUS_AUTHORIZATION_REJECTED: Persona '${authorizedBy}' is not permitted to authorize phase transitions`);
        }
        // 5. Reject autonomous actors
        for (const pattern of AUTONOMOUS_ACTOR_PATTERNS) {
            if (pattern.test(authorizedBy)) {
                throw new Error(`AUTONOMOUS_AUTHORIZATION_REJECTED: Autonomous actor pattern '${authorizedBy}' is strictly forbidden from authorizing phase transitions`);
            }
        }
        // 6. Verify legitimate human role
        if (!AUTHORIZED_HUMAN_ROLES.has(request.operatorRole)) {
            throw new Error(`UNAUTHORIZED_ROLE: Role '${request.operatorRole}' is not an authorized human governance role`);
        }
        // 7. Anti-Self-Approval
        const requester = (request.requestedBy ?? '').trim();
        if (requester.length > 0 && authorizedBy.toLowerCase() === requester.toLowerCase()) {
            throw new Error(`SELF_APPROVAL_VIOLATION: Operator '${authorizedBy}' initiated Phase 1.4 entry authorization request and cannot approve it`);
        }
        // 8. Mandatory substantive rationale
        const rationale = (request.rationale ?? '').trim();
        if (rationale.length < 10) {
            throw new Error('INVALID_RATIONALE: Substantive authorization rationale of at least 10 characters is required');
        }
        // 9. Fingerprint and anti-replay verification
        const fingerprintPayload = `phase_14:${request.tenantId}:${readiness.readinessId}:${authorizedBy}:${request.operatorRole}:${request.decision}`;
        const fingerprint = crypto.createHash('sha256').update(fingerprintPayload).digest('hex');
        if (this.consumedFingerprints.has(fingerprint)) {
            throw new Error(`REPLAY_REJECTED: Authorization for Phase 1.4 entry '${readiness.readinessId}' with decision '${request.decision}' has already been processed`);
        }
        this.consumedFingerprints.add(fingerprint);
        const authorizationId = createPhase14EntryAuthorizationId(`auth_14_${request.tenantId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`);
        const authorizedAt = request.timestamp ?? new Date().toISOString();
        return Object.freeze({
            authorizationId,
            readinessId: readiness.readinessId,
            tenantId: request.tenantId,
            requestedBy: requester || 'governance_controller',
            authorizedBy,
            operatorRole: request.operatorRole,
            rationale,
            decision: request.decision === 'AUTHORIZE' ? 'AUTHORIZED' : 'REJECTED',
            authorizedAt,
            fingerprint,
        });
    }
}
