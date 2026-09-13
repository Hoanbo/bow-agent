import type { AuditInspectionFinding } from './policyGovernanceReadinessTypes.js';
export declare class PolicyGovernanceReadinessAuditInspector {
    private readonly repositoryRoot;
    constructor(repositoryRoot?: string);
    /**
     * Inspects audit engines across all governance domains.
     */
    inspect(): AuditInspectionFinding;
}
