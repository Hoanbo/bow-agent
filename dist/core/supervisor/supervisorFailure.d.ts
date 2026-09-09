export type SupervisorFailureCode = 'RECOVERABLE' | 'DEGRADED' | 'AUTHORIZATION_REQUIRED' | 'POLICY_DENIED' | 'UNAVAILABLE' | 'TIMEOUT' | 'VERIFICATION_FAILED' | 'ROLLBACK_FAILED' | 'ESCALATED' | 'SAFE_STOP_TRIGGERED' | 'FATAL';
export declare class SupervisorError extends Error {
    readonly code: SupervisorFailureCode;
    readonly anomalyId?: string;
    readonly target?: string;
    readonly timestamp: number;
    readonly details?: Record<string, any>;
    constructor(code: SupervisorFailureCode, message: string, anomalyId?: string, target?: string, details?: Record<string, any>);
    get isRecoverable(): boolean;
    private static scrubDetails;
}
