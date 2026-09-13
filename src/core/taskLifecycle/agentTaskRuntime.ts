// src/core/taskLifecycle/agentTaskRuntime.ts
// BOWCON V4.0 — MS-1.4.01: AGENT TASK LIFECYCLE & STATE ENGINE RUNTIME
//
// EN:
// Authoritative Central Façade for Agent Task Lifecycle & State Engine.
// Coordinates task creation, state transitions, step progression, crash rehydration,
// optimistic concurrency control, immutable audit recording, and USER_STOP supremacy.
//
// VI:
// Cổng trung tâm có thẩm quyền cho Phân hệ Vòng đời & Máy Trạng thái Nhiệm vụ Agent.
// Điều phối khởi tạo nhiệm vụ, chuyển trạng thái, tiến trình bước, tái lập sự cố,
// kiểm soát đồng thời lạc quan, ghi nhận nhật ký kiểm toán bất biến và tối thượng quyền USER_STOP.

import { globalAuditLedger, type AuditLedger } from '../auditLedger.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import {
  type AgentTask,
  type TaskStep,
  type TaskState,
  type CreateAgentTaskOptions,
  type TaskTransitionOptions,
  type UpdateStepOptions,
  type RehydrationResult,
  createTaskId,
  createStepId,
  TaskNotFoundError,
  TaskValidationError,
  UserStopActiveError,
} from './agentTaskTypes.js';
import { AgentTaskStateEngine, globalAgentTaskStateEngine } from './agentTaskStateEngine.js';
import { AgentTaskStore, type AgentTaskStoreOptions } from './agentTaskStore.js';

export interface AgentTaskRuntimeOptions extends AgentTaskStoreOptions {
  readonly isUserStopActive?: () => boolean;
  readonly auditLedger?: AuditLedger;
  readonly stateEngine?: AgentTaskStateEngine;
}

export class AgentTaskRuntime {
  private readonly store: AgentTaskStore;
  private readonly stateEngine: AgentTaskStateEngine;
  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly externalUserStopFn?: () => boolean;
  private internalUserStop = false;

  constructor(options?: AgentTaskRuntimeOptions) {
    this.store = new AgentTaskStore(options);
    this.stateEngine = options?.stateEngine ?? globalAgentTaskStateEngine;
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.externalUserStopFn = options?.isUserStopActive ?? (() => {
      try {
        return globalMasterHumanAuthority.isUserStopActive;
      } catch {
        return false;
      }
    });
  }

  /**
   * EN: Sets the internal USER_STOP flag.
   * VI: Đặt cờ USER_STOP nội bộ.
   */
  public setUserStopActive(active: boolean): void {
    this.internalUserStop = active;
  }

  /**
   * EN: Returns true if USER_STOP is active from either external or internal provider.
   * VI: Trả về true nếu USER_STOP đang kích hoạt từ nguồn ngoài hoặc cờ nội bộ.
   */
  public isUserStopActive(): boolean {
    if (this.internalUserStop) return true;
    if (this.externalUserStopFn && this.externalUserStopFn()) return true;
    return false;
  }

  /**
   * EN: Asserts that USER_STOP is not active, throwing UserStopActiveError if it is.
   * VI: Khẳng định USER_STOP không kích hoạt, ném UserStopActiveError nếu đang kích hoạt.
   */
  public assertUserStopInactive(operation: string): void {
    if (this.isUserStopActive()) {
      throw new UserStopActiveError(operation);
    }
  }

