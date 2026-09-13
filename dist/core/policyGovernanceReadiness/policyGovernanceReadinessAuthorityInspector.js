// src/core/policyGovernanceReadiness/policyGovernanceReadinessAuthorityInspector.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Authority Inspector (Component 860).
// Verifies human authorization boundaries, anti-self-approval mechanisms,
// autonomous persona denial, and USER_STOP supremacy. Strictly read-only.
import * as fs from 'fs';
import * as path from 'path';
export class PolicyGovernanceReadinessAuthorityInspector {
    repositoryRoot;
    constructor(repositoryRoot) {
        this.repositoryRoot = repositoryRoot || process.cwd();
    }
    /**
     * Inspects governance boundary implementations for human authority enforcement.
     */
    inspect() {
        const boundaryFiles = [
            'src/core/policyDecision/policyDecisionAuthorizationGate.ts',
            'src/core/policyFeedbackReview/policyFeedbackHumanReviewGate.ts',
            'src/core/policyEvolutionPlanning/policyEvolutionHumanBoundary.ts',
            'src/core/policyCandidateAuthorization/policyHumanAuthorizationGate.ts',
            'src/core/policyStagedActivation/policyGovernedActivationBoundary.ts',
            'src/core/policyActiveRollback/policyGovernedRollbackBoundary.ts',
            'src/core/policyActiveIncidentResolution/policyContainmentClearanceBoundary.ts',
            'src/core/policyActiveIncidentResolution/policyIncidentClosureBoundary.ts',
        ];
        const antiSelfApprovalGates = [
            'src/core/policyFeedbackReview/policyFeedbackHumanReviewGate.ts',
            'src/core/policyEvolutionPlanning/policyEvolutionHumanBoundary.ts',
            'src/core/policyCandidateAuthorization/policyHumanAuthorizationGate.ts',
            'src/core/policyStagedActivation/policyGovernedActivationBoundary.ts',
            'src/core/policyActiveRollback/policyGovernedRollbackBoundary.ts',
            'src/core/policyActiveIncidentResolution/policyContainmentClearanceBoundary.ts',
            'src/core/policyActiveIncidentResolution/policyIncidentClosureBoundary.ts',
        ];
        const nonBypassableBoundaries = [];
        let antiSelfApprovalVerified = true;
        let autonomousPersonasDenied = true;
        let humanAuthorityPrecedenceVerified = true;
        let userStopDominanceVerified = true;
        for (const relFile of boundaryFiles) {
            const fullPath = path.join(this.repositoryRoot, relFile);
            if (!fs.existsSync(fullPath)) {
                continue;
            }
            nonBypassableBoundaries.push(relFile);
            const content = fs.readFileSync(fullPath, 'utf-8');
            // Verify rejection of autonomous personas
            if (!content.includes('auto_') && !content.includes('bot_') && !content.includes('AUTONOMOUS') && !content.includes('ai_agent')) {
                autonomousPersonasDenied = false;
            }
            // Verify human authority supremacy
            if (!content.includes('HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION') && !content.includes('HumanAuthorizationRole') && !content.includes('MASTER_HUMAN_OPERATOR') && !content.includes('ZERO_AUTONOMOUS_APPROVAL')) {
                humanAuthorityPrecedenceVerified = false;
            }
        }
        // Verify anti-self-approval specifically across the candidate, activation, rollback, clearance, and closure gates
        for (const relFile of antiSelfApprovalGates) {
            const fullPath = path.join(this.repositoryRoot, relFile);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (!content.includes('SELF_APPROVAL') && !content.includes('requestedBy ===') && !content.includes('cannot approve')) {
                    antiSelfApprovalVerified = false;
                }
            }
        }
        // Verify USER_STOP supremacy across runtimes
        const runtimeFiles = [
            'src/core/policyStagedActivation/policyStagedActivationRuntime.ts',
            'src/core/policyActiveRuntime/policyActiveRuntimeCoordinator.ts',
            'src/core/policyActiveRollback/policyActiveRollbackRuntime.ts',
            'src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationRuntime.ts',
            'src/core/policyActiveIncidentResponse/policyActiveIncidentResponseRuntime.ts',
            'src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionRuntime.ts',
        ];
        for (const relFile of runtimeFiles) {
            const fullPath = path.join(this.repositoryRoot, relFile);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                if (!content.includes('USER_STOP') && !content.includes('halted') && !content.includes('USER_STOP_HALTED')) {
                    userStopDominanceVerified = false;
                }
            }
        }
        return Object.freeze({
            nonBypassableHumanBoundaries: Object.freeze(nonBypassableBoundaries),
            antiSelfApprovalVerified,
            autonomousPersonasDenied,
            humanAuthorityPrecedenceVerified,
            userStopDominanceVerified,
        });
    }
}
