export declare class AgentLoopCancellationManager {
    private abortController;
    private cancellationReason?;
    get signal(): AbortSignal;
    isCancelled(): boolean;
    getReason(): string | undefined;
    cancelAll(reason: string): void;
    reset(): void;
    throwIfCancelled(): void;
}
export declare const globalAgentLoopCancellation: AgentLoopCancellationManager;
