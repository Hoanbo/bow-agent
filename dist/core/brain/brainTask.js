// src/core/brain/brainTask.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN TASK MODEL
//
// A BrainTask is the fundamental unit of work in the BOWCON Brain Runtime.
// Tasks are fully isolated from each other and from sessions/devices/brain identity.
//
// INVARIANTS:
// TASK_ID != SESSION_ID — Tasks are not tied to session lifecycle
// TASK_ID != DEVICE_ID  — Tasks are not tied to device identity
// TASK_ID != BRAIN_ID   — Tasks are not tied to brain identity
// Task history is append-only; already-committed steps are never re-executed.
import { makeBrainTaskId, BRAIN_TASK_DEFAULT_DEADLINE_MS, isBrainTaskTerminal, appendBrainAuditEvent, } from './brainTypes.js';
import { BrainError } from './brainFailure.js';
export class BrainTask {
    taskId;
    brainId;
    createdAt;
    userText;
    userId;
    sessionId;
    priority;
    riskLevel;
    deadline;
    parentTaskId;
    metadata;
    _status = 'PENDING';
    _updatedAt;
    _attemptCount = 0;
    _recoveryDepth = 0;
    _iterationCount = 0;
    _currentStepIndex = 0;
    _plan;
    _executionHistory = [];
    _observations = [];
    _verificationRecord;
    _verificationStatus = 'UNVERIFIED';
    _commitState = 'UNCOMMITTED';
    _failure;
    _result;
    _isCancellationRequested = false;
    _isPauseRequested = false;
    _ledger;
    constructor(brainId, input, ledger) {
        this.taskId = makeBrainTaskId();
        this.brainId = brainId;
        this.createdAt = Date.now();
        this._updatedAt = this.createdAt;
        this.userText = input.userText;
        this.userId = input.userId;
        this.sessionId = input.sessionId;
        this.priority = input.priority ?? 'NORMAL';
        this.riskLevel = input.riskLevel ?? 'LOW';
        this.deadline = this.createdAt + (input.deadlineMs ?? BRAIN_TASK_DEFAULT_DEADLINE_MS);
        this.parentTaskId = input.parentTaskId;
        this.metadata = Object.freeze({ ...input.metadata });
        this._ledger = ledger;
    }
    // ---------------------------------------------------------------------------
    // Getters
    // ---------------------------------------------------------------------------
    get status() { return this._status; }
    get updatedAt() { return this._updatedAt; }
    get attemptCount() { return this._attemptCount; }
    get recoveryDepth() { return this._recoveryDepth; }
    get iterationCount() { return this._iterationCount; }
    get currentStepIndex() { return this._currentStepIndex; }
    get plan() { return this._plan; }
    get executionHistory() { return this._executionHistory; }
    get observations() { return this._observations; }
    get verificationRecord() { return this._verificationRecord; }
    get verificationStatus() { return this._verificationStatus; }
    get commitState() { return this._commitState; }
    get failure() { return this._failure; }
    get result() { return this._result; }
    get isTerminal() { return isBrainTaskTerminal(this._status); }
    get isCancellationRequested() { return this._isCancellationRequested; }
    get isPauseRequested() { return this._isPauseRequested; }
    get isDeadlineExceeded() { return Date.now() > this.deadline; }
    // ---------------------------------------------------------------------------
    // Status Transition (fail-closed)
    // ---------------------------------------------------------------------------
    setStatus(newStatus, reason) {
        if (this.isTerminal && newStatus !== this._status) {
            throw new BrainError('BRAIN_TASK_ALREADY_TERMINAL', `Task "${this.taskId}" is in terminal status "${this._status}" — cannot transition to "${newStatus}".`);
        }
        const prev = this._status;
        this._status = newStatus;
        this._updatedAt = Date.now();
        if (this._ledger) {
            appendBrainAuditEvent(this._ledger, {
                type: 'TASK_STATUS_CHANGED',
                brainId: this.brainId,
                taskId: this.taskId,
                data: { from: prev, to: newStatus, reason },
            });
        }
    }
    // ---------------------------------------------------------------------------
    // Iteration & Recovery tracking
    // ---------------------------------------------------------------------------
    incrementIteration() {
        this._iterationCount++;
    }
    incrementAttempt() {
        this._attemptCount++;
    }
    incrementRecoveryDepth() {
        this._recoveryDepth++;
    }
    // ---------------------------------------------------------------------------
    // Plan management
    // ---------------------------------------------------------------------------
    setPlan(plan) {
        this._plan = plan;
        if (this._ledger) {
            appendBrainAuditEvent(this._ledger, {
                type: 'PLAN_CREATED',
                brainId: this.brainId,
                taskId: this.taskId,
                data: { planId: plan.planId, steps: plan.steps.length },
            });
        }
    }
    advanceStep() {
        this._currentStepIndex++;
    }
    // ---------------------------------------------------------------------------
    // Execution History (append-only — never remove committed steps)
    // ---------------------------------------------------------------------------
    recordExecution(record) {
        this._executionHistory.push(record);
        if (this._ledger) {
            appendBrainAuditEvent(this._ledger, {
                type: 'ACTION_EXECUTED',
                brainId: this.brainId,
                taskId: this.taskId,
                data: {
                    executionId: record.executionId,
                    tool: record.toolName,
                    succeeded: record.succeeded,
                },
            });
        }
    }
    // ---------------------------------------------------------------------------
    // Observations (append-only)
    // ---------------------------------------------------------------------------
    recordObservation(obs) {
        this._observations.push(obs);
        if (this._ledger) {
            appendBrainAuditEvent(this._ledger, {
                type: 'OBSERVATION_RECEIVED',
                brainId: this.brainId,
                taskId: this.taskId,
                data: { observationId: obs.observationId, allMet: obs.allMet },
            });
        }
    }
    // ---------------------------------------------------------------------------
    // Verification
    // ---------------------------------------------------------------------------
    setVerification(rec) {
        this._verificationRecord = rec;
        this._verificationStatus = rec.status;
        if (this._ledger) {
            appendBrainAuditEvent(this._ledger, {
                type: 'VERIFICATION_COMPLETED',
                brainId: this.brainId,
                taskId: this.taskId,
                data: { passed: rec.passed, status: rec.status },
            });
        }
    }
    // ---------------------------------------------------------------------------
    // Commit
    // ---------------------------------------------------------------------------
    setCommitState(state) {
        this._commitState = state;
        if (state === 'COMMITTED' && this._ledger) {
            appendBrainAuditEvent(this._ledger, {
                type: 'COMMIT_COMPLETED',
                brainId: this.brainId,
                taskId: this.taskId,
            });
        }
    }
    // ---------------------------------------------------------------------------
    // Final result
    // ---------------------------------------------------------------------------
    setResult(result) {
        this._result = result;
        this.setStatus(result.success ? 'COMPLETED' : 'FAILED');
    }
    // ---------------------------------------------------------------------------
    // Failure recording
    // ---------------------------------------------------------------------------
    recordFailure(failure) {
        this._failure = failure;
        this.setStatus('FAILED', failure.message);
        if (this._ledger) {
            appendBrainAuditEvent(this._ledger, {
                type: 'TASK_FAILED',
                brainId: this.brainId,
                taskId: this.taskId,
                data: { code: failure.code, message: failure.message },
            });
        }
    }
    // ---------------------------------------------------------------------------
    // Cancellation & Pause
    // ---------------------------------------------------------------------------
    requestCancellation() {
        this._isCancellationRequested = true;
    }
    requestPause() {
        this._isPauseRequested = true;
    }
    clearPauseRequest() {
        this._isPauseRequested = false;
    }
    // ---------------------------------------------------------------------------
    // Snapshot
    // ---------------------------------------------------------------------------
    getSnapshot() {
        return {
            taskId: this.taskId,
            status: this._status,
            attemptCount: this._attemptCount,
            iterationCount: this._iterationCount,
            recoveryDepth: this._recoveryDepth,
            verificationStatus: this._verificationStatus,
            commitState: this._commitState,
            hasResult: this._result !== undefined,
            hasFailure: this._failure !== undefined,
            isDeadlineExceeded: this.isDeadlineExceeded,
            updatedAt: this._updatedAt,
        };
    }
}
