export interface SecurityScanFinding {
    readonly directory: string;
    readonly filesScanned: number;
    readonly forbiddenPrimitivesDetected: readonly string[];
    readonly authorityLeakageDetected: readonly string[];
    readonly clean: boolean;
}
export declare class PolicyPhaseExitSecurityInspector {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Scans a target directory for forbidden primitives and authority leakage.
     */
    scanDirectory(relDir: string): SecurityScanFinding;
    /**
     * Scans all core Phase 1.3 governance directories.
     */
    scanGovernancePlane(): readonly SecurityScanFinding[];
}
