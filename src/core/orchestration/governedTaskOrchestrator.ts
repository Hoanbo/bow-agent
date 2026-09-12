// src/core/orchestration/governedTaskOrchestrator.ts
// BOWCON V4.0 — MS-1.3.46: GOVERNED TASK ORCHESTRATOR
//
// Governed multi-agent task orchestration, lifecycle management, scope containment,
// and delegation verification.
//
// INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - DELEGATED_AUTHORITY <= OWNER_GRANTED_SCOPE
// - CHILD_CAPABILITIES ⊆ PARENT_CAPABILITIES
// - AGENT != MASTER_OWNER & DEVICE != MASTER_OWNER
// - Task orchestration is ADVISORY; never creates authority or bypasses HumanGate.
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import crypto from 'node:crypto';
import type {
  TaskId,
  TaskGroupId,
  AgentTask,
  TaskGroup,
  TaskAssignment,
  TaskExecutionState,
  AgentTaskResult,
  OrchestrationErrorCode,
} from './taskOrchestrationTypes.js';
import {
  MASTER_OWNER_ID,
  isMasterOwner,
} from '../architecture/masterArchitectureIdentity.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { AgentIdentityManager, globalAgentIdentityManager } from '../delegation/agentIdentityManager.js';
import { DelegationGovernanceRuntime } from '../delegation/delegationGovernanceRuntime.js';
import { DelegationScopeValidator } from '../delegation/delegationScopeValidator.js';
import type { DelegationScope } from '../delegation/delegationTypes.js';
import { TaskDependencyEngine, globalTaskDependencyEngine } from './taskDependencyEngine.js';

export class GovernedOrchestrationError extends Error {
  constructor(
    public readonly code: OrchestrationErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'GovernedOrchestrationError';
  }
}

export interface CreateTaskGroupInput {
  readonly title: string;
  readonly description?: string;
  readonly sessionId: string;
  readonly ownerId: string;
}

export interface CreateTaskInput {
  readonly groupId: TaskGroupId;
  readonly title: string;
  readonly description: string;
  readonly sessionId: string;
  readonly dependencies?: readonly {
    readonly dependentTaskId: TaskId;
    readonly type?: 'FINISH_TO_START' | 'REQUIRED_ARTIFACT' | 'STRICT_SUCCESS';
    readonly requiredArtifactTypes?: readonly string[];
  }[];
  readonly requiredCapabilities?: readonly string[];
  readonly targetPaths?: readonly string[];
  readonly forbiddenPaths?: readonly string[];
}

export interface AssignTaskInput {
  readonly taskId: TaskId;
  readonly agentId: string;
  readonly deviceId: string;
  readonly delegationId: string;
  readonly leaseId?: string;
}

export class GovernedTaskOrchestrator {
  private readonly groups = new Map<TaskGroupId, TaskGroup>();
  private readonly tasks = new Map<TaskId, AgentTask>();

  constructor(
    public readonly agentIdentityManager: AgentIdentityManager = globalAgentIdentityManager,
    public readonly delegationRuntime?: DelegationGovernanceRuntime,
    public readonly dependencyEngine: TaskDependencyEngine = globalTaskDependencyEngine
  ) {}

  /**
   * Asserts that paths do not violate the protected workspace C:\BOW\shopofbow.
   */
  public assertProtectedWorkspaceSafe(paths: readonly string[]): void {
    DelegationScopeValidator.assertProtectedWorkspaceSafe(paths, 'taskPaths');
  }

  /**
   * Creates a governed task group.
   */
  public createTaskGroup(input: CreateTaskGroupInput): TaskGroup {
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new GovernedOrchestrationError(
        'USER_STOP_ACTIVE',
        'Cannot create task group while USER_STOP is active.'
      );
    }

    const groupId = `tg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const group: TaskGroup = {
      groupId,
      title: input.title,
      description: input.description,
      sessionId: input.sessionId,
      ownerId: input.ownerId,
      taskIds: [],
      state: 'PLANNED',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.groups.set(groupId, group);
    return group;
  }

  /**
   * Creates an individual governed task within a task group.
   */
  public createTask(input: CreateTaskInput): AgentTask {
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new GovernedOrchestrationError(
        'USER_STOP_ACTIVE',
        'Cannot create task while USER_STOP is active.'
      );
    }

    const group = this.groups.get(input.groupId);
    if (!group) {
      throw new GovernedOrchestrationError(
        'TASK_GROUP_NOT_FOUND',
        `TaskGroup ${input.groupId} does not exist.`
      );
    }

    // Session consistency
    if (group.sessionId !== input.sessionId) {
      throw new GovernedOrchestrationError(
        'CROSS_SESSION_ORCHESTRATION_REJECTED',
        `Task session ${input.sessionId} does not match group session ${group.sessionId}.`
      );
    }

    // Protected workspace validation
    const targetPaths = input.targetPaths || [];
    const forbiddenPaths = input.forbiddenPaths || [];
    this.assertProtectedWorkspaceSafe(targetPaths);
    this.assertProtectedWorkspaceSafe(forbiddenPaths);

    const taskId = `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const dependencies = (input.dependencies || []).map((d) => ({
      dependentTaskId: d.dependentTaskId,
      type: d.type || 'FINISH_TO_START',
      requiredArtifactTypes: d.requiredArtifactTypes,
    }));

