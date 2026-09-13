import type { TenantInspectionFinding } from './policyGovernanceReadinessTypes.js';
export declare class PolicyGovernanceReadinessTenantInspector {
    private readonly repositoryRoot;
    constructor(repositoryRoot?: string);
    /**
     * Inspects tenant partition enforcement in stores and resolvers.
     */
    inspect(): TenantInspectionFinding;
}
