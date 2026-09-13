// src/core/taskLifecycle/agentTaskStateEngine.ts
// BOWCON V4.0 — MS-1.4.01: AGENT TASK LIFECYCLE & STATE ENGINE
//
// EN:
// Authoritative state engine enforcing the 9-state task lifecycle transition matrix,
// terminal state immutability, self-transition restrictions, and step status progression.
//
// VI:
// Máy trạng thái có thẩm quyền thực thi ma trận chuyển đổi vòng đời nhiệm vụ 9 trạng thái,
// tính bất biến của trạng thái kết thúc, hạn chế tự chuyển đổi và sự tiến triển bước.

import {
  type TaskState,
  type TaskStepStatus,
  IllegalStateTransitionError,
  ConcurrencyConflictError,
} from './agentTaskTypes.js';

/**
 * EN: Canonical allowed transitions for Agent Task states.
 * VI: Các chuyển đổi trạng thái hợp lệ chuẩn mực cho Nhiệm vụ Agent.
 */
const VALID_TASK_TRANSITIONS: Readonly<Record<TaskState, ReadonlySet<TaskState>>> = {
  SUBMITTED: new Set(['ACCEPTED', 'CANCELLED', 'FAILED']),
  ACCEPTED: new Set(['PLANNING', 'EXECUTING', 'PAUSED', 'CANCELLED', 'FAILED']),
  PLANNING: new Set(['EXECUTING', 'PAUSED', 'CANCELLED', 'FAILED']),
  EXECUTING: new Set([
    'EXECUTING', // Self-transition explicitly allowed for advancing execution steps
    'AWAITING_APPROVAL',
    'PAUSED',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ]),
  AWAITING_APPROVAL: new Set(['EXECUTING', 'PAUSED', 'CANCELLED', 'FAILED']),
  PAUSED: new Set(['ACCEPTED', 'PLANNING', 'EXECUTING', 'CANCELLED', 'FAILED']),
  COMPLETED: new Set([]), // Terminal state: zero outbound transitions
  FAILED: new Set([]),    // Terminal state: zero outbound transitions
  CANCELLED: new Set([]), // Terminal state: zero outbound transitions
};

/**
 * EN: Canonical allowed transitions for individual Task Step statuses.
 * VI: Các chuyển đổi hợp lệ chuẩn mực cho trạng thái từng Bước Nhiệm vụ.
 */
const VALID_STEP_TRANSITIONS: Readonly<Record<TaskStepStatus, ReadonlySet<TaskStepStatus>>> = {
  PENDING: new Set(['RUNNING', 'AWAITING_APPROVAL', 'SKIPPED', 'FAILED']),
  RUNNING: new Set(['AWAITING_APPROVAL', 'COMPLETED', 'FAILED']),
  AWAITING_APPROVAL: new Set(['RUNNING', 'FAILED', 'SKIPPED']),
  COMPLETED: new Set([]), // Terminal: step is completed
  FAILED: new Set(['RUNNING']), // Retrying failed step if attemptCount < maxAttempts
  SKIPPED: new Set([]),   // Terminal: step was skipped
};

const TERMINAL_STATES: ReadonlySet<TaskState> = new Set(['COMPLETED', 'FAILED', 'CANCELLED']);

export class AgentTaskStateEngine {
  /**
   * EN: Checks whether a transition between two task states is legal.
   * VI: Kiểm tra xem việc chuyển đổi giữa hai trạng thái nhiệm vụ có hợp lệ hay không.
   */
  public isValidTransition(from: TaskState, to: TaskState): boolean {
    if (from === to && from !== 'EXECUTING') {
      // Forbidden self-transition
      return false;
    }
    const allowed = VALID_TASK_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
  }

  /**
   * EN: Asserts that a state transition is legal, throwing IllegalStateTransitionError if not.
   * VI: Khẳng định chuyển đổi trạng thái là hợp lệ, ném IllegalStateTransitionError nếu không.
   */
  public assertValidTransition(
    from: TaskState,
    to: TaskState,
    taskId?: string,
    context?: string
  ): void {
    if (this.isTerminalState(from)) {
      throw new IllegalStateTransitionError(
        from,
        to,
        taskId,
        `Cannot transition out of terminal state '${from}'`
      );
    }

    if (from === to && from !== 'EXECUTING') {
      throw new IllegalStateTransitionError(
        from,
        to,
        taskId,
        `Self-transition is forbidden for state '${from}'`
      );
    }

    if (!this.isValidTransition(from, to)) {
      throw new IllegalStateTransitionError(
        from,
        to,
        taskId,
        context ?? `Transition from '${from}' to '${to}' is not permitted by state matrix`
      );
    }
  }

  /**
   * EN: Returns true if the given state is an immutable terminal state.
   * VI: Trả về true nếu trạng thái cho trước là trạng thái kết thúc bất biến.
   */
  public isTerminalState(state: TaskState): boolean {
    return TERMINAL_STATES.has(state);
  }

  /**
   * EN: Asserts that a task is not in a terminal state.
   * VI: Khẳng định rằng nhiệm vụ không nằm trong trạng thái kết thúc.
   */
  public assertNotTerminal(state: TaskState, taskId?: string): void {
    if (this.isTerminalState(state)) {
      throw new IllegalStateTransitionError(
        state,
        state,
        taskId,
        `Task is already in immutable terminal state '${state}'`
      );
    }
  }

  /**
   * EN: Enforces optimistic concurrency control by checking the expected version.
   * VI: Thực thi kiểm soát đồng thời lạc quan bằng cách kiểm tra phiên bản kỳ vọng.
   */
  public verifyVersion(currentVersion: number, expectedVersion: number, taskId: string): void {
    if (currentVersion !== expectedVersion) {
      throw new ConcurrencyConflictError(taskId, currentVersion, expectedVersion);
    }
  }

  /**
   * EN: Checks whether a step status transition is legal.
   * VI: Kiểm tra xem chuyển đổi trạng thái bước có hợp lệ hay không.
   */
  public isValidStepTransition(from: TaskStepStatus, to: TaskStepStatus): boolean {
    if (from === to) return false;
    const allowed = VALID_STEP_TRANSITIONS[from];
    return allowed ? allowed.has(to) : false;
  }

  /**
   * EN: Asserts that a step status transition is legal.
   * VI: Khẳng định rằng chuyển đổi trạng thái bước là hợp lệ.
   */
  public assertValidStepTransition(from: TaskStepStatus, to: TaskStepStatus, stepId: string): void {
    if (!this.isValidStepTransition(from, to)) {
      throw new IllegalStateTransitionError(
        from as unknown as TaskState,
        to as unknown as TaskState,
        stepId,
        `Step status transition from '${from}' to '${to}' is invalid`
      );
    }
  }
}

export const globalAgentTaskStateEngine = new AgentTaskStateEngine();
