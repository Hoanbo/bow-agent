// src/core/governedPolicyLifecycle/PolicyLifecycleInterlockCoordinator.ts
// Component 1185: PolicyLifecycleInterlockCoordinator (REAL)
//
// Centralized interlock coordinator enforcing EMERGENCY_STOP, USER_STOP,
// and single-flight concurrency mutexes across all lifecycle operations.
// Enforces EMERGENCY_STOP > LIFECYCLE with absolute fail-closed semantics.
import { PolicyLifecycleInterlockActiveError, } from './GovernedPolicyLifecycleTypes.js';
export class PolicyLifecycleInterlockCoordinator {
    isEmergencyStopActiveFn;
    isUserStopActiveFn;
    constructor(options) {
        this.isEmergencyStopActiveFn = options?.isEmergencyStopActive;
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    /**
     * Assert whether a lifecycle transition is permitted under current interlock state.
     */
    assertLifecyclePermitted(tenantId, policyDomain, targetState) {
        // 1. Emergency Stop Evaluation (Dominates all state transitions)
        if (!this.isEmergencyStopActiveFn) {
            throw new PolicyLifecycleInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: Lifecycle operations fail closed when the stop provider is missing.');
        }
        let isEmergencyStop;
        try {
            isEmergencyStop = this.isEmergencyStopActiveFn(policyDomain);
        }
        catch (err) {
            throw new PolicyLifecycleInterlockActiveError(`EMERGENCY_STOP_EVALUATION_ERROR: Stop provider threw an error: ${err?.message || err}. Fails closed.`);
        }
        if (typeof isEmergencyStop !== 'boolean') {
            throw new PolicyLifecycleInterlockActiveError('EMERGENCY_STOP_INVALID_STATE: Stop provider returned a non-boolean value. Fails closed.');
        }
        if (isEmergencyStop) {
            // If emergency stop is active, ONLY transition to SUSPENDED is permitted
            if (targetState !== 'SUSPENDED') {
                throw new PolicyLifecycleInterlockActiveError(`EMERGENCY_STOP_ACTIVE: Lifecycle mutation to '${targetState}' blocked for domain '${policyDomain}'.`);
            }
        }
        // 2. User Stop Evaluation
        if (this.isUserStopActiveFn) {
            let isUserStop = false;
            try {
                isUserStop = this.isUserStopActiveFn(tenantId);
            }
            catch (err) {
                throw new PolicyLifecycleInterlockActiveError(`USER_STOP_EVALUATION_ERROR: User stop provider failed: ${err?.message || err}. Fails closed.`);
            }
            if (typeof isUserStop === 'boolean' && isUserStop) {
                if (targetState !== 'SUSPENDED') {
                    throw new PolicyLifecycleInterlockActiveError(`USER_STOP_ACTIVE: Operational transition to '${targetState}' blocked for tenant '${tenantId}'.`);
                }
            }
        }
    }
    isEmergencyStopEngaged(domain) {
        if (!this.isEmergencyStopActiveFn)
            return true; // Fail-closed
        try {
            return this.isEmergencyStopActiveFn(domain) === true;
        }
        catch {
            return true; // Fail-closed on error
        }
    }
    isUserStopEngaged(tenantId) {
        if (!this.isUserStopActiveFn)
            return false;
        try {
            return this.isUserStopActiveFn(tenantId) === true;
        }
        catch {
            return true; // Fail-closed on error
        }
    }
}
