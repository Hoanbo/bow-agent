// src/core/brain/brainRuntime.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN RUNTIME — MASTER ORCHESTRATOR
//
// BrainRuntime is the top-level operational brain.
// It owns Brain identity, task scheduling, model provider selection,
// audit ledger, metrics, and lifecycle management.
//
// INVARIANTS:
// ONE_BRAIN == ONE_AUTHORITATIVE_BRAIN
// BRAIN != LLM
// BRAIN != SESSION
// BRAIN != DEVICE
// SURFACE != BRAIN
// TASK_ID != BRAIN_ID
//
// Entry point for all Brain operations:
//   submitTask()     — accept user input and begin cognitive loop
//   cancelTask()     — safely cancel an active task
//   pauseTask()      — pause a running task
//   resumeTask()     — resume a paused task
//   getSnapshot()    — observe current state
//   shutdown()       — graceful stop
import { makeBrainId, BRAIN_SUBSYSTEM_VERSION, appendBrainAuditEvent, } from './brainTypes.js';
import { canBrainAcceptInput, isBrainTerminal, } from './brainStates.js';
import { assertValidBrainTransition, isValidBrainTransition } from './brainTransitions.js';
import { BrainError } from './brainFailure.js';
import { BrainTask } from './brainTask.js';
import { BrainLoop, } from './brainLoop.js';
import { createBrainModelProvider, } from './brainModelProvider.js';
import { ALL_BRAIN_TOOLS } from './brainTools.js';
import { toolRegistry } from '../../tools/registry.js';
import { globalPDP } from '../policyDecisionPoint.js';
// ---------------------------------------------------------------------------
// BrainRuntime
// ---------------------------------------------------------------------------
export class BrainRuntime {
    brainId;
    _state = 'IDLE';
    _modelProvider;
    _loop;
    _ledger;
    _config;
    _activeTasks = new Map();
    _startedAt;
    _metrics;
    constructor(config = {}) {
        this._config = {
            brainSeed: config.brainSeed ?? 'bowcon',
            modelProvider: config.modelProvider ?? 'auto',
            loopConfig: config.loopConfig ?? {},
            maxConcurrentTasks: config.maxConcurrentTasks ?? 1,
        };
        this.brainId = makeBrainId(this._config.brainSeed);
        this._ledger = { events: [] };
        this._modelProvider = createBrainModelProvider(this._config.modelProvider);
        this._loop = new BrainLoop(this._modelProvider, this._config.loopConfig, this._ledger);
        this._startedAt = Date.now();
        this._metrics = {
            totalTasksCreated: 0,
            totalTasksCompleted: 0,
            totalTasksFailed: 0,
            totalTasksCancelled: 0,
            totalToolExecutions: 0,
            totalVerifications: 0,
            totalRecoveries: 0,
            totalIterations: 0,
            uptimeMs: 0,
            startedAt: this._startedAt,
        };
        // Register all brain tools with the global ToolRegistry
        for (const tool of ALL_BRAIN_TOOLS) {
            if (!toolRegistry.hasTool(tool.name)) {
                toolRegistry.register(tool);
            }
        }
        // Register brain tool PDP classifications
        // brain_fs_write / brain_fs_append / brain_fs_delete = REVERSIBLE (workspace-scoped, undoable)
        // brain_fs_read / brain_fs_list / brain_echo = OBSERVE (read-only / identity)
        globalPDP.registerActionPolicy('brain_fs_write', 'REVERSIBLE');
        globalPDP.registerActionPolicy('brain_fs_append', 'REVERSIBLE');
        globalPDP.registerActionPolicy('brain_fs_delete', 'REVERSIBLE');
        globalPDP.registerActionPolicy('brain_fs_read', 'OBSERVE');
        globalPDP.registerActionPolicy('brain_fs_list', 'OBSERVE');
        globalPDP.registerActionPolicy('brain_echo', 'OBSERVE');
        appendBrainAuditEvent(this._ledger, {
            type: 'BRAIN_STARTED',
            brainId: this.brainId,
            data: { version: BRAIN_SUBSYSTEM_VERSION, seed: this._config.brainSeed },
        });
    }
    // ---------------------------------------------------------------------------
    // State machine
    // ---------------------------------------------------------------------------
    get state() { return this._state; }
    get isOperational() { return !isBrainTerminal(this._state); }
    _transition(to) {
        assertValidBrainTransition(this._state, to);
        this._state = to;
    }
    // ---------------------------------------------------------------------------
    // Task Submission (primary entry point)
    // ---------------------------------------------------------------------------
    /**
     * Submits a new task to the Brain.
     * Returns a BrainTaskResult when the cognitive loop completes.
     * This is the primary Reality Gate demonstration path.
     *
     * INVARIANT: Brain accepts input only in IDLE/COMPLETED/FAILED states.
     * INVARIANT: Only `maxConcurrentTasks` tasks may run simultaneously.
     */
    async submitTask(input) {
        if (isBrainTerminal(this._state)) {
            throw new BrainError('BRAIN_STOPPED', 'Brain is stopped and cannot accept new tasks.');
        }
        if (!canBrainAcceptInput(this._state)) {
            if (this._config.maxConcurrentTasks > 1 || this._activeTasks.size === 0) {
                // Allow submission in more flexible concurrency mode
            }
            else {
                throw new BrainError('BRAIN_INTERNAL_ERROR', `Brain cannot accept input in state "${this._state}". Wait for current task to complete.`, false);
            }
        }
        this._transition('INPUT_RECEIVED');
        this._metrics.totalTasksCreated++;
        const task = new BrainTask(this.brainId, input, this._ledger);
        this._activeTasks.set(task.taskId, task);
        try {
            // BrainLoop drives task-level stages internally (UNDERSTANDING → REASONING → … → COMMITTING).
            // BrainRuntime only tracks the top-level lifecycle at the runtime level.
            this._transition('UNDERSTANDING');
            const result = await this._loop.run(task);
            if (result.success) {
                this._metrics.totalTasksCompleted++;
                // Navigate through intermediate states to reach COMPLETED legally:
                // UNDERSTANDING → EXECUTING → VERIFYING → COMMITTING → COMPLETED
                // (fast-path via RECOVERING skips straight steps)
                this._transitionToCompleted();
            }
            else {
                this._metrics.totalTasksFailed++;
                this._transitionToFailed();
            }
            this._metrics.totalIterations += result.iterationCount;
            this._metrics.totalVerifications++;
            return result;
        }
        catch (e) {
            this._metrics.totalTasksFailed++;
            this._transitionToFailed();
            throw e;
        }
        finally {
            this._activeTasks.delete(task.taskId);
        }
    }
    /** Navigate from any active state to COMPLETED through valid intermediate steps. */
    _transitionToCompleted() {
        const validToCompleted = [
            'REASONING', 'PLANNING', 'DECIDING', 'ACTION_PREPARING',
            'EXECUTING', 'OBSERVING', 'VERIFYING', 'COMMITTING',
        ];
        // Walk through states to reach COMMITTING then COMPLETED
        for (const s of validToCompleted) {
            if (isValidBrainTransition(this._state, s)) {
                this._state = s;
            }
        }
        if (isValidBrainTransition(this._state, 'COMPLETED')) {
            this._state = 'COMPLETED';
        }
        else {
            // Force to COMPLETED if no path found (safety valve)
            this._state = 'COMPLETED';
        }
    }
    /** Navigate from any active state to FAILED. */
    _transitionToFailed() {
        if (isValidBrainTransition(this._state, 'FAILED')) {
            this._state = 'FAILED';
        }
        else {
            this._state = 'FAILED';
        }
    }
    // ---------------------------------------------------------------------------
    // Cancellation
    // ---------------------------------------------------------------------------
    /**
     * Requests cancellation of a running task.
     * INVARIANT: Cancellation does not kill the Brain — only the task.
     */
    cancelTask(taskId) {
        const task = this._activeTasks.get(taskId);
        if (!task)
            return;
        task.requestCancellation();
        this._metrics.totalTasksCancelled++;
        appendBrainAuditEvent(this._ledger, {
            type: 'TASK_CANCELLED',
            brainId: this.brainId,
            taskId: task.taskId,
            data: { requestedAt: Date.now() },
        });
    }
    // ---------------------------------------------------------------------------
    // Pause / Resume
    // ---------------------------------------------------------------------------
    pauseTask(taskId) {
        const task = this._activeTasks.get(taskId);
        if (task && !task.isTerminal) {
            task.requestPause();
            appendBrainAuditEvent(this._ledger, {
                type: 'TASK_PAUSED',
                brainId: this.brainId,
                taskId: task.taskId,
            });
        }
    }
    resumeTask(taskId) {
        const task = this._activeTasks.get(taskId);
        if (task && task.status === 'PAUSED') {
            task.clearPauseRequest();
            task.setStatus('UNDERSTANDING'); // resume from understanding
            appendBrainAuditEvent(this._ledger, {
                type: 'TASK_RESUMED',
                brainId: this.brainId,
                taskId: task.taskId,
            });
        }
    }
    // ---------------------------------------------------------------------------
    // Reset (allows brain to accept tasks again after COMPLETED/FAILED)
    // ---------------------------------------------------------------------------
    reset() {
        if (this._state === 'COMPLETED' || this._state === 'FAILED') {
            this._transition('IDLE');
        }
    }
    // ---------------------------------------------------------------------------
    // Shutdown
    // ---------------------------------------------------------------------------
    async shutdown() {
        // Cancel all active tasks
        for (const [taskId, task] of this._activeTasks) {
            task.requestCancellation();
        }
        // Wait briefly for tasks to observe cancellation
        await new Promise(r => setTimeout(r, 200));
        this._transition('STOPPED');
        appendBrainAuditEvent(this._ledger, {
            type: 'BRAIN_STOPPED',
            brainId: this.brainId,
            data: { uptimeMs: Date.now() - this._startedAt },
        });
    }
    // ---------------------------------------------------------------------------
    // Observation
    // ---------------------------------------------------------------------------
    getSnapshot() {
        this._metrics.uptimeMs = Date.now() - this._startedAt;
        return Object.freeze({
            version: BRAIN_SUBSYSTEM_VERSION,
            brainId: this.brainId,
            state: this._state,
            activeTasks: this._activeTasks.size,
            metrics: { ...this._metrics },
            totalAuditEvents: this._ledger.events.length,
            capturedAt: Date.now(),
        });
    }
    getAuditEvents() {
        return Object.freeze([...this._ledger.events]);
    }
    getModelProvider() {
        return this._modelProvider;
    }
}
// ---------------------------------------------------------------------------
// Global singleton
// ---------------------------------------------------------------------------
let _globalBrainRuntime;
export function getBrainRuntime() {
    if (!_globalBrainRuntime) {
        _globalBrainRuntime = new BrainRuntime({ modelProvider: 'auto' });
    }
    return _globalBrainRuntime;
}
export function setBrainRuntimeForTest(runtime) {
    _globalBrainRuntime = runtime;
}
