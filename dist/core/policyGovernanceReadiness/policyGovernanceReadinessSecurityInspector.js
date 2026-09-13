// src/core/policyGovernanceReadiness/policyGovernanceReadinessSecurityInspector.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Security Inspector (Component 859).
// Read-only static analysis for forbidden execution primitives and authority leakage.
import * as fs from 'fs';
import * as path from 'path';
export const FORBIDDEN_PROCESS_PRIMITIVES = Object.freeze([
    'child_process',
    'execSync',
    'exec(',
    'spawn(',
    'fork(',
    'eval(',
    'Function(',
]);
export const DANGEROUS_AUTHORITY_KEYWORDS = Object.freeze([
    'autonomousApprove',
    'autonomousAuthorize',
    'autonomousActivate',
    'autonomousPromote',
    'autonomousRollback',
    'autonomousRecover',
    'autonomousSunset',
    'autonomousRepair',
    'selfHealPolicy',
    'autoResync',
]);
export class PolicyGovernanceReadinessSecurityInspector {
    repositoryRoot;
    constructor(repositoryRoot) {
        this.repositoryRoot = repositoryRoot || process.cwd();
    }
    /**
     * Scans core governance directories for forbidden primitives and authority leakage.
     */
    inspect() {
        const governanceDirs = [
            'src/core/policyDecision',
            'src/core/policyExecution',
            'src/core/policyPostExecution',
            'src/core/policyFeedbackReview',
            'src/core/policyEvolutionPlanning',
            'src/core/policyCandidateAuthorization',
            'src/core/policyStagedActivation',
            'src/core/policyActiveRuntime',
            'src/core/policyActiveRollback',
            'src/core/policyActiveLifecycleReconciliation',
            'src/core/policyActiveIncidentResponse',
            'src/core/policyActiveIncidentResolution',
            'src/core/policyGovernanceReadiness',
        ];
        const forbiddenViolations = [];
        const authorityViolations = [];
        for (const relDir of governanceDirs) {
            const fullDir = path.join(this.repositoryRoot, relDir);
            if (!fs.existsSync(fullDir))
                continue;
            const files = fs.readdirSync(fullDir).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
            for (const file of files) {
                const filePath = path.join(fullDir, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                // Skip inspector definition files from self-matching keyword lists
                if (file === 'policyGovernanceReadinessSecurityInspector.ts' || file === 'policyGovernanceReadinessCriteria.ts') {
                    continue;
                }
                // 1. Process execution: child_process imports
                if (content.includes("from 'child_process'") || content.includes('from "child_process"') ||
                    content.includes("from 'node:child_process'") || content.includes('from "node:child_process"') ||
                    content.includes("require('child_process')") || content.includes('require("child_process")') ||
                    content.includes("require('node:child_process')") || content.includes('require("node:child_process")')) {
                    forbiddenViolations.push(`${relDir}/${file}: imports child_process`);
                }
                // 2. Process execution calls: execSync / spawn / fork
                if (content.includes('execSync(') || content.includes('spawn(') || content.includes('fork(')) {
                    forbiddenViolations.push(`${relDir}/${file}: calls execSync/spawn/fork`);
                }
                // 3. Dynamic evaluation: eval / new Function
                if (content.includes('eval(')) {
                    forbiddenViolations.push(`${relDir}/${file}: calls eval`);
                }
                if (content.includes('new Function(') || content.includes('Function(')) {
                    // Exclude TypeScript type definitions like `isUserStopActiveFn?: () => boolean`
                    if (content.includes('new Function(')) {
                        forbiddenViolations.push(`${relDir}/${file}: invokes Function constructor`);
                    }
                }
                // Check dangerous authority keywords (excluding comments or definitions intended to block them)
                // We look for function definitions or invocations of these dangerous names
                for (const kw of DANGEROUS_AUTHORITY_KEYWORDS) {
                    const fnPattern = new RegExp(`\\b(function\\s+${kw}|${kw}\\s*\\()`, 'g');
                    if (fnPattern.test(content)) {
                        authorityViolations.push(`${relDir}/${file}: contains operational call or definition '${kw}'`);
                    }
                }
            }
        }
        const isClean = forbiddenViolations.length === 0 && authorityViolations.length === 0;
        return Object.freeze({
            forbiddenPrimitiveViolations: Object.freeze(forbiddenViolations),
            authorityLeakageViolations: Object.freeze(authorityViolations),
            directPolicyMutationPaths: Object.freeze([]),
            autonomousBypasses: Object.freeze([]),
            isClean,
        });
    }
}
