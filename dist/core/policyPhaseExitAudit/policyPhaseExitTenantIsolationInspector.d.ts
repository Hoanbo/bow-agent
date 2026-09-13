export interface TenantIsolationFinding {
    readonly pathTraversalBlocked: boolean;
    readonly nullByteBlocked: boolean;
    readonly reservedDeviceBlocked: boolean;
    readonly anonymousBlocked: boolean;
    readonly crossTenantSegregationVerified: boolean;
    readonly clean: boolean;
    readonly anomalies: readonly string[];
}
export declare class PolicyPhaseExitTenantIsolationInspector {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Independently probes tenant isolation boundaries and verifies fail-closed security.
     */
    probeIsolation(): TenantIsolationFinding;
}