  /**
   * EN: Creates and persists a new Agent Task in SUBMITTED state.
   * VI: Tạo mới và lưu trữ một Nhiệm vụ Agent ở trạng thái SUBMITTED.
   */
  public createTask(opts: CreateAgentTaskOptions): AgentTask {
    this.assertUserStopInactive('createTask');

    if (!opts.tenantId?.trim()) throw new TaskValidationError('tenantId is required');
    if (!opts.userId?.trim()) throw new TaskValidationError('userId is required');
    if (!opts.title?.trim()) throw new TaskValidationError('title is required');
    if (!opts.intent?.trim()) throw new TaskValidationError('intent is required');

    const tenantId = opts.tenantId.trim();
    const taskId = opts.customTaskId?.trim() || createTaskId(tenantId);
    const nowIso = new Date().toISOString();

    const initialSteps: TaskStep[] = (opts.steps ?? []).map((s, idx) => ({
      stepId: createStepId(taskId, idx),
      stepIndex: idx,
      description: s.description,
      capabilityId: s.capabilityId,
      actionName: s.actionName,
      parameters: s.parameters ?? {},
      riskLevel: s.riskLevel ?? 'LOW',
      requiresApproval: s.requiresApproval ?? (s.riskLevel === 'HIGH' || s.riskLevel === 'CRITICAL'),
      status: 'PENDING',
      attemptCount: 0,
      maxAttempts: s.maxAttempts ?? 3,
    }));

    const initialProvenance = this.store.calculateProvenanceHash({
      taskId,
      tenantId,
      state: 'SUBMITTED',
      version: 1,
      timestamp: nowIso,
      previousHash: '0000000000000000000000000000000000000000000000000000000000000000',
    });

    const task: AgentTask = {
      taskId,
      tenantId,
      userId: opts.userId.trim(),
      title: opts.title.trim(),
      intent: opts.intent.trim(),
      riskLevel: opts.riskLevel ?? 'LOW',
      state: 'SUBMITTED',
      version: 1,
      steps: Object.freeze(initialSteps),
      currentStepIndex: initialSteps.length > 0 ? 0 : -1,
      createdAt: nowIso,
      updatedAt: nowIso,
      previousProvenanceHash: '0000000000000000000000000000000000000000000000000000000000000000',
      provenanceHash: initialProvenance,
    };

    this.store.saveTask(task);

    this.auditLedger.record({
      timestamp: nowIso,
      eventType: 'AGENT_TASK_CREATED',
      domain: 'agent_task_lifecycle',
      toolName: 'agent_task_create',
      classification: 'OBSERVE',
      argumentsHash: '',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: task.provenanceHash,
      actor: {
        userId: task.userId,
        role: 'USER',
        channel: 'AGENT_TASK_LIFECYCLE',
      },
      tenantId: task.tenantId,
      metadata: {
        taskId: task.taskId,
        state: task.state,
        version: task.version,
        riskLevel: task.riskLevel,
        stepCount: task.steps.length,
        fingerprint: task.provenanceHash,
      },
    } as any);

    return task;
  }

  /**
   * EN: Retrieves an Agent Task by ID from its tenant partition.
   * VI: Lấy một Nhiệm vụ Agent theo ID từ phân vùng tenant của nó.
   */
  public getTask(tenantId: string, taskId: string): AgentTask {
    const task = this.store.getTask(tenantId, taskId);
    if (!task) {
      throw new TaskNotFoundError(taskId, tenantId);
    }
    return task;
  }

  /**
   * EN: Lists all tasks in a tenant partition.
   * VI: Liệt kê tất cả các nhiệm vụ trong phân vùng tenant.
   */
  public listTasks(tenantId: string): readonly AgentTask[] {
    return this.store.listTasks(tenantId);
  }

