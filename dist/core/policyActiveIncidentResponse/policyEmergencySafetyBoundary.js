// src/core/policyActiveIncidentResponse/policyEmergencySafetyBoundary.ts
// BOWCON V4.0 — MS-1.3.74: GOVERNED ACTIVE POLICY INCIDENT RESPONSE, DEGRADATION DETECTION & EMERGENCY SAFETY BOUNDARY
//
// Governed Emergency Safety Boundary (Component 834).
// Enforces non-bypassable, fail-closed operational safety containment during active policy incidents.
// Narrower than policy authority: does NOT author rules, does NOT issue execution tokens,
// and does NOT execute tools. Enforces canonical hard-forbidden floors and safety containment.
//
// Core Authority Invariants:
// - EMERGENCY_SAFETY_BOUNDARY != POLICY_AUTHORITY
// - EMERGENCY_SAFETY_BOUNDARY != POLICY_MUTATION
// - ZERO AUTONOMOUS POLICY MUTATION
// - ZERO DIRECT TOOL EXECUTION
// - HARD_FORBIDDEN_ACTIONS_ARE_IMMUTABLE
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { ROLLBACK_HARD_FORBIDDEN_ACTIONS } from '../policyActiveRollback/policyActiveRollbackTypes.js';
import { createSafetyBoundaryActivationId } from './policyActiveIncidentResponseTypes.js';
export class PolicyEmergencySafetyBoundary {
    // In-memory tenant boundary states: tenantPartition -> SafetyBoundaryState
    boundaryStates = new Map();
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Emergency safety boundary operations suspended by USER_STOP supremacy');
        }
    }
    /**
     * Activates or updates the safety boundary posture for a tenant during an incident.
     */
    activateSafetyBoundary(tenantPartition, incidentId, status, reason) {
        this.assertUserStopInactive();
        const activation = Object.freeze({
            boundaryActivationId: createSafetyBoundaryActivationId(`sba_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`),
            tenantPartition,
            incidentId,
            status,
            reason,
            activatedAt: new Date().toISOString(),
            allowsReadOnlyFallback: status === 'RESTRICTED_FALLBACK',
            enforcesHardForbiddenFloor: true,
            isPolicyAuthority: false,
        });
        this.boundaryStates.set(tenantPartition, activation);
        return activation;
    }
    /**
     * Retrieves the current safety boundary posture for a tenant.
     */
    getBoundaryState(tenantPartition) {
        this.assertUserStopInactive();
        return this.boundaryStates.get(tenantPartition) ?? null;
    }
    /**
     * Deactivates the safety boundary for a tenant.
     * Requires human review clearance; rejects autonomous actors.
     */
    deactivateSafetyBoundary(tenantPartition, operatorId, rationale) {
        this.assertUserStopInactive();
        // 1. Anti-autonomous validation: operatorId must not be autonomous persona
        const opLower = operatorId.toLowerCase().trim();
        if (opLower.startsWith('auto_') ||
            opLower.startsWith('bot_') ||
            opLower.includes('ai_agent') ||
            opLower.includes('daemon') ||
            opLower === 'anonymous' ||
            opLower === 'guest') {
            throw new Error('SAFETY_BOUNDARY_BREACH: Autonomous actors cannot deactivate an active emergency safety boundary.');
        }
        if (!rationale || rationale.trim().length < 10) {
            throw new Error('SAFETY_BOUNDARY_BREACH: Explicit human governance rationale (>= 10 chars) required to deactivate safety boundary.');
        }
        this.boundaryStates.delete(tenantPartition);
        return true;
    }
    /**
     * Enforces emergency safety boundary restrictions prior to action evaluation.
     */
    enforceSafetyBoundary(tenantPartition, action, actionClassification) {
        this.assertUserStopInactive();
        // 1. Hard-forbidden actions are ALWAYS strictly forbidden regardless of boundary state
        for (const forbidden of ROLLBACK_HARD_FORBIDDEN_ACTIONS) {
            if (action === forbidden) {
                return {
                    allowed: false,
                    disposition: 'FORBIDDEN',
                    reason: `Action '${action}' violates canonical hard-forbidden floor.`,
                    boundaryStatus: this.boundaryStates.get(tenantPartition)?.status ?? 'INACTIVE',
                };
            }
        }
        const state = this.boundaryStates.get(tenantPartition);
        if (!state || state.status === 'INACTIVE') {
            return {
                allowed: true,
                disposition: 'PERMIT',
                reason: 'Safety boundary inactive; standard PDP/PEP evaluation permitted.',
                boundaryStatus: 'INACTIVE',
            };
        }
        // 2. FAIL_CLOSED: Complete block on all capabilities
        if (state.status === 'FAIL_CLOSED') {
            return {
                allowed: false,
                disposition: 'BLOCKED_BY_SAFETY_BOUNDARY',
                reason: `Emergency safety boundary FAIL_CLOSED active for tenant '${tenantPartition}': ${state.reason}`,
                boundaryStatus: 'FAIL_CLOSED',
            };
        }
        // 3. ACTIVE: Denies execution of unverified operations
        if (state.status === 'ACTIVE') {
            return {
                allowed: false,
                disposition: 'BLOCKED_BY_SAFETY_BOUNDARY',
                reason: `Emergency safety boundary ACTIVE for tenant '${tenantPartition}': execution blocked awaiting human governance review.`,
                boundaryStatus: 'ACTIVE',
            };
        }
        // 4. RESTRICTED_FALLBACK: Allows only read-only or reversible actions
        if (state.status === 'RESTRICTED_FALLBACK') {
            if (actionClassification === 'OBSERVE' || actionClassification === 'READ_ONLY' || actionClassification === 'REVERSIBLE') {
                return {
                    allowed: true,
                    disposition: 'PERMIT',
                    reason: 'Restricted read-only fallback permitted under degraded policy status.',
                    boundaryStatus: 'RESTRICTED_FALLBACK',
                };
            }
            return {
                allowed: false,
                disposition: 'BLOCKED_BY_SAFETY_BOUNDARY',
                reason: `Action '${action}' blocked: only read-only/reversible fallback actions permitted under degraded status.`,
                boundaryStatus: 'RESTRICTED_FALLBACK',
            };
        }
        return {
            allowed: false,
            disposition: 'BLOCKED_BY_SAFETY_BOUNDARY',
            reason: 'Unknown safety boundary state; fail-closed by default.',
            boundaryStatus: state.status,
        };
    }
}
