export type CapabilityFailureCode = 'RECOVERABLE' | 'DEGRADED' | 'AUTHORIZATION_REQUIRED' | 'POLICY_DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'VERIFICATION_FAILED' | 'ROLLBACK_FAILED' | 'FATAL';
export declare class CapabilityError extends Error {
    readonly code: CapabilityFailureCode;
    readonly capabilityId?: string;
    readonly target?: string;
    readonly timestamp: number;
    readonly details?: Record<string, any>;
    constructor(code: CapabilityFailureCode, message: string, capabilityId?: string, target?: string, details?: Record<string, any>);
    get isRecoverable(): boolean;
    private static scrubDetails;
}