    const task: AgentTask = {
      taskId,
      groupId: input.groupId,
      title: input.title,
      description: input.description,
      sessionId: input.sessionId,
      state: dependencies.length > 0 ? 'WAITING_DEPENDENCY' : 'PLANNED',
      dependencies,
      requiredCapabilities: input.requiredCapabilities || [],
      targetPaths,
      forbiddenPaths,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Cycle detection check against all existing tasks in the group
    const existingTasksInGroup = Array.from(this.tasks.values()).filter(
      (t) => t.groupId === input.groupId
    );
    this.dependencyEngine.assertNoCycle(task, existingTasksInGroup);

    this.tasks.set(taskId, task);

    // Update group taskIds
    const updatedGroup: TaskGroup = {
      ...group,
      taskIds: [...group.taskIds, taskId],
      updatedAt: Date.now(),
    };
    this.groups.set(input.groupId, updatedGroup);

    return task;
  }

  /**
   * Assigns a task to an authorized, governed agent.
   */
  public assignTask(input: AssignTaskInput): AgentTask {
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new GovernedOrchestrationError(
        'USER_STOP_ACTIVE',
        'Cannot assign task while USER_STOP is active.'
      );
    }

    const task = this.tasks.get(input.taskId);
    if (!task) {
      throw new GovernedOrchestrationError(
        'TASK_NOT_FOUND',
        `Task ${input.taskId} does not exist.`
      );
    }

    // Validate agent registration
    if (!this.agentIdentityManager.hasAgent(input.agentId)) {
      throw new GovernedOrchestrationError(
        'TARGET_AGENT_NOT_REGISTERED',
        `Agent ${input.agentId} is not registered in AgentIdentityManager.`
      );
    }

    const agent = this.agentIdentityManager.getAgent(input.agentId)!;

    // Session Isolation
    if (agent.sessionId !== task.sessionId) {
      throw new GovernedOrchestrationError(
        'CROSS_SESSION_ORCHESTRATION_REJECTED',
        `Agent session ${agent.sessionId} does not match task session ${task.sessionId}.`
      );
    }

    // Delegation Validation (if delegation runtime is available)
    let delegationScope: DelegationScope = {
      maxScopePercentage: 100,
      allowedCapabilities: task.requiredCapabilities,
      disallowedCapabilities: [],
      targetPaths: task.targetPaths,
      forbiddenPaths: task.forbiddenPaths,
      maxChildDelegationDepth: 1,
      currentDepth: 0,
      allowSubDelegation: false,
    };

    if (this.delegationRuntime) {
      const delegation = this.delegationRuntime.getDelegation(input.delegationId);
      if (!delegation) {
        throw new GovernedOrchestrationError(
          'DELEGATION_NOT_FOUND',
          `Delegation ${input.delegationId} not found.`
        );
      }

      // Check Revocation Supremacy
      if (delegation.status === 'REVOKED' || delegation.revocationState.isRevoked) {
        throw new GovernedOrchestrationError(
          'DELEGATION_REVOKED',
          `Delegation ${input.delegationId} is revoked. REVOCATION > AGENT_INTENT.`
        );
      }

      // Check Expiration
      if (delegation.status === 'EXPIRED' || Date.now() > delegation.expiresAt) {
        throw new GovernedOrchestrationError(
          'DELEGATION_EXPIRED',
          `Delegation ${input.delegationId} has expired.`
        );
      }

      if (delegation.status !== 'ACTIVE' && delegation.status !== 'AUTHORIZED') {
        throw new GovernedOrchestrationError(
          'DELEGATION_NOT_ACTIVE',
          `Delegation ${input.delegationId} is in status ${delegation.status}, not ACTIVE.`
        );
      }

      // Capability containment: Task required capabilities must be a subset of delegated capabilities
      for (const reqCap of task.requiredCapabilities) {
        if (!delegation.grantedCapabilities.includes(reqCap)) {
          throw new GovernedOrchestrationError(
            'CAPABILITY_NOT_DELEGATED',
            `Required capability "${reqCap}" is not within delegation granted capabilities: [${delegation.grantedCapabilities.join(', ')}]`
          );
        }
      }

      delegationScope = delegation.scope;
    }

