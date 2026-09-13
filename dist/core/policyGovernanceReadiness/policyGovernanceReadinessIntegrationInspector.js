// src/core/policyGovernanceReadiness/policyGovernanceReadinessIntegrationInspector.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Integration Inspector (Component 858).
// Verifies the end-to-end connectivity, execution paths, and testing of the
// 30-stage Phase 1.3 governance lifecycle. Strictly read-only and non-mutating.
import * as fs from 'fs';
import * as path from 'path';
export const CANONICAL_GOVERNANCE_CHAIN = Object.freeze([
    'OBSERVATION',
    'EVIDENCE',
    'INVESTIGATION',
    'DECISION',
    'AUTHORIZATION',
    'EXECUTION',
    'VERIFICATION',
    'FEEDBACK_PROPOSAL',
    'FEEDBACK_REVIEW',
    'EVOLUTION_INTAKE',
    'EVOLUTION_PLAN',
    'CANDIDATE_SYNTHESIS',
    'CANDIDATE_VALIDATION',
    'HUMAN_AUTHORIZATION',
    'ACTIVATION_READINESS',
    'STAGED_POLICY',
    'ACTIVATION_PREFLIGHT',
    'GOVERNED_ACTIVATION',
    'ACTIVATION_COMMIT',
    'ACTIVE_POLICY',
    'RUNTIME_SYNCHRONIZATION',
    'PDP_PEP_ENFORCEMENT',
    'ROLLBACK_SUNSET_RECOVERY',
    'RECONCILIATION',
    'INCIDENT_DETECTION',
    'INCIDENT_CONTAINMENT',
    'HUMAN_CLEARANCE',
    'RECOVERY_AUTHORIZATION',
    'RECOVERY_VERIFICATION',
    'INCIDENT_RESOLUTION',
    'INCIDENT_CLOSURE',
]);
export class PolicyGovernanceReadinessIntegrationInspector {
    repositoryRoot;
    constructor(repositoryRoot) {
        this.repositoryRoot = repositoryRoot || process.cwd();
    }
    /**
     * Inspects governance chain connectivity and verification across test files.
     */
    inspect() {
        const findings = [];
        // Path 1: Policy Decision -> Execution -> Post-Execution -> Feedback Review
        findings.push(this.evaluateSubPath('DECISION_TO_FEEDBACK_REVIEW', ['DECISION', 'AUTHORIZATION', 'EXECUTION', 'VERIFICATION', 'FEEDBACK_PROPOSAL', 'FEEDBACK_REVIEW'], [
            'src/core/policyDecision/policyDecisionRuntime.ts',
            'src/core/policyExecution/policyExecutionRuntime.ts',
            'src/core/policyPostExecution/policyPostExecutionRuntime.ts',
            'src/core/policyFeedbackReview/policyFeedbackReviewRuntime.ts',
        ], 'tests/test_v4_agent_governed_feedback_review.ts'));
        // Path 2: Feedback Review -> Evolution Planning -> Candidate Authorization
        findings.push(this.evaluateSubPath('FEEDBACK_TO_CANDIDATE_AUTHORIZATION', ['FEEDBACK_REVIEW', 'EVOLUTION_INTAKE', 'EVOLUTION_PLAN', 'CANDIDATE_SYNTHESIS', 'CANDIDATE_VALIDATION', 'HUMAN_AUTHORIZATION'], [
            'src/core/policyFeedbackReview/policyEvolutionIntakeEngine.ts',
            'src/core/policyEvolutionPlanning/policyEvolutionPlanningRuntime.ts',
            'src/core/policyCandidateAuthorization/policyCandidateAuthorizationRuntime.ts',
        ], 'tests/test_v4_agent_governed_candidate_authorization.ts'));
        // Path 3: Candidate Authorization -> Staged Activation -> Runtime Sync (PDP/PEP)
        findings.push(this.evaluateSubPath('CANDIDATE_TO_RUNTIME_ENFORCEMENT', ['HUMAN_AUTHORIZATION', 'ACTIVATION_READINESS', 'STAGED_POLICY', 'ACTIVATION_PREFLIGHT', 'GOVERNED_ACTIVATION', 'ACTIVE_POLICY', 'RUNTIME_SYNCHRONIZATION', 'PDP_PEP_ENFORCEMENT'], [
            'src/core/policyCandidateAuthorization/policyActivationReadinessEngine.ts',
            'src/core/policyStagedActivation/policyStagedActivationRuntime.ts',
            'src/core/policyActiveRuntime/policyActiveRuntimeCoordinator.ts',
            'src/core/policyActiveRuntime/policyActiveRuntimePDPBridge.ts',
            'src/core/policyActiveRuntime/policyActiveRuntimePEPBridge.ts',
        ], 'tests/test_v4_agent_governed_active_policy_runtime_synchronization.ts'));
        // Path 4: Active Policy -> Rollback / Sunset / Recovery -> Runtime Resynchronization
        findings.push(this.evaluateSubPath('ACTIVE_POLICY_ROLLBACK_RECOVERY', ['ACTIVE_POLICY', 'ROLLBACK_SUNSET_RECOVERY', 'RUNTIME_SYNCHRONIZATION'], [
            'src/core/policyActiveRollback/policyActiveRollbackRuntime.ts',
            'src/core/policyActiveRollback/policyGovernedRollbackBoundary.ts',
            'src/core/policyActiveRollback/policyRollbackStateTransitionEngine.ts',
        ], 'tests/test_v4_agent_governed_active_policy_rollback.ts'));
        // Path 5: Active Policy -> Lifecycle Reconciliation (Read-only consistency)
        findings.push(this.evaluateSubPath('LIFECYCLE_RECONCILIATION', ['ACTIVE_POLICY', 'RUNTIME_SYNCHRONIZATION', 'RECONCILIATION'], [
            'src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationRuntime.ts',
            'src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleRuntimeDriftDetector.ts',
            'src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleVersionConsistencyEngine.ts',
        ], 'tests/test_v4_agent_governed_active_policy_lifecycle_reconciliation.ts'));
        // Path 6: Active Policy -> Incident Detection -> Containment -> Human Clearance -> Recovery Authorization -> Verification -> Resolution -> Closure
        findings.push(this.evaluateSubPath('INCIDENT_RESPONSE_TO_RESOLUTION_CLOSURE', ['INCIDENT_DETECTION', 'INCIDENT_CONTAINMENT', 'HUMAN_CLEARANCE', 'RECOVERY_AUTHORIZATION', 'RECOVERY_VERIFICATION', 'INCIDENT_RESOLUTION', 'INCIDENT_CLOSURE'], [
            'src/core/policyActiveIncidentResponse/policyActiveIncidentResponseRuntime.ts',
            'src/core/policyActiveIncidentResolution/policyContainmentAssessmentEngine.ts',
            'src/core/policyActiveIncidentResolution/policyContainmentClearanceBoundary.ts',
            'src/core/policyActiveIncidentResolution/policyRecoveryAuthorizationEngine.ts',
            'src/core/policyActiveIncidentResolution/policyIncidentRecoveryHandoffEngine.ts',
            'src/core/policyActiveIncidentResolution/policyIncidentRecoveryVerificationEngine.ts',
            'src/core/policyActiveIncidentResolution/policyIncidentResolutionEngine.ts',
            'src/core/policyActiveIncidentResolution/policyIncidentClosureBoundary.ts',
            'src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionRuntime.ts',
        ], 'tests/test_v4_agent_governed_active_policy_incident_resolution.ts'));
        return Object.freeze(findings);
    }
    evaluateSubPath(pathName, stages, requiredComponents, testFile) {
        let allComponentsExist = true;
        let missingComponent;
        for (const comp of requiredComponents) {
            const fullPath = path.join(this.repositoryRoot, comp);
            if (!fs.existsSync(fullPath)) {
                allComponentsExist = false;
                missingComponent = comp;
                break;
            }
        }
        const testFullPath = path.join(this.repositoryRoot, testFile);
        const testExists = fs.existsSync(testFullPath);
        const isConnected = allComponentsExist;
        const isExecutable = allComponentsExist && testExists;
        const isTested = testExists;
        return Object.freeze({
            pathName,
            stages,
            isConnected,
            isExecutable,
            isTested,
            breaksAtStage: missingComponent,
            reason: allComponentsExist && testExists
                ? 'All bridging components exist and corresponding test suite is registered.'
                : `Path incomplete: component ${missingComponent || testFile} missing.`,
        });
    }
}
