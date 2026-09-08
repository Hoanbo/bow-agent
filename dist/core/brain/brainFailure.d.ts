export type BrainErrorCode = 'BRAIN_ILLEGAL_TRANSITION' | 'BRAIN_TASK_NOT_FOUND' | 'BRAIN_TASK_ALREADY_TERMINAL' | 'BRAIN_MAX_ITERATIONS_EXCEEDED' | 'BRAIN_MAX_RECOVERY_DEPTH_EXCEEDED' | 'BRAIN_TASK_DEADLINE_EXCEEDED' | 'BRAIN_TOOL_NOT_FOUND' | 'BRAIN_TOOL_EXECUTION_FAILED' | 'BRAIN_TOOL_TIMEOUT' | 'BRAIN_VERIFICATION_FAILED' | 'BRAIN_COMMIT_FAILED' | 'BRAIN_MODEL_TIMEOUT' | 'BRAIN_MODEL_UNAVAILABLE' | 'BRAIN_POLICY_DENIED' | 'BRAIN_CANCELLED' | 'BRAIN_STOPPED' | 'BRAIN_INTERNAL_ERROR';
export declare function sanitizeBrainErrorMessage(raw: string): string;
export declare class BrainError extends Error {
    readonly code: BrainErrorCode;
    readonly timestamp: number;
    readonly recoverable: boolean;
    constructor(code: BrainErrorCode, message: string, recoverable?: boolean);
}
