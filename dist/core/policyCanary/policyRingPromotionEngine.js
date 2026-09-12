// src/core/policyCanary/policyRingPromotionEngine.ts
// BOWCON V4.0 — MS-1.3.60: GOVERNED REAL-TIME POLICY CANARY VERIFICATION & MULTI-RING ROLLOUT PIPELINE
//
// Governed Policy Ring Promotion Engine.
// Enforces progressive, ring-by-ring promotion (STAGED -> Ring 0 -> Ring 1 -> Ring 2 -> Ring 3 -> Ring 4).
// Every promotion transition strictly requires healthy canary evidence AND consumption of an explicit
// Master Human Operator authorization token.
//
// Động cơ thăng hạng vòng chính sách có quản trị.
// Thực thi việc thăng hạng lũy tiến từng vòng (STAGED -> Vòng 0 -> Vòng 1 -> Vòng 2 -> Vòng 3 -> Vòng 4).
// Mọi bước chuyển tiếp thăng hạng đều yêu cầu nghiêm ngặt bằng chứng canary khỏe mạnh VÀ việc tiêu thụ
// mã ủy quyền rõ ràng của Người Vận Hành Chủ là con người.
//
// Authority Invariants:
// - ZERO_AUTONOMOUS_PROMOTION: Positive health scores alone CANNOT promote a candidate.
// - ZERO_AUTONOMOUS_TOKEN_ISSUANCE: Never calls issueToken() or generates tokens.
// - ZERO_AUTONOMOUS_APPROVAL: Never calls grantApproval() or approve().
// - NO_RING_SKIPPING: Transitions must follow strictly sequential ring hierarchy.
// - HARD_FORBIDDEN_IMMUTABILITY: Promotion blocked if any hard-forbidden action is downgraded.
import crypto from 'node:crypto';
import { CANONICAL_HARD_FORBIDDEN_ACTIONS } from '../policyEnforcement/policyEnforcementTypes.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
import { globalPolicyCanaryRecoveryEngine } from './policyCanaryRecoveryEngine.js';
import { globalAuditLedger } from '../auditLedger.js';
export class PolicyRingPromotionEngine {
    authEngine;
    isUserStopActiveFn;
    recoveryEngine;
    constructor(options) {
        this.authEngine = options?.authEngine ?? globalWorldActionAuth;
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.recoveryEngine = options?.recoveryEngine ?? globalPolicyCanaryRecoveryEngine;
    }
    /**
     * Promotes a candidate policy package to the next ring.
     * Consumes human operator authorization token atomically.
     *
     * Thăng hạng một gói chính sách ứng viên lên vòng tiếp theo.
     * Tiêu thụ mã ủy quyền của người vận hành là con người theo cơ chế nguyên tử.
     */
    promote(candidate, request) {
        // 1. Enforce USER_STOP supremacy
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Cannot promote policy candidate during emergency stop.');
        }
        // 2. Enforce Non-Autonomous Operator Requirement
        if (!request.operatorUserId ||
            request.operatorUserId === 'anonymous' ||
            request.operatorUserId.includes('autonomous') ||
            request.operatorUserId.includes('agent_')) {
            throw new Error('SECURITY_INVARIANT_VIOLATION: Autonomous or anonymous policy promotion is strictly prohibited.');
        }
        // 3. Enforce Sequential Ring Transitions (No Ring Skipping)
        const expectedTransition = this.getExpectedNextRing(candidate.state, candidate.currentRing);
        if (request.targetRing !== expectedTransition) {
            throw new Error(`INVALID_RING_TRANSITION: Cannot promote from '${candidate.currentRing}' (${candidate.state}) directly to '${request.targetRing}'. Expected next ring: '${expectedTransition}'.`);
        }
        // 4. Validate Health Evidence
        const evidence = request.healthEvidence;
        if (!evidence || evidence.health !== 'HEALTHY') {
            throw new Error(`HEALTH_EVIDENCE_REJECTED: Cannot promote candidate '${candidate.candidateId}'. Health is '${evidence?.health ?? 'UNKNOWN'}' (must be HEALTHY).`);
        }
        if (!evidence.metrics || evidence.metrics.totalEvaluations < 1) {
            throw new Error(`INSUFFICIENT_EVIDENCE: Cannot promote candidate '${candidate.candidateId}' without verified evaluation metrics.`);
        }
        if (evidence.candidateId !== candidate.candidateId) {
            throw new Error(`EVIDENCE_MISMATCH: Health evidence candidateId '${evidence.candidateId}' does not match candidate '${candidate.candidateId}'.`);
        }
        if (evidence.circuitBreakerRecommended) {
            throw new Error('PROMOTION_BLOCKED: Health evidence recommends circuit breaker activation.');
        }
        // 5. Atomic Consumption of Authorization Token & Replay Prevention
        if (!request.authorizationToken || request.authorizationToken.trim().length === 0) {
            throw new Error('MISSING_AUTHORIZATION_TOKEN: Ring promotion requires explicit human authorization token.');
        }
        if (this.recoveryEngine.isTokenAlreadyConsumed(request.authorizationToken)) {
            throw new Error('TOKEN_REPLAY_REJECTED: Authorization token has already been consumed and cannot be replayed.');
        }
        try {
            this.authEngine.consumeToken(request.authorizationToken, `promote_${candidate.candidateId}_to_${request.targetRing}`);
        }
        catch (err) {
            throw new Error(`TOKEN_CONSUMPTION_FAILED: Invalid or already-consumed authorization token: ${err?.message}`);
        }
        this.recoveryEngine.recordConsumedToken({
            token: request.authorizationToken,
            candidateId: candidate.candidateId,
            targetRing: request.targetRing,
            tenantPartition: request.tenantPartition,
            consumedBy: request.operatorUserId,
        });
        // 6. Verify Hard-Forbidden Actions Immutability
        for (const forbidden of CANONICAL_HARD_FORBIDDEN_ACTIONS) {
            const cls = candidate.policyConfig.actionClassifications[forbidden];
            if (cls && cls !== 'FORBIDDEN') {
                throw new Error(`HARD_FORBIDDEN_DOWNGRADE: Candidate illegally downgraded '${forbidden}' to '${cls}'. Promotion permanently rejected.`);
            }
        }
        // 7. Verify Checksum Integrity
        const expectedChecksum = this.calculateChecksum(candidate);
        if (candidate.checksum !== expectedChecksum && candidate.policyConfig.checksum !== expectedChecksum) {
            throw new Error('CHECKSUM_MISMATCH: Candidate failed cryptographic integrity check. Promotion rejected.');
        }
        // 8. Compute Updated Lifecycle State
        const nextState = this.mapRingToLifecycleState(request.targetRing);
        const updatedCandidate = {
            ...candidate,
            currentRing: request.targetRing,
            state: nextState,
        };
        const promotedAt = new Date().toISOString();
        const provenanceHash = crypto
            .createHash('sha256')
            .update(JSON.stringify({
            candidateId: candidate.candidateId,
            previousRing: candidate.currentRing,
            targetRing: request.targetRing,
            tenantPartition: request.tenantPartition,
            operatorUserId: request.operatorUserId,
            tokenHash: crypto.createHash('sha256').update(request.authorizationToken).digest('hex'),
            promotedAt,
        }))
            .digest('hex');
        const result = {
            success: true,
            candidateId: candidate.candidateId,
            previousRing: candidate.currentRing,
            newRing: request.targetRing,
            tenantPartition: request.tenantPartition,
            promotedAt,
            provenanceHash,
        };
        // 9. Record in Append-Only Audit Ledger
        globalAuditLedger.record({
            timestamp: promotedAt,
            actor: { userId: request.operatorUserId, role: 'operator', channel: 'admin' },
            domain: 'shop',
            toolName: 'policy_canary_promote',
            classification: 'HIGH_IMPACT',
            policyDecision: 'PERMIT',
            executionStatus: 'SUCCESS',
            argumentsHash: provenanceHash,
        });
        return { updatedCandidate, result };
    }
    /**
     * Resolves the strictly sequential next ring in the hierarchy.
     * Giải quyết vòng tiếp theo theo thứ tự tuần tự nghiêm ngặt trong phân cấp.
     */
    getExpectedNextRing(state, currentRing) {
        if (state === 'STAGED') {
            return 'RING_0';
        }
        switch (currentRing) {
            case 'RING_0':
                return 'RING_1';
            case 'RING_1':
                return 'RING_2';
            case 'RING_2':
                return 'RING_3';
            case 'RING_3':
                return 'RING_4';
            case 'RING_4':
                throw new Error('ALREADY_AT_MAXIMUM_RING: Ring 4 is the terminal global ring.');
            default:
                throw new Error(`UNKNOWN_CURRENT_RING: Ring '${currentRing}' is invalid.`);
        }
    }
    /**
     * Maps a target ring to the corresponding lifecycle state.
     * Ánh xạ một vòng mục tiêu tới trạng thái vòng đời tương ứng.
     */
    mapRingToLifecycleState(ring) {
        switch (ring) {
            case 'RING_0':
                return 'SHADOWING';
            case 'RING_1':
                return 'INTERNAL_CANARY';
            case 'RING_2':
                return 'COHORT_CANARY';
            case 'RING_3':
                return 'EXPANDED_CANARY';
            case 'RING_4':
                return 'GLOBAL';
            default:
                return 'STAGED';
        }
    }
    calculateChecksum(candidate) {
        const payload = JSON.stringify({
            versionId: candidate.policyConfig.versionId,
            classifications: candidate.policyConfig.actionClassifications,
            guardrails: candidate.policyConfig.guardrails,
        });
        return crypto.createHash('sha256').update(payload).digest('hex');
    }
}
export const globalPolicyRingPromotionEngine = new PolicyRingPromotionEngine();
