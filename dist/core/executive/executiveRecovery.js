// src/core/executive/executiveRecovery.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Executive Failure Recovery & Supervisor Bridge.
// Enforces bounded retries, autonomous diagnosis via SupervisorRuntime, and escalation gates.
// Invariant: FAILURE != BRAIN_DEATH; USER_STOP > RECOVERY.
import { globalExecutiveCancellation } from './executiveCancellation.js';
import { globalSupervisorRuntime } from '../supervisor/supervisorRuntime.js';
export class ExecutiveRecoveryCoordinator {
    /**
     * Assesses whether a failed task can be autonomously recovered and retried.
     * Classifies failure as: RECOVERABLE, DEGRADED, HUMAN_REQUIRED, or CRITICAL_BLOCKED.
     * Enforces default bounded retries of maxAttempts = 3.
     */
    assessFailure(task, goalId) {
        const maxAttempts = task.retryPolicy?.maxAttempts ?? 3;
        // 1. Check USER_STOP supremacy
        if (globalExecutiveCancellation.isUserStopActive) {
            return {
                recoverable: false,
                classification: 'CRITICAL_BLOCKED',
                reason: 'USER_STOP active: autonomous recovery forbidden',
                suggestedAction: 'ABORT',
                attemptNumber: task.attemptCount,
                maxAttempts,
            };
        }
        // 2. Check risk level and fatal failure criteria (CRITICAL_BLOCKED)
        const fatal = task.failureCriteria?.some((f) => f.fatal) ?? false;
        if (fatal || task.riskLevel === 'CRITICAL') {
            return {
                recoverable: false,
                classification: 'CRITICAL_BLOCKED',
                reason: 'Critical risk or fatal criteria matched: autonomous retry prohibited',
                suggestedAction: 'ESCALATE',
                attemptNumber: task.attemptCount,
                maxAttempts,
            };
        }
        // 3. Check if human intervention/authorization is explicitly required (HUMAN_REQUIRED)
        if (task.permissionLevel === 'AWAIT_HUMAN_AUTHORIZATION') {
            return {
                recoverable: false,
                classification: 'HUMAN_REQUIRED',
                reason: 'Task requires explicit Master Human authorization before retry',
                suggestedAction: 'WAIT_FOR_MASTER_AUTHORIZATION',
                attemptNumber: task.attemptCount,
                maxAttempts,
            };
        }
        // 4. Check retry policy limit (Bounded retries -> DEGRADED)
        if (task.attemptCount >= maxAttempts) {
            return {
                recoverable: false,
                classification: 'DEGRADED',
                reason: `Max retry attempts reached (${task.attemptCount}/${maxAttempts})`,
                suggestedAction: 'ESCALATE',
                attemptNumber: task.attemptCount,
                maxAttempts,
            };
        }
        // 5. Recovery permitted (RECOVERABLE)
        return {
            recoverable: true,
            classification: 'RECOVERABLE',
            reason: `Transient error, eligible for retry (attempt ${task.attemptCount + 1} of ${maxAttempts})`,
            suggestedAction: 'RETRY',
            attemptNumber: task.attemptCount,
            maxAttempts,
        };
    }
    /**
     * Determines if a task has remaining retry attempts.
     */
    shouldRetry(task) {
        const maxAttempts = task.retryPolicy?.maxAttempts ?? 3;
        return task.attemptCount < maxAttempts;
    }
    /**
     * Calculates backoff duration for a task using exponential backoff formula:
     * delay = initialBackoffMs * (backoffFactor ^ attemptCount), capped by maxBackoffMs.
     */
    calculateBackoff(task) {
        const policy = task.retryPolicy;
        const initial = policy?.initialBackoffMs ?? policy?.backoffMs ?? 100;
        const factor = policy?.backoffFactor ?? 2;
        const maxBackoff = policy?.maxBackoffMs ?? 30000;
        const delay = initial * Math.pow(factor, task.attemptCount);
        return Math.min(delay, maxBackoff);
    }
    /**
     * Performs recovery preparation for a failed task via SupervisorRuntime.
     */
    async prepareRecovery(task) {
        if (globalExecutiveCancellation.isUserStopActive) {
            return false;
        }
        // Ask supervisor to diagnose anomaly if supervised
        if (task.recoveryPolicy.supervisorSupervised && !globalSupervisorRuntime.isSafeStopActive()) {
            const anomaly = {
                anomalyId: `anom_exec_${task.taskId}_${Date.now()}`,
                sessionId: 'exec_session',
                deviceId: 'local_host',
                timestamp: Date.now(),
                source: 'EXECUTIVE_TASK',
                type: 'WORLDACTION_EXECUTION_FAILURE',
                severity: 'MEDIUM',
                observedState: { taskId: task.taskId, error: task.error, attempt: task.attemptCount },
                expectedState: { status: 'COMPLETED' },
                evidence: `Executive task failure: ${task.error ?? 'unknown'}`,
                confidence: 0.95,
            };
            try {
                globalSupervisorRuntime.diagnose(anomaly);
            }
            catch {
                // Fail-safe logging; supervisor diagnose error does not crash executive runtime
            }
        }
        return true;
    }
}
export const globalExecutiveRecovery = new ExecutiveRecoveryCoordinator();
