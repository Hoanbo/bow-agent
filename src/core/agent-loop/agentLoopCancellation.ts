// src/core/agent-loop/agentLoopCancellation.ts
// BOWCON V4.0 — MS-1.3.36: REAL BOWCON CONTINUOUS AGENT OPERATING LOOP & CONTROLLED AUTONOMY RUNTIME
//
// Cooperative Cancellation Engine.
//
// Invariants:
// USER_STOP > ACTIVE_TASK
// Immediate abort signal propagation across loop iterations and async tasks.

export class AgentLoopCancellationManager {
  private abortController: AbortController = new AbortController();
  private cancellationReason?: string;

  public get signal(): AbortSignal {
    return this.abortController.signal;
  }

  public isCancelled(): boolean {
    return this.abortController.signal.aborted;
  }

  public getReason(): string | undefined {
    return this.cancellationReason;
  }

  public cancelAll(reason: string): void {
    if (!this.abortController.signal.aborted) {
      this.cancellationReason = reason;
      this.abortController.abort(new Error(reason));
    }
  }

  public reset(): void {
    this.abortController = new AbortController();
    this.cancellationReason = undefined;
  }

  public throwIfCancelled(): void {
    if (this.abortController.signal.aborted) {
      throw new Error(`OPERATION_CANCELLED: ${this.cancellationReason || 'Operation was aborted by USER_STOP.'}`);
    }
  }
}

export const globalAgentLoopCancellation = new AgentLoopCancellationManager();
