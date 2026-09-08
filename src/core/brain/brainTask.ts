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

import { randomBytes } from 'node:crypto';
import {
  makeBrainTaskId,
  type BrainTaskId,
  type BrainTaskStatus,
  type BrainTaskRiskLevel,
  type BrainTaskPriority,
  type BrainPlan,
  type BrainToolExecutionRecord,
  type BrainObservation,
  type BrainVerificationRecord,
  type BrainTaskFailure,
  type BrainTaskResult,
  type BrainVerificationStatus,
  type BrainCommitState,
  BRAIN_TASK_DEFAULT_DEADLINE_MS,
  isBrainTaskTerminal,
  appendBrainAuditEvent,
  type BrainAuditLedger,
} from './brainTypes.js';
import { BrainError } from './brainFailure.js';

export interface BrainTaskInput {
  readonly userText: string;
  readonly userId?: string;
  readonly sessionId?: string;
  readonly priority?: BrainTaskPriority;
  readonly riskLevel?: BrainTaskRiskLevel;
  readonly deadlineMs?: number;
  readonly parentTaskId?: BrainTaskId;
  readonly metadata?: Record<string, unknown>;
}

export class BrainTask {
  public readonly taskId: BrainTaskId;
  public readonly brainId: string;
  public readonly createdAt: number;
  public readonly userText: string;
  public readonly userId?: string;
  public readonly sessionId?: string;
  public readonly priority: BrainTaskPriority;
  public readonly riskLevel: BrainTaskRiskLevel;
  public readonly deadline: number;
  public readonly parentTaskId?: BrainTaskId;
  public readonly metadata: Record<string, unknown>;

  private _status: BrainTaskStatus = 'PENDING';
  private _updatedAt: number;
  private _attemptCount = 0;
  private _recoveryDepth = 0;
  private _iterationCount = 0;
  private _currentStepIndex = 0;
  private _plan?: BrainPlan;
  private _executionHistory: BrainToolExecutionRecord[] = [];
  private _observations: BrainObservation[] = [];
  private _verificationRecord?: BrainVerificationRecord;
  private _verificationStatus: BrainVerificationStatus = 'UNVERIFIED';
  private _commitState: BrainCommitState = 'UNCOMMITTED';
  private _failure?: BrainTaskFailure;
  private _result?: BrainTaskResult;
  private _isCancellationRequested = false;
  private _isPauseRequested = false;
  private _ledger?: BrainAuditLedger;

