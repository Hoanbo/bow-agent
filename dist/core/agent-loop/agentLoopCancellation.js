// src/core/agent-loop/agentLoopCancellation.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Cooperative Cancellation Engine.
//
// Invariants:
// USER_STOP > ACTIVE_TASK
// Immediate abort signal propagation across loop iterations and async tasks.
export class AgentLoopCancellationManager {
    abortController = new AbortController();
    cancellationReason;
    get signal() {
        return this.abortController.signal;
    }
    isCancelled() {
        return this.abortController.signal.aborted;
    }
    getReason() {
        return this.cancellationReason;
    }
    cancelAll(reason) {
        if (!this.abortController.signal.aborted) {
            this.cancellationReason = reason;
            this.abortController.abort(new Error(reason));
        }
    }
    reset() {
        this.abortController = new AbortController();
        this.cancellationReason = undefined;
    }
    throwIfCancelled() {
        if (this.abortController.signal.aborted) {
            throw new Error(`OPERATION_CANCELLED: ${this.cancellationReason || 'Operation was aborted by USER_STOP.'}`);
        }
    }
}
export const globalAgentLoopCancellation = new AgentLoopCancellationManager();
