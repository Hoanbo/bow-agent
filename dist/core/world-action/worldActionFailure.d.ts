export type WorldActionFailureCode = 'PLANNING_FAILURE' | 'AUTHORIZATION_FAILURE' | 'POLICY_DENIAL' | 'TOOL_NOT_FOUND' | 'INVALID_TARGET' | 'EXECUTION_FAILURE' | 'TIMEOUT' | 'VERIFICATION_FAILURE' | 'COMMIT_FAILURE' | 'ROLLBACK_FAILURE' | 'SECURITY_VIOLATION' | 'IDEMPOTENCY_CONFLICT' | 'EMERGENCY_STOP_ACTIVE' | 'RESOURCE_LOCKED';
export declare class WorldActionError extends Error {
    readonly code: WorldActionFailureCode;
    readonly actionId?: string;
    readonly target?: string;
    readonly timestamp: number;
    readonly details?: Record<string, any>;
    constructor(code: WorldActionFailureCode, message: string, actionId?: string, target?: string, details?: Record<string, any>);
    private static scrubDetails;
}
