// src/core/policyGovernanceReadiness/policyGovernanceReadinessRepositoryInspector.ts
// BOWCON V4.0 — MS-1.3.76: GOVERNED POLICY GOVERNANCE PLANE END-TO-END VALIDATION,
// EVIDENCE-BASED READINESS ASSESSMENT & CONDITIONAL PHASE EXIT GATE
//
// Repository Inspector (Component 857).
// Read-only inspection of repository structure, files, component matrix,
// and public export surfaces. Strictly non-mutating and non-authoritative.
import * as fs from 'fs';
import * as path from 'path';
export class PolicyGovernanceReadinessRepositoryInspector {
    repositoryRoot;
    constructor(repositoryRoot) {
        this.repositoryRoot = repositoryRoot || process.cwd();
    }
    /**
     * Inspects repository component matrix and public exports.
     * Strictly read-only; never writes, deletes, or mutates any file.
     */
    inspect() {
        const matrixPath = path.join(this.repositoryRoot, 'docs', 'BOWCON_V4_COMPONENT_MATRIX.md');
        const indexPath = path.join(this.repositoryRoot, 'src', 'index.ts');
        let matrixContent = '';
        if (fs.existsSync(matrixPath)) {
            matrixContent = fs.readFileSync(matrixPath, 'utf-8');
        }
        let indexContent = '';
        if (fs.existsSync(indexPath)) {
            indexContent = fs.readFileSync(indexPath, 'utf-8');
        }
        // Parse component counts from component matrix
        // Matches lines like: | **728** | `PolicyDecisionTypes` | `src/...` | **REAL** | ...
        const componentRegex = /\|\s*\*\*(\d+)\*\*\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`\s*\|\s*\*\*([A-Z]+)\*\*/g;
        let match;
        let realCount = 0;
        let partialCount = 0;
        let mockCount = 0;
        let totalCount = 0;
        let ms62Through75Count = 0;
        const recordedComponents = [];
        while ((match = componentRegex.exec(matrixContent)) !== null) {
            const num = parseInt(match[1], 10);
            const name = match[2];
            const file = match[3];
            const status = match[4];
            totalCount++;
            if (status === 'REAL')
                realCount++;
            else if (status === 'PARTIAL')
                partialCount++;
            else if (status === 'MOCK')
                mockCount++;
            if (num >= 728 && num <= 854) {
                ms62Through75Count++;
            }
            recordedComponents.push({ num, name, file, status });
        }
        // Check orphan components for governance plane MS-1.3.62 through MS-1.3.76
        const orphanComponents = [];
        for (const comp of recordedComponents) {
            if (comp.num >= 728 && comp.num <= 869) {
                const fullPath = path.join(this.repositoryRoot, comp.file);
                if (!fs.existsSync(fullPath)) {
                    orphanComponents.push(comp.file);
                }
            }
        }
        // Check public exports for MS-1.3.62 through MS-1.3.75
        const expectedExportSections = [
            'policyDecision',
            'policyExecution',
            'policyPostExecution',
            'policyFeedbackReview',
            'policyEvolutionPlanning',
            'policyCandidateAuthorization',
            'policyStagedActivation',
            'policyActiveRuntime',
            'policyActiveRollback',
            'policyActiveLifecycleReconciliation',
            'policyActiveIncidentResponse',
            'policyActiveIncidentResolution',
        ];
        const missingExports = [];
        for (const exp of expectedExportSections) {
            if (!indexContent.includes(exp)) {
                missingExports.push(exp);
            }
        }
        const matrixConsistent = totalCount > 0 && orphanComponents.length === 0 && missingExports.length === 0;
        return Object.freeze({
            totalComponents: totalCount,
            realComponents: realCount,
            partialComponents: partialCount,
            mockComponents: mockCount,
            ms62Through75Components: ms62Through75Count,
            orphanComponents: Object.freeze(orphanComponents),
            deadExports: Object.freeze([]),
            missingExports: Object.freeze(missingExports),
            matrixConsistent,
        });
    }
}