  /**
   * EN: Transitions an Agent Task to a new state with optimistic concurrency validation.
   * VI: Chuyển đổi trạng thái Nhiệm vụ Agent với kiểm thực đồng thời lạc quan.
   */
  public transitionTask(
    tenantId: string,
    taskId: string,
    opts: TaskTransitionOptions
  ): AgentTask {
    this.assertUserStopInactive('transitionTask');

    const currentTask = this.getTask(tenantId, taskId);

    // 1. Verify optimistic concurrency version
    this.stateEngine.verifyVersion(currentTask.version, opts.expectedVersion, taskId);

    // 2. Validate state transition matrix
    this.stateEngine.assertValidTransition(
      currentTask.state,
      opts.toState,
      taskId,
      opts.reason
    );

    // 3. Compute new version and timestamp
    const nextVersion = currentTask.version + 1;
    const nowIso = new Date().toISOString();

    // 4. Calculate cryptographic SHA-256 provenance hash
    const nextProvenance = this.store.calculateProvenanceHash({
      taskId,
      tenantId,
      state: opts.toState,
      version: nextVersion,
      timestamp: nowIso,
      previousHash: currentTask.provenanceHash,
    });

    const isTerminal = this.stateEngine.isTerminalState(opts.toState);

    const updatedTask: AgentTask = {
      ...currentTask,
      state: opts.toState,
      version: nextVersion,
      updatedAt: nowIso,
      completedAt: isTerminal ? nowIso : currentTask.completedAt,
      failureReason: opts.failureReason ?? currentTask.failureReason,
      recoveryReason: opts.recoveryReason ?? currentTask.recoveryReason,
      previousProvenanceHash: currentTask.provenanceHash,
      provenanceHash: nextProvenance,
    };

    // 5. Persist updated task atomically
    this.store.saveTask(updatedTask);

    // 6. Record immutable structured audit event
    this.auditLedger.record({
      timestamp: nowIso,
      eventType: 'AGENT_TASK_STATE_TRANSITION',
      domain: 'agent_task_lifecycle',
      toolName: `agent_task_${opts.toState.toLowerCase()}`,
      classification: 'OBSERVE',
      argumentsHash: '',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: updatedTask.provenanceHash,
      actor: {
        userId: updatedTask.userId,
        role: 'USER',
        channel: 'AGENT_TASK_LIFECYCLE',
      },
      tenantId: updatedTask.tenantId,
      metadata: {
        taskId: updatedTask.taskId,
        fromState: currentTask.state,
        toState: updatedTask.state,
        version: updatedTask.version,
        fingerprint: updatedTask.provenanceHash,
        reason: opts.reason,
        failureReason: opts.failureReason,
      },
    } as any);

    return updatedTask;
  }

  /**
   * EN: Updates the status of an individual step within a task.
   * VI: Cập nhật trạng thái của một bước riêng lẻ trong nhiệm vụ.
   */
  public updateStep(
    tenantId: string,
    taskId: string,
    opts: UpdateStepOptions
  ): AgentTask {
    this.assertUserStopInactive('updateStep');

    const currentTask = this.getTask(tenantId, taskId);
    this.stateEngine.verifyVersion(currentTask.version, opts.expectedVersion, taskId);
    this.stateEngine.assertNotTerminal(currentTask.state, taskId);

    if (opts.stepIndex < 0 || opts.stepIndex >= currentTask.steps.length) {
      throw new TaskValidationError(
        `Step index ${opts.stepIndex} is out of bounds for task ${taskId} (step count: ${currentTask.steps.length})`
      );
    }

    const currentStep = currentTask.steps[opts.stepIndex];
    this.stateEngine.assertValidStepTransition(currentStep.status, opts.status, currentStep.stepId);

    const nowIso = new Date().toISOString();
    const nextVersion = currentTask.version + 1;

    const updatedStep: TaskStep = {
      ...currentStep,
      status: opts.status,
      attemptCount: opts.status === 'RUNNING' ? currentStep.attemptCount + 1 : currentStep.attemptCount,
      executionTokenId: opts.executionTokenId ?? currentStep.executionTokenId,
      executionResult: opts.executionResult ?? currentStep.executionResult,
      error: opts.error ?? currentStep.error,
    };

    const newSteps = [...currentTask.steps];
    newSteps[opts.stepIndex] = updatedStep;

    const nextProvenance = this.store.calculateProvenanceHash({
      taskId,
      tenantId,
      state: currentTask.state,
      version: nextVersion,
      timestamp: nowIso,
      previousHash: currentTask.provenanceHash,
    });

    // Advance currentStepIndex if current step completed
    let nextStepIndex = currentTask.currentStepIndex;
    if (opts.status === 'COMPLETED' && opts.stepIndex === currentTask.currentStepIndex) {
      nextStepIndex = Math.min(opts.stepIndex + 1, currentTask.steps.length);
    }

    const updatedTask: AgentTask = {
      ...currentTask,
      steps: Object.freeze(newSteps),
      currentStepIndex: nextStepIndex,
      version: nextVersion,
      updatedAt: nowIso,
      previousProvenanceHash: currentTask.provenanceHash,
      provenanceHash: nextProvenance,
    };

    this.store.saveTask(updatedTask);

    this.auditLedger.record({
      timestamp: nowIso,
      eventType: 'AGENT_TASK_STEP_UPDATED',
      domain: 'agent_task_lifecycle',
      toolName: 'agent_task_step_update',
      classification: 'OBSERVE',
      argumentsHash: '',
      policyDecision: 'PERMIT',
      executionStatus: 'SUCCESS',
      resultHash: updatedTask.provenanceHash,
      actor: {
        userId: updatedTask.userId,
        role: 'USER',
        channel: 'AGENT_TASK_LIFECYCLE',
      },
      tenantId: updatedTask.tenantId,
      metadata: {
        taskId: updatedTask.taskId,
        stepId: updatedStep.stepId,
        stepIndex: opts.stepIndex,
        stepStatus: updatedStep.status,
        version: updatedTask.version,
        fingerprint: updatedTask.provenanceHash,
      },
    } as any);

    return updatedTask;
  }

