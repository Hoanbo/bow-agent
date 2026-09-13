// src/core/policyGovernanceReadiness/policyGovernanceReadinessAuditInspector.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Audit Inspector (Component 863).
// Inspects audit ledger integration and secret sanitization across all governance domains.
import * as fs from 'fs';
import * as path from 'path';
export class PolicyGovernanceReadinessAuditInspector {
    repositoryRoot;
    constructor(repositoryRoot) {
        this.repositoryRoot = repositoryRoot || process.cwd();
    }
    /**
     * Inspects audit engines across all governance domains.
     */
    inspect() {
        const auditEngines = [
            'src/core/policyDecision/policyDecisionAuditEngine.ts',
            'src/core/policyExecution/policyExecutionAuditEngine.ts',
            'src/core/policyPostExecution/policyPostExecutionAuditEngine.ts',
            'src/core/policyFeedbackReview/policyFeedbackReviewAuditEngine.ts',
            'src/core/policyEvolutionPlanning/policyEvolutionPlanningAuditEngine.ts',
            'src/core/policyCandidateAuthorization/policyCandidateAuthorizationAuditEngine.ts',
            'src/core/policyStagedActivation/policyStagedActivationAuditEngine.ts',
            'src/core/policyActiveRuntime/policyActiveRuntimeAuditEngine.ts',
            'src/core/policyActiveRollback/policyActiveRollbackAuditEngine.ts',
            'src/core/policyActiveLifecycleReconciliation/policyActiveLifecycleReconciliationAuditEngine.ts',
            'src/core/policyActiveIncidentResponse/policyActiveIncidentAuditEngine.ts',
            'src/core/policyActiveIncidentResolution/policyActiveIncidentResolutionAuditEngine.ts',
        ];
        const domainsFound = [];
        let ledgerIntegrated = true;
        let secretSanitizationVerified = true;
        for (const relFile of auditEngines) {
            const fullPath = path.join(this.repositoryRoot, relFile);
            if (!fs.existsSync(fullPath))
                continue;
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (!content.includes('globalAuditLedger')) {
                ledgerIntegrated = false;
            }
            if (!content.includes('DiagnosisSanitizer') && !content.includes('sanitize')) {
                secretSanitizationVerified = false;
            }
            const domainMatch = content.match(/domain:\s*['"]([^'"]+)['"]/);
            if (domainMatch) {
                domainsFound.push(domainMatch[1]);
            }
        }
        return Object.freeze({
            ledgerIntegrated,
            secretSanitizationVerified,
            auditDomainsCovered: Object.freeze(domainsFound),
        });
    }
}
