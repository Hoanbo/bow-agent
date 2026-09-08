import { type BrainAuditLedger, type BrainTaskResult } from './brainTypes.js';
import { BrainTask } from './brainTask.js';
import type { BrainModelProvider } from './brainModelProvider.js';
export interface BrainLoopConfig {
    readonly maxIterations?: number;
    readonly maxRecoveryDepth?: number;
    readonly maxRetryAttempts?: number;
    readonly toolTimeoutMs?: number;
    readonly ownerId?: string;
}
export declare const DEFAULT_BRAIN_LOOP_CONFIG: Required<BrainLoopConfig>;
export declare class BrainLoop {
    private readonly _config;
    private readonly _modelProvider;
    private readonly _ledger;
    constructor(modelProvider: BrainModelProvider, config?: BrainLoopConfig, ledger?: BrainAuditLedger);
    /**
     * Execute the full cognitive loop for a single BrainTask.
     * Returns a BrainTaskResult when done (success or failure).
     *
     * The loop never runs more than `maxIterations` cycles and
     * respects task deadlines, cancellation, and pause signals.
     */
    run(task: BrainTask): Promise<BrainTaskResult>;
    private _buildPlan;
    private _executeTool;
    private _observe;
    private _verify;
    private _failTask;
    private _waitForUnpause;
    getLedger(): BrainAuditLedger;
}
