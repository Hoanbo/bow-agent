import { AdaptationBoundary, AdaptationDecision } from './adaptiveAutonomyTypes.js';
import { SupervisionBudgetManager } from './supervisionBudgetManager.js';
import { AdaptiveAutonomySecurityBoundary } from './adaptiveAutonomySecurityBoundary.js';
export interface ProposedAdaptation {
    readonly rationale: string;
    readonly proposedParameters: Record<string, unknown>;
    readonly proposedOperations: readonly string[];
}
export declare class AdaptiveStrategyManager {
    private readonly tenantId;
    private readonly sessionId;
    private readonly boundary;
    private readonly budgetManager;
    private readonly securityBoundary;
    private readonly decisions;
    constructor(tenantId: string, sessionId: string, boundary: AdaptationBoundary, budgetManager: SupervisionBudgetManager, securityBoundary: AdaptiveAutonomySecurityBoundary);
    getDecisions(): readonly AdaptationDecision[];
    /**
     * EN: Evaluates and executes a governed strategy adaptation.
     * VI: Đánh giá và thực thi một sự thích ứng chiến lược có quản trị.
     */
    evaluateAdaptation(proposed: ProposedAdaptation, context: {
        cycleNumber: number;
        lease: {
            leaseId: string;
            tenantId: string;
            expiresAt: number;
            isRevoked?: boolean;
        };
        pdpDecision?: {
            isPermitted: boolean;
            reason?: string;
        };
        pepReady?: boolean;
    }): AdaptationDecision;
}