  constructor(brainId: string, input: BrainTaskInput, ledger?: BrainAuditLedger) {
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
  get status(): BrainTaskStatus { return this._status; }
  get updatedAt(): number { return this._updatedAt; }
  get attemptCount(): number { return this._attemptCount; }
  get recoveryDepth(): number { return this._recoveryDepth; }
  get iterationCount(): number { return this._iterationCount; }
  get currentStepIndex(): number { return this._currentStepIndex; }
  get plan(): BrainPlan | undefined { return this._plan; }
  get executionHistory(): readonly BrainToolExecutionRecord[] { return this._executionHistory; }
  get observations(): readonly BrainObservation[] { return this._observations; }
  get verificationRecord(): BrainVerificationRecord | undefined { return this._verificationRecord; }
  get verificationStatus(): BrainVerificationStatus { return this._verificationStatus; }
  get commitState(): BrainCommitState { return this._commitState; }
  get failure(): BrainTaskFailure | undefined { return this._failure; }
  get result(): BrainTaskResult | undefined { return this._result; }
  get isTerminal(): boolean { return isBrainTaskTerminal(this._status); }
  get isCancellationRequested(): boolean { return this._isCancellationRequested; }
  get isPauseRequested(): boolean { return this._isPauseRequested; }
  get isDeadlineExceeded(): boolean { return Date.now() > this.deadline; }

  // ---------------------------------------------------------------------------
  // Status Transition (fail-closed)
  // ---------------------------------------------------------------------------
  public setStatus(newStatus: BrainTaskStatus, reason?: string): void {
    if (this.isTerminal && newStatus !== this._status) {
      throw new BrainError(
        'BRAIN_TASK_ALREADY_TERMINAL',
        `Task "${this.taskId}" is in terminal status "${this._status}" — cannot transition to "${newStatus}".`
      );
    }
    const prev = this._status;
    this._status = newStatus;
    this._updatedAt = Date.now();
    if (this._ledger) {
      appendBrainAuditEvent(this._ledger, {
        type: 'TASK_STATUS_CHANGED',
        brainId: this.brainId as any,
        taskId: this.taskId,
        data: { from: prev, to: newStatus, reason },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Iteration & Recovery tracking
  // ---------------------------------------------------------------------------
  public incrementIteration(): void {
    this._iterationCount++;
  }

  public incrementAttempt(): void {
    this._attemptCount++;
  }

  public incrementRecoveryDepth(): void {
    this._recoveryDepth++;
  }

  // ---------------------------------------------------------------------------
  // Plan management
  // ---------------------------------------------------------------------------
  public setPlan(plan: BrainPlan): void {
    this._plan = plan;
    if (this._ledger) {
      appendBrainAuditEvent(this._ledger, {
        type: 'PLAN_CREATED',
        brainId: this.brainId as any,
        taskId: this.taskId,
        data: { planId: plan.planId, steps: plan.steps.length },
      });
    }
  }

  public advanceStep(): void {
    this._currentStepIndex++;
  }

  // ---------------------------------------------------------------------------
  // Execution History (append-only — never remove committed steps)
  // ---------------------------------------------------------------------------
  public recordExecution(record: BrainToolExecutionRecord): void {
    this._executionHistory.push(record);
    if (this._ledger) {
      appendBrainAuditEvent(this._ledger, {
        type: 'ACTION_EXECUTED',
        brainId: this.brainId as any,
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
  public recordObservation(obs: BrainObservation): void {
    this._observations.push(obs);
    if (this._ledger) {
      appendBrainAuditEvent(this._ledger, {
        type: 'OBSERVATION_RECEIVED',
        brainId: this.brainId as any,
        taskId: this.taskId,
        data: { observationId: obs.observationId, allMet: obs.allMet },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Verification
  // ---------------------------------------------------------------------------
  public setVerification(rec: BrainVerificationRecord): void {
    this._verificationRecord = rec;
    this._verificationStatus = rec.status;
    if (this._ledger) {
      appendBrainAuditEvent(this._ledger, {
        type: 'VERIFICATION_COMPLETED',
        brainId: this.brainId as any,
        taskId: this.taskId,
        data: { passed: rec.passed, status: rec.status },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Commit
  // ---------------------------------------------------------------------------
  public setCommitState(state: BrainCommitState): void {
    this._commitState = state;
    if (state === 'COMMITTED' && this._ledger) {
      appendBrainAuditEvent(this._ledger, {
        type: 'COMMIT_COMPLETED',
        brainId: this.brainId as any,
        taskId: this.taskId,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Final result
  // ---------------------------------------------------------------------------
  public setResult(result: BrainTaskResult): void {
    this._result = result;
    this.setStatus(result.success ? 'COMPLETED' : 'FAILED');
  }

  // ---------------------------------------------------------------------------
  // Failure recording
  // ---------------------------------------------------------------------------
  public recordFailure(failure: BrainTaskFailure): void {
    this._failure = failure;
    this.setStatus('FAILED', failure.message);
    if (this._ledger) {
      appendBrainAuditEvent(this._ledger, {
        type: 'TASK_FAILED',
        brainId: this.brainId as any,
        taskId: this.taskId,
        data: { code: failure.code, message: failure.message },
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Cancellation & Pause
  // ---------------------------------------------------------------------------
  public requestCancellation(): void {
    this._isCancellationRequested = true;
  }

  public requestPause(): void {
    this._isPauseRequested = true;
  }

  public clearPauseRequest(): void {
    this._isPauseRequested = false;
  }

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------
  public getSnapshot(): {
    taskId: BrainTaskId;
    status: BrainTaskStatus;
    attemptCount: number;
    iterationCount: number;
    recoveryDepth: number;
    verificationStatus: BrainVerificationStatus;
    commitState: BrainCommitState;
    hasResult: boolean;
    hasFailure: boolean;
    isDeadlineExceeded: boolean;
    updatedAt: number;
  } {
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
