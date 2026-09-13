import type { AuthorityInspectionFinding } from './policyGovernanceReadinessTypes.js';
export declare class PolicyGovernanceReadinessAuthorityInspector {
    private readonly repositoryRoot;
    constructor(repositoryRoot?: string);
    /**
     * Inspects governance boundary implementations for human authority enforcement.
     */
    inspect(): AuthorityInspectionFinding;
}