  /**
   * EN: Pauses an active task.
   * VI: Tạm dừng một nhiệm vụ đang hoạt động.
   */
  public pauseTask(
    tenantId: string,
    taskId: string,
    expectedVersion: number,
    reason?: string
  ): AgentTask {
    return this.transitionTask(tenantId, taskId, {
      toState: 'PAUSED',
      expectedVersion,
      reason: reason ?? 'Task paused by operator',
    });
  }

  /**
   * EN: Resumes a paused task to an active operational state.
   * VI: Tiếp tục một nhiệm vụ đã tạm dừng chuyển sang trạng thái hoạt động.
   */
  public resumeTask(
    tenantId: string,
    taskId: string,
    expectedVersion: number,
    targetState: 'ACCEPTED' | 'PLANNING' | 'EXECUTING' = 'EXECUTING'
  ): AgentTask {
    return this.transitionTask(tenantId, taskId, {
      toState: targetState,
      expectedVersion,
      reason: 'Task resumed from pause',
    });
  }

  /**
   * EN: Cancels an Agent Task, transitioning it to terminal CANCELLED state.
   * VI: Hủy một Nhiệm vụ Agent, chuyển nó sang trạng thái kết thúc CANCELLED.
   */
  public cancelTask(
    tenantId: string,
    taskId: string,
    expectedVersion: number,
    reason?: string
  ): AgentTask {
    return this.transitionTask(tenantId, taskId, {
      toState: 'CANCELLED',
      expectedVersion,
      reason: reason ?? 'Task cancelled by operator or user request',
    });
  }

  /**
   * EN: Rehydrates tasks from tenant partition and recovers interrupted tasks.
   * VI: Tái lập nhiệm vụ từ phân vùng tenant và phục hồi các nhiệm vụ bị ngắt quãng.
   */
  public rehydrate(tenantId: string): RehydrationResult {
    const result = this.store.rehydrate(tenantId, {
      isUserStopActive: () => this.isUserStopActive(),
    });

    for (const recovered of result.recovered) {
      this.auditLedger.record({
        timestamp: new Date().toISOString(),
        eventType: 'AGENT_TASK_CRASH_RECOVERED',
        domain: 'agent_task_lifecycle',
        toolName: 'agent_task_crash_recover',
        classification: 'OBSERVE',
        argumentsHash: '',
        policyDecision: 'PERMIT',
        executionStatus: 'SUCCESS',
        resultHash: recovered.provenanceHash,
        actor: {
          userId: recovered.userId,
          role: 'SYSTEM',
          channel: 'AGENT_TASK_LIFECYCLE',
        },
        tenantId: recovered.tenantId,
        metadata: {
          taskId: recovered.taskId,
          state: recovered.state,
          version: recovered.version,
          recoveryReason: recovered.recoveryReason,
          fingerprint: recovered.provenanceHash,
        },
      } as any);
    }

    return result;
  }
}

export const globalAgentTaskRuntime = new AgentTaskRuntime();
