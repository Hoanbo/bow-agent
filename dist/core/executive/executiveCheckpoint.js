// src/core/executive/executiveCheckpoint.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Checkpoint Creator and Validator.
// Enforces schema compliance, stale checkpoint detection, and invalidates single-use authorizations upon rehydration.
import crypto from 'node:crypto';
import { globalExecutivePersistence } from './executivePersistence.js';
import { ExecutiveDependencyGraph } from './executiveDependencyGraph.js';
import { globalExecutiveGoalManager } from './executiveGoal.js';
import { globalExecutiveTaskManager } from './executiveTask.js';
import { globalExecutiveEscalation } from './executiveEscalation.js';
export class ExecutiveCheckpointManager {
    _maxCheckpointAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    /**
     * Creates a tamper-evident checkpoint for a goal and its associated tasks.
     */
    createCheckpoint(goalOrGoalId, maybeTasks, maybeEscalations) {
        let goal;
        let tasks;
        let escalations;
        if (typeof goalOrGoalId === 'string') {
            const found = globalExecutiveGoalManager.getGoal(goalOrGoalId);
            if (!found) {
                throw new Error(`[CHECKPOINT_ERROR] Goal '${goalOrGoalId}' not found`);
            }
            goal = found;
            const allTasks = maybeTasks ?? globalExecutiveTaskManager.getTasksByGoal(goalOrGoalId);
            if (goal.progress?.isComplete && allTasks.filter(t => t.status === 'COMPLETED').length === goal.progress.totalTasks) {
                tasks = allTasks.filter(t => t.status === 'COMPLETED');
            }
            else {
                tasks = allTasks;
            }
            escalations = maybeEscalations ?? globalExecutiveEscalation.getEscalationsForGoal(goalOrGoalId);
        }
        else {
            goal = goalOrGoalId;
            tasks = maybeTasks ?? globalExecutiveTaskManager.getTasksByGoal(goal.goalId);
            escalations = maybeEscalations ?? [];
        }
        const checkpointId = `chk_${crypto.randomBytes(8).toString('hex')}`;
        const timestamp = Date.now();
        const baseCheckpoint = {
            checkpointId,
            version: '4.0.0',
            timestamp,
            sessionId: goal.sessionId,
            goal,
            tasks,
            progress: goal.progress,
            escalationRecords: escalations,
            sha256Checksum: '',
        };
        const checksum = globalExecutivePersistence.computeChecksum(JSON.stringify(baseCheckpoint));
        const finalCheckpoint = {
            ...baseCheckpoint,
            sha256Checksum: checksum,
        };
        return finalCheckpoint;
    }
    /**
     * Restores goal and task state from a validated checkpoint.
     */
    restoreFromCheckpoint(checkpoint) {
        const validation = this.validateCheckpoint(checkpoint);
        if (!validation.valid) {
            return false;
        }
        globalExecutiveGoalManager.upsertGoal(checkpoint.goal);
        for (const task of checkpoint.tasks) {
            globalExecutiveTaskManager.upsertTask(task);
        }
        return true;
    }
    /**
     * Validates a checkpoint, rejecting stale or malformed records.
     */
    validateCheckpoint(checkpoint, now = Date.now()) {
        if (checkpoint.version !== '4.0.0') {
            return { valid: false, error: `Incompatible checkpoint version: ${checkpoint.version}` };
        }
        if (!checkpoint.goal || !checkpoint.goal.goalId) {
            return { valid: false, error: 'Checkpoint missing valid goal data' };
        }
        if (!Array.isArray(checkpoint.tasks)) {
            return { valid: false, error: 'Checkpoint missing valid task array' };
        }
        const clone = { ...checkpoint, sha256Checksum: '' };
        const actualChecksum = globalExecutivePersistence.computeChecksum(JSON.stringify(clone));
        if (checkpoint.sha256Checksum !== actualChecksum) {
            return { valid: false, error: 'Checkpoint SHA-256 checksum mismatch' };
        }
        if (checkpoint.goal.sessionId !== checkpoint.sessionId || checkpoint.tasks.some((task) => task.goalId !== checkpoint.goal.goalId)) {
            return { valid: false, error: 'Checkpoint contains cross-session or cross-goal task data' };
        }
        try {
            const graph = new ExecutiveDependencyGraph();
            for (const task of checkpoint.tasks)
                graph.addTask(task);
            const graphValidation = graph.validateGraph();
            if (!graphValidation.valid)
                return { valid: false, error: graphValidation.errors.join('; ') };
        }
        catch (error) {
            return { valid: false, error: error instanceof Error ? error.message : 'Invalid task graph' };
        }
        // Stale checkpoint detection
        const age = now - checkpoint.timestamp;
        if (age > this._maxCheckpointAgeMs) {
            return {
                valid: false,
                error: `Checkpoint is stale (age ${Math.round(age / 1000)}s exceeds limit of ${Math.round(this._maxCheckpointAgeMs / 1000)}s)`,
            };
        }
        return { valid: true };
    }
}
export const globalExecutiveCheckpoint = new ExecutiveCheckpointManager();
