export interface RetryGovernorOptions {
    readonly maxIterations?: number;
    readonly maxStepAttempts?: number;
    readonly maxConsecutiveDenials?: number;
    readonly maxExecutionTimeMs?: number;
}
export declare class AgentLoopRetryGovernor {
    private readonly maxIterations;
    private readonly maxStepAttempts;
    private readonly maxConsecutiveDenials;
    private readonly maxExecutionTimeMs;
    private currentIteration;
    private consecutiveDenials;
    private readonly stepAttempts;
    private startTimeMs;
    constructor(options?: RetryGovernorOptions);
    /**
     * EN: Initializes the governor at the start of a loop run.
     */
    start(): void;
    /**
     * EN: Returns the current iteration count.
     */
    getIteration(): number;
    /**
     * EN: Increments iteration count and asserts that max iteration bounds are respected.
     */
    advanceIteration(): number;
    /**
     * EN: Asserts that total elapsed execution time is within the maximum allowed window.
     */
    assertWithinTimeLimit(): void;
    /**
     * EN: Records a policy denial. Throws if consecutive denials exceed the hard ceiling.
     */
    recordDenial(stepId: string): void;
    /**
     * EN: Resets consecutive denials counter upon a permitted action.
     */
    resetDenials(): void;
    /**
     * EN: Increments the attempt counter for a specific step.
     */
    recordStepAttempt(stepId: string): number;
    /**
     * EN: Evaluates whether a failure is eligible for transient retry.
     * Returns true ONLY for transient failures within step attempt limits.
     * NEVER allows retry for DENY, security violations, USER_STOP, stale task versions, or commit errors.
     */
    isRetryEligible(params: {
        readonly stepId: string;
        readonly error: Error;
        readonly isTransient?: boolean;
    }): boolean;
    canAttemptStep(stepId: string): boolean;
    canProceedAfterDenial(): boolean;
    isRetryableFailure(error: Error): boolean;
    canIterate(iteration?: number): boolean;
    isTimeExceeded(startTimeMs: number, limitMs?: number): boolean;
    getMaxIterations(): number;
    getMaxStepAttempts(): number;
    getMaxConsecutiveDenials(): number;
    getMaxExecutionTimeMs(): number;
}
