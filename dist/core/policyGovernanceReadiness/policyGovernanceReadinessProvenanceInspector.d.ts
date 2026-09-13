import type { ProvenanceInspectionFinding } from './policyGovernanceReadinessTypes.js';
export declare class PolicyGovernanceReadinessProvenanceInspector {
    private readonly repositoryRoot;
    constructor(repositoryRoot?: string);
    /**
     * Inspects provenance engines across the governance plane.
     */
    inspect(): ProvenanceInspectionFinding;
}
