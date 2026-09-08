import { type BrainId, type BrainMetrics, type BrainTaskResult } from './brainTypes.js';
import { type BrainLifecycleState } from './brainStates.js';
import { type BrainTaskInput } from './brainTask.js';
import { type BrainLoopConfig } from './brainLoop.js';
import { type BrainModelProvider } from './brainModelProvider.js';
export interface BrainRuntimeConfig {
    readonly brainSeed?: string;
    readonly modelProvider?: 'deterministic' | 'ollama' | 'auto';
    readonly loopConfig?: BrainLoopConfig;
    readonly maxConcurrentTasks?: number;
}
export interface BrainRuntimeSnapshot {
    readonly version: string;
    readonly brainId: BrainId;
    readonly state: BrainLifecycleState;
    readonly activeTasks: number;
    readonly metrics: BrainMetrics;
    readonly totalAuditEvents: number;
    readonly capturedAt: number;
}
export declare class BrainRuntime {
    readonly brainId: BrainId;
    private _state;
    private readonly _modelProvider;
    private readonly _loop;
    private readonly _ledger;
    private readonly _config;
    private readonly _activeTasks;
    private readonly _startedAt;
    private _metrics;
    constructor(config?: BrainRuntimeConfig);
    get state(): BrainLifecycleState;
    get isOperational(): boolean;
    private _transition;
    /**
     * Submits a new task to the Brain.
     * Returns a BrainTaskResult when the cognitive loop completes.
     * This is the primary Reality Gate demonstration path.
     *
     * INVARIANT: Brain accepts input only in IDLE/COMPLETED/FAILED states.
     * INVARIANT: Only `maxConcurrentTasks` tasks may run simultaneously.
     */
    submitTask(input: BrainTaskInput): Promise<BrainTaskResult>;
    /** Navigate from any active state to COMPLETED through valid intermediate steps. */
    private _transitionToCompleted;
    /** Navigate from any active state to FAILED. */
    private _transitionToFailed;
    /**
     * Requests cancellation of a running task.
     * INVARIANT: Cancellation does not kill the Brain — only the task.
     */
    cancelTask(taskId: string): void;
    pauseTask(taskId: string): void;
    resumeTask(taskId: string): void;
    reset(): void;
    shutdown(): Promise<void>;
    getSnapshot(): BrainRuntimeSnapshot;
    getAuditEvents(): readonly import('./brainTypes.js').BrainAuditEvent[];
    getModelProvider(): BrainModelProvider;
}
export declare function getBrainRuntime(): BrainRuntime;
export declare function setBrainRuntimeForTest(runtime: BrainRuntime): void;
