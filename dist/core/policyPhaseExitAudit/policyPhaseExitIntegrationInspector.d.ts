export interface IntegrationFinding {
    readonly integrationPath: string;
    readonly sourceMilestone: string;
    readonly targetMilestone: string;
    readonly connected: boolean;
    readonly authoritySeparated: boolean;
    readonly issues: readonly string[];
}
export declare class PolicyPhaseExitIntegrationInspector {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Inspects all critical Phase 1.3 integration paths for linkage and authority separation.
     */
    inspectIntegrations(): readonly IntegrationFinding[];
}
