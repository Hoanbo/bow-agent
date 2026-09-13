import type { SecurityInspectionFinding } from './policyGovernanceReadinessTypes.js';
export declare const FORBIDDEN_PROCESS_PRIMITIVES: readonly string[];
export declare const DANGEROUS_AUTHORITY_KEYWORDS: readonly string[];
export declare class PolicyGovernanceReadinessSecurityInspector {
    private readonly repositoryRoot;
    constructor(repositoryRoot?: string);
    /**
     * Scans core governance directories for forbidden primitives and authority leakage.
     */
    inspect(): SecurityInspectionFinding;
}
