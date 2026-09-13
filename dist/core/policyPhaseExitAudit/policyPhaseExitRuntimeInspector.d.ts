export interface RuntimeAuditFinding {
    readonly runtimeName: string;
    readonly instantiated: boolean;
    readonly safeReadOnlyQuery: boolean;
    readonly mutationMethodsExposed: readonly string[];
}
export declare class PolicyPhaseExitRuntimeInspector {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Inspects all major Phase 1.3 runtime classes for clean initialization and absence of mutation authority.
     */
    inspectRuntimes(): readonly RuntimeAuditFinding[];
}