    const assignmentId = `asgn_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const assignment: TaskAssignment = {
      assignmentId,
      taskId: input.taskId,
      agentId: input.agentId,
      deviceId: input.deviceId,
      delegationId: input.delegationId,
      sessionId: task.sessionId,
      assignedAt: Date.now(),
      scope: delegationScope,
      leaseId: input.leaseId,
    };

    // Determine readiness based on dependencies
    const depEvaluation = this.dependencyEngine.evaluateDependencies(
      task,
      (id) => this.tasks.get(id)
    );

    let nextState: TaskExecutionState = 'ASSIGNED';
    if (depEvaluation.status === 'SATISFIED') {
      nextState = 'READY';
    } else if (depEvaluation.status === 'WAITING') {
      nextState = 'WAITING_DEPENDENCY';
    } else if (depEvaluation.status === 'BLOCKED') {
      nextState = 'BLOCKED';
    }

    const updatedTask: AgentTask = {
      ...task,
      assignment,
      state: nextState,
      updatedAt: Date.now(),
    };

    this.tasks.set(task.taskId, updatedTask);
    return updatedTask;
  }

  /**
   * Transitions task to RUNNING state.
   */
  public startTaskExecution(taskId: TaskId): AgentTask {
    if (globalMasterHumanAuthority.isUserStopActive) {
      throw new GovernedOrchestrationError(
        'USER_STOP_ACTIVE',
        'Cannot start task execution while USER_STOP is active.'
      );
    }

    const task = this.tasks.get(taskId);
    if (!task) {
      throw new GovernedOrchestrationError('TASK_NOT_FOUND', `Task ${taskId} not found.`);
    }

    if (!task.assignment) {
      throw new GovernedOrchestrationError(
        'INVALID_TASK_ASSIGNMENT',
        `Cannot start task ${taskId}: No agent assigned.`
      );
    }

    // Evaluate dependencies before entering RUNNING
    const depEvaluation = this.dependencyEngine.evaluateDependencies(
      task,
      (id) => this.tasks.get(id)
    );

    if (depEvaluation.status !== 'SATISFIED') {
      throw new GovernedOrchestrationError(
        depEvaluation.code || 'TASK_DEPENDENCY_UNRESOLVED',
        `Cannot run task ${taskId}: Dependencies not satisfied. Status: ${depEvaluation.status} (${depEvaluation.reason || ''})`
      );
    }

    const runningTask: AgentTask = {
      ...task,
      state: 'RUNNING',
      updatedAt: Date.now(),
    };
    this.tasks.set(taskId, runningTask);
    return runningTask;
  }

  /**
   * Records execution result submitted by an agent.
   */
  public submitTaskResult(taskId: TaskId, result: AgentTaskResult): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new GovernedOrchestrationError('TASK_NOT_FOUND', `Task ${taskId} not found.`);
    }

    // Session Isolation
    if (result.sessionId !== task.sessionId) {
      throw new GovernedOrchestrationError(
        'CROSS_SESSION_ORCHESTRATION_REJECTED',
        `Result session ${result.sessionId} != task session ${task.sessionId}`
      );
    }

    // Agent binding
    if (task.assignment && task.assignment.agentId !== result.agentId) {
      throw new GovernedOrchestrationError(
        'INVALID_TASK_ASSIGNMENT',
        `Result submitted by agent ${result.agentId}, but task was assigned to ${task.assignment.agentId}`
      );
    }

    const nextState: TaskExecutionState =
      result.outcome.status === 'SUCCESS' ? 'VERIFICATION_PENDING' : 'FAILED';

    const updatedTask: AgentTask = {
      ...task,
      result,
      state: nextState,
      updatedAt: Date.now(),
    };

    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  /**
   * Updates task state (e.g. after verification or review).
   */
  public updateTaskState(taskId: TaskId, newState: TaskExecutionState): AgentTask {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new GovernedOrchestrationError('TASK_NOT_FOUND', `Task ${taskId} not found.`);
    }

    const updatedTask: AgentTask = {
      ...task,
      state: newState,
      updatedAt: Date.now(),
    };
    this.tasks.set(taskId, updatedTask);
    return updatedTask;
  }

  public getTask(taskId: TaskId): AgentTask | undefined {
    return this.tasks.get(taskId);
  }

  public getTaskGroup(groupId: TaskGroupId): TaskGroup | undefined {
    return this.groups.get(groupId);
  }

  public getTasksByGroup(groupId: TaskGroupId): readonly AgentTask[] {
    return Array.from(this.tasks.values()).filter((t) => t.groupId === groupId);
  }

  public clear(): void {
    this.groups.clear();
    this.tasks.clear();
  }
}

export const globalGovernedTaskOrchestrator = new GovernedTaskOrchestrator();
