import type { RepositoryInspectionFinding } from './policyGovernanceReadinessTypes.js';
export declare class PolicyGovernanceReadinessRepositoryInspector {
    private readonly repositoryRoot;
    constructor(repositoryRoot?: string);
    /**
     * Inspects repository component matrix and public exports.
     * Strictly read-only; never writes, deletes, or mutates any file.
     */
    inspect(): RepositoryInspectionFinding;
}
