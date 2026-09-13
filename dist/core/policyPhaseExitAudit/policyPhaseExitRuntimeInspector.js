// src/core/policyPhaseExitAudit/policyPhaseExitRuntimeInspector.ts
// BOWCON V4.0 — MS-1.3.78: INDEPENDENT PHASE 1.3 EXIT EVIDENCE AUDIT & GOVERNANCE READINESS CERTIFICATION
//
// Runtime State & Non-Mutation Inspector (Component 889).
// Dynamically verifies clean runtime instantiation and enforces that zero unauthorized mutation methods are exposed.
// Strictly read-only; alters ZERO state.
//
// Core Authority Invariants:
// - ZERO_AUTONOMOUS_POLICY_MUTATION
// - USER_STOP > EVERYTHING
// - FAIL_CLOSED
import { PolicyPhaseTransitionRuntime } from '../policyPhaseTransition/policyPhaseTransitionRuntime.js';
import { PolicyGovernanceReadinessRuntime } from '../policyGovernanceReadiness/policyGovernanceReadinessRuntime.js';
import { PolicyActiveIncidentResolutionRuntime } from '../policyActiveIncidentResolution/policyActiveIncidentResolutionRuntime.js';
import { PolicyActiveIncidentResponseRuntime } from '../policyActiveIncidentResponse/policyActiveIncidentResponseRuntime.js';
import { PolicyActiveRollbackRuntime } from '../policyActiveRollback/policyActiveRollbackRuntime.js';
import { PolicyStagedActivationRuntime } from '../policyStagedActivation/policyStagedActivationRuntime.js';
const FORBIDDEN_MUTATION_METHOD_NAMES = [
    'mutatePolicy',
    'activateCandidate',
    'promoteCandidate',
    'rollbackPolicy',
    'recoverPolicy',
    'sunsetPolicy',
    'declarePhaseComplete',
    'autonomousRollback',
    'autonomousRecover',
    'autonomousSunset',
    'autonomousApprove',
    'autonomousPromote',
    'autoRepair',
    'selfHealPolicy',
];
export class PolicyPhaseExitRuntimeInspector {
    isUserStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
    }
    assertUserStopInactive() {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
            throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Runtime inspector suspended by USER_STOP supremacy');
        }
    }
    /**
     * Inspects all major Phase 1.3 runtime classes for clean initialization and absence of mutation authority.
     */
    inspectRuntimes() {
        this.assertUserStopInactive();
        const findings = [];
        const runtimeFactories = [
            { name: 'PolicyPhaseTransitionRuntime', create: () => new PolicyPhaseTransitionRuntime() },
            { name: 'PolicyGovernanceReadinessRuntime', create: () => new PolicyGovernanceReadinessRuntime() },
            { name: 'PolicyActiveIncidentResolutionRuntime', create: () => new PolicyActiveIncidentResolutionRuntime() },
            { name: 'PolicyActiveIncidentResponseRuntime', create: () => new PolicyActiveIncidentResponseRuntime() },
            { name: 'PolicyActiveRollbackRuntime', create: () => new PolicyActiveRollbackRuntime() },
            { name: 'PolicyStagedActivationRuntime', create: () => new PolicyStagedActivationRuntime() },
        ];
        for (const rf of runtimeFactories) {
            let instantiated = false;
            let safeReadOnlyQuery = false;
            const exposed = [];
            try {
                const instance = rf.create();
                instantiated = instance !== undefined && instance !== null;
                // Check methods for forbidden mutation names
                for (const forbidden of FORBIDDEN_MUTATION_METHOD_NAMES) {
                    if (typeof instance[forbidden] === 'function') {
                        exposed.push(forbidden);
                    }
                }
                // Test safe read-only queries if present
                if (typeof instance.getCurrentPhase === 'function') {
                    instance.getCurrentPhase('tenant_audit_probe');
                    safeReadOnlyQuery = true;
                }
                else {
                    safeReadOnlyQuery = true; // No crash on instantiation
                }
            }
            catch (err) {
                instantiated = false;
                safeReadOnlyQuery = false;
            }
            findings.push(Object.freeze({
                runtimeName: rf.name,
                instantiated,
                safeReadOnlyQuery,
                mutationMethodsExposed: Object.freeze(exposed),
            }));
        }
        return Object.freeze(findings);
    }
}
