export type ToolExecutionGateCheckpoint = 'GATE_1_BEFORE_REQUEST_ACCEPTANCE' | 'GATE_2_BEFORE_ADAPTER_RESOLUTION' | 'GATE_3_BEFORE_ADAPTER_INVOCATION' | 'GATE_4_BEFORE_RESULT_EMISSION';
export interface ToolExecutionGateOptions {
    readonly isUserStopActive?: () => boolean;
    readonly getUserStopReason?: () => string | undefined;
}
export declare class ToolExecutionGate {
    private readonly isUserStopActiveFn;
    private readonly getUserStopReasonFn;
    constructor(options?: ToolExecutionGateOptions);
    /**
     * Evaluates USER_STOP at a specific execution checkpoint.
     * Throws ToolExecutionAbortedError immediately if USER_STOP is active.
     */
    assertExecutionPermitted(checkpoint: ToolExecutionGateCheckpoint, context?: Readonly<Record<string, unknown>>): void;
    /**
     * Returns whether USER_STOP is currently active without throwing.
     */
    isUserStopActive(): boolean;
    /**
     * Convenience checkpoint 1 assertion.
     */
    assertCanAcceptRequest(context?: Readonly<Record<string, unknown>>): void;
    /**
     * Convenience checkpoint 2 assertion.
     */
    assertCanResolveAdapter(context?: Readonly<Record<string, unknown>>): void;
    /**
     * Convenience checkpoint 3 assertion.
     */
    assertCanInvokeAdapter(context?: Readonly<Record<string, unknown>>): void;
    /**
     * Convenience checkpoint 4 assertion.
     */
    assertCanEmitResult(context?: Readonly<Record<string, unknown>>): void;
}
export declare const globalToolExecutionGate: ToolExecutionGate;
