import type { IntegrationPathFinding } from './policyGovernanceReadinessTypes.js';
export interface GovernanceStageBridge {
    readonly fromStage: string;
    readonly toStage: string;
    readonly bridgeComponent: string;
    readonly testFile: string;
}
export declare const CANONICAL_GOVERNANCE_CHAIN: readonly string[];
export declare class PolicyGovernanceReadinessIntegrationInspector {
    private readonly repositoryRoot;
    constructor(repositoryRoot?: string);
    /**
     * Inspects governance chain connectivity and verification across test files.
     */
    inspect(): readonly IntegrationPathFinding[];
    private evaluateSubPath;
}
