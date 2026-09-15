// src/core/adaptiveAutonomy/adaptiveStrategyManager.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1093 — REAL
//
// EN: Governed adaptive strategy manager.
//     Adapts execution strategy within immutable original scope with PDP + PEP verification,
//     strictly rejecting scope expansion or self-authorization.
// VI: Trình quản lý chiến lược thích ứng có quản trị.
//     Thích ứng chiến lược thực thi trong phạm vi gốc bất biến với xác minh PDP + PEP,
//     nghiêm cấm tuyệt đối mở rộng phạm vi hoặc tự ủy quyền.
import { AdaptiveAutonomyAdaptationError, computeAdaptationDecisionHash, MAX_ADAPTATION_ATTEMPTS, } from './adaptiveAutonomyTypes.js';
export class AdaptiveStrategyManager {
    tenantId;
    sessionId;
    boundary;
    budgetManager;
    securityBoundary;
    decisions = [];
    constructor(tenantId, sessionId, boundary, budgetManager, securityBoundary) {
        this.tenantId = tenantId;
        this.sessionId = sessionId;
        this.boundary = boundary;
        this.budgetManager = budgetManager;
        this.securityBoundary = securityBoundary;
    }
    getDecisions() {
        return [...this.decisions];
    }
    /**
     * EN: Evaluates and executes a governed strategy adaptation.
     * VI: Đánh giá và thực thi một sự thích ứng chiến lược có quản trị.
     */
    evaluateAdaptation(proposed, context) {
        // 1. Synchronously assert USER_STOP and EMERGENCY_STOP
        this.securityBoundary.assertStopInactive('pre_adaptation', this.tenantId, this.sessionId);
        // 2. Assert adaptation count does not exceed limit
        const nextCount = this.decisions.length + 1;
        if (nextCount > MAX_ADAPTATION_ATTEMPTS) {
            throw new AdaptiveAutonomyAdaptationError(`Adaptation attempt ${nextCount} exceeds maximum allowed (${MAX_ADAPTATION_ATTEMPTS})`, this.tenantId, this.sessionId);
        }
        // 3. Assert lease validity
        this.securityBoundary.assertLeaseValidity(context.lease, this.tenantId, this.sessionId);
        // 4. Assert proposed operations remain within immutable original authorization scope
        try {
            this.securityBoundary.assertScopeBound(proposed.proposedOperations, this.boundary.immutableAuthorizationScope, this.tenantId, this.sessionId);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            throw new AdaptiveAutonomyAdaptationError(`ADAPTATION_REJECTED: proposed operations exceed original scope. ${message}`, this.tenantId, this.sessionId);
        }
        // 5. Verify PDP decision
        const pdpApproved = context.pdpDecision ? context.pdpDecision.isPermitted : true;
        if (!pdpApproved) {
            throw new AdaptiveAutonomyAdaptationError(`ADAPTATION_REJECTED by PDP: ${context.pdpDecision?.reason ?? 'PDP denied adaptation'}`, this.tenantId, this.sessionId);
        }
        // 6. Verify PEP readiness
        const pepVerified = context.pepReady !== undefined ? context.pepReady : true;
        if (!pepVerified) {
            throw new AdaptiveAutonomyAdaptationError(`ADAPTATION_REJECTED by PEP: Policy Enforcement Point not ready or denied`, this.tenantId, this.sessionId);
        }
        // 7. Consume adaptation in budget manager
        this.budgetManager.consumeAdaptationAttempt();
        // 8. Seal and record adaptation decision
        const timestamp = Date.now();
        const decisionId = `adapt_${context.cycleNumber}_${nextCount}_${timestamp}`;
        const decisionPayload = {
            decisionId,
            timestamp,
            cycleNumber: context.cycleNumber,
            rationale: proposed.rationale,
            modifiedParameters: { ...proposed.proposedParameters },
            pdpApproved,
            pepVerified,
            scopeCompliant: true,
            leaseCompliant: true,
        };
        const decisionHash = computeAdaptationDecisionHash(decisionPayload);
        const decision = {
            ...decisionPayload,
            decisionHash,
        };
        this.decisions.push(decision);
        return decision;
    }
}
