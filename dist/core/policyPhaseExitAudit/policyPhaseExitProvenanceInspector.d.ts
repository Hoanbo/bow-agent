export interface ProvenanceAuditFinding {
    readonly chainName: string;
    readonly hashAlgorithm: string;
    readonly chainingVerified: boolean;
    readonly tamperDetectionVerified: boolean;
    readonly clean: boolean;
    readonly error?: string;
}
export declare class PolicyPhaseExitProvenanceInspector {
    private readonly isUserStopActiveFn?;
    constructor(options?: {
        readonly isUserStopActive?: () => boolean;
    });
    private assertUserStopInactive;
    /**
     * Independently tests provenance engine cryptographic chaining and tamper detection.
     */
    testProvenanceIntegrity(): ProvenanceAuditFinding;
}
