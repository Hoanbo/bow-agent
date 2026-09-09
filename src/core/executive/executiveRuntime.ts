// src/core/executive/executiveRuntime.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Master Executive Task & Long-Horizon Goal Orchestration Runtime.
//
// Invariants:
// USER_STOP > AUTONOMOUS_EXECUTION
// USER_CANCEL > AUTONOMOUS_EXECUTION
// USER_PAUSE > AUTONOMOUS_EXECUTION
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT
// FAILURE != BRAIN_DEATH
// TASK_COMPLETION != GOAL_COMPLETION
// HUMAN_AUTHORIZATION > AUTONOMOUS_AUTHORIZATION
// GOVERNANCE > COGNITIVE_RECOMMENDATION
// USER_CONTROL > EXECUTIVE_RUNTIME > AUTONOMOUS_EXECUTION

import type {
  GoalId,
  TaskId,
  SessionId,
  ExecutiveGoal,
  ExecutiveTask,
  GoalProgress,
  ExecutiveHealth,
  ExecutiveCheckpoint,
  CreateTaskOptions,
} from './executiveTypes.js';
import { globalExecutiveGoalManager, CreateGoalOptions } from './executiveGoal.js';
import { globalExecutiveGoalInterpreter } from './executiveGoalInterpreter.js';
import { globalExecutiveTaskDecomposer } from './executiveTaskDecomposer.js';
import { globalExecutiveTaskManager } from './executiveTask.js';
import { ExecutiveDependencyGraph } from './executiveDependencyGraph.js';
import { globalExecutivePlanner } from './executivePlanner.js';
import { globalExecutiveScheduler } from './executiveScheduler.js';
import { globalExecutiveGovernance } from './executiveGovernance.js';
import { globalExecutiveExecution } from './executiveExecution.js';
import { globalExecutiveProgress } from './executiveProgress.js';
import { globalExecutiveRecovery } from './executiveRecovery.js';
import { globalExecutiveEscalation } from './executiveEscalation.js';
import { globalExecutiveCancellation } from './executiveCancellation.js';
import { globalExecutiveAuthorization } from './executiveAuthorization.js';
import { globalExecutiveCheckpoint } from './executiveCheckpoint.js';
import { globalExecutivePersistence } from './executivePersistence.js';
import { globalExecutiveAudit } from './executiveAudit.js';

export class ExecutiveRuntime {
  private _goalGraphs = new Map<GoalId, ExecutiveDependencyGraph>();
  private _completedGoalsCount = 0;
  private _failedGoalsCount = 0;
  private _totalTasksExecutedCount = 0;

  // -------------------------------------------------------------------------
  // 1. Goal Submission & Stepwise Orchestration
  // -------------------------------------------------------------------------

  public async submitGoal(
    opts: CreateGoalOptions,
    customTaskSpecs?: CreateTaskOptions[]
  ): Promise<ExecutiveGoal> {
    // 1. Check USER_STOP
    if (globalExecutiveCancellation.isUserStopActive) {
      throw new Error('[USER_STOP_ACTIVE] Cannot submit goal while USER_STOP is active');
    }

    // 2. Create Goal Record (State: SUBMITTED)
    const goal = globalExecutiveGoalManager.createGoal({
      ...opts,
      status: 'SUBMITTED',
    });

    globalExecutiveAudit.record('GOAL_CREATED', goal.goalId, {
      objective: goal.objective,
      priority: goal.priority,
      sessionId: goal.sessionId,
    });

    if (!opts.title && (opts as any).objective) {
      await this.interpretGoal(goal.goalId);
      await this.decomposeGoal(goal.goalId, customTaskSpecs);
      await this.planGoalTasks(goal.goalId);
    }

    return goal;
  }

  public async interpretGoal(goalId: GoalId): Promise<ExecutiveGoal> {
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (!goal) throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);

    if (goal.status === 'SUBMITTED') {
      globalExecutiveGoalManager.updateGoalStatus(goal.goalId, 'ACCEPTED', 'Goal accepted for interpretation');
    }
    if (goal.status === 'ACCEPTED') {
      globalExecutiveGoalManager.updateGoalStatus(goal.goalId, 'INTERPRETING', 'Beginning objective interpretation');
    }
    const interpretation = await globalExecutiveGoalInterpreter.interpret(goal);

    if (interpretation.containsForbiddenPatterns) {
      globalExecutiveGoalManager.updateGoalStatus(
        goal.goalId,
        'FAILED',
        `Forbidden patterns: ${interpretation.forbiddenReasons.join('; ')}`
      );
      globalExecutiveAudit.record('GOAL_FAILED_INTERPRETATION', goal.goalId, {
        reasons: interpretation.forbiddenReasons,
      });
      throw new Error(`[GOAL_INTERPRETATION_SECURITY_VIOLATION] ${interpretation.forbiddenReasons.join('; ')}`);
    }

    goal.priority = interpretation.suggestedPriority ?? goal.priority;
    globalExecutiveGoalManager.updateGoalStatus(goal.goalId, 'INTERPRETED', 'Interpretation complete');
    globalExecutiveGoalManager.updateGoalStatus(goal.goalId, 'DECOMPOSING', 'Beginning task decomposition');
    return goal;
  }

  public async decomposeGoal(goalId: GoalId, customTaskSpecs?: CreateTaskOptions[]): Promise<ExecutiveTask[]> {
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (!goal) throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);

    const decompResult = globalExecutiveTaskDecomposer.decompose(goal, customTaskSpecs);
    this._goalGraphs.set(goal.goalId, decompResult.graph);
    globalExecutiveGoalManager.updateGoalStatus(goal.goalId, 'DECOMPOSED', 'Decomposition complete');
    return decompResult.tasks;
  }

  public async planGoalTasks(goalId: GoalId): Promise<ExecutiveGoal> {
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (!goal) throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);

    globalExecutiveGoalManager.updateGoalStatus(goal.goalId, 'PLANNING', 'Synthesizing task plans');
    const tasks = globalExecutiveTaskManager.getTasksByGoal(goalId);
    for (const task of tasks) {
      globalExecutivePlanner.planTask(task, false);
    }
    globalExecutiveGoalManager.updateGoalStatus(goal.goalId, 'READY', 'Goal is ready for scheduling');

    const progress = globalExecutiveProgress.computeProgress(goal, tasks);
    globalExecutiveGoalManager.updateGoalProgress(goal.goalId, progress);

    globalExecutiveAudit.record('GOAL_READY', goal.goalId, {
      taskCount: tasks.length,
      percentComplete: progress.percentComplete,
    });

    return goal;
  }

  public async runGoal(goalId: GoalId): Promise<GoalProgress> {
    await this.runGoalUntilCompletion(goalId);
    return globalExecutiveProgress.calculateProgress(goalId);
  }

  // -------------------------------------------------------------------------
  // 2. Stepping & Scheduling Execution
  // -------------------------------------------------------------------------

  /**
   * Executes a single atomic step for the given goal.
   * Selects next ready task, evaluates governance, executes, independently verifies,
   * updates DAG and progress, and handles failure recovery if necessary.
   */
  public async stepGoal(goalId: GoalId, humanAuthTokenId?: string): Promise<ExecutiveGoal> {
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (!goal) {
      throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found`);
    }

    // 1. Check USER_STOP (Supreme Precedence)
    if (globalExecutiveCancellation.isUserStopActive) {
      if (goal.status !== 'STOPPED') {
        globalExecutiveGoalManager.updateGoalStatus(goalId, 'STOPPED', 'USER_STOP triggered');
        globalExecutiveAudit.record('GOAL_STOPPED', goalId, {
          reason: globalExecutiveCancellation.userStopReason,
        });
      }
      return goal;
    }

    // 2. Check USER_CANCEL
    if (globalExecutiveCancellation.isGoalCancelled(goalId)) {
      if (goal.status !== 'CANCELLED') {
        globalExecutiveGoalManager.updateGoalStatus(goalId, 'CANCELLED', 'Goal was cancelled by user');
        globalExecutiveAudit.record('GOAL_CANCELLED', goalId);
      }
      return goal;
    }

    // 3. Check USER_PAUSE
    if (globalExecutiveCancellation.isGoalPaused(goalId)) {
      if (goal.status !== 'PAUSED') {
        globalExecutiveGoalManager.updateGoalStatus(goalId, 'PAUSED', 'Goal was paused by user');
        globalExecutiveAudit.record('GOAL_PAUSED', goalId);
      }
      return goal;
    }

    // Terminal states cannot step
    if (
      goal.status === 'COMPLETED' ||
      goal.status === 'FAILED' ||
      goal.status === 'CANCELLED' ||
      goal.status === 'STOPPED' ||
      goal.status === 'EXPIRED'
    ) {
      return goal;
    }

    const graph = this._goalGraphs.get(goalId);
    if (!graph) {
      throw new Error(`[GRAPH_NOT_FOUND] Task graph for goal '${goalId}' not found`);
    }

    // Update goal status to RUNNING
    if (goal.status === 'READY' || goal.status === 'PAUSED' || goal.status === 'WAITING') {
      globalExecutiveGoalManager.updateGoalStatus(goalId, 'RUNNING', 'Step started');
    }

    // 4. Scheduler: Select next ready task
    const nextTask = globalExecutiveScheduler.selectNextTask(graph);

    if (!nextTask) {
      // Check if all tasks are completed
      const allTasks = graph.getAllTasks();
      const progress = globalExecutiveProgress.computeProgress(goal, allTasks);
      globalExecutiveGoalManager.updateGoalProgress(goalId, progress);

      if (progress.isComplete) {
        // Evaluate success criteria
        const success = globalExecutiveProgress.evaluateGoalSuccess(goal, allTasks);
        if (success) {
          globalExecutiveGoalManager.updateGoalStatus(goalId, 'COMPLETED', 'All tasks verified completed');
          this._completedGoalsCount++;
          globalExecutiveAudit.record('GOAL_COMPLETED', goalId, {
            totalTasks: progress.totalTasks,
          });
        } else {
          globalExecutiveGoalManager.updateGoalStatus(
            goalId,
            'FAILED',
            'Tasks finished but verification/success criteria failed'
          );
          this._failedGoalsCount++;
          globalExecutiveAudit.record('GOAL_FAILED_CRITERIA', goalId);
        }
      } else {
        const blocked = graph.getBlockedTasks();
        if (blocked.length > 0) {
          globalExecutiveGoalManager.updateGoalStatus(goalId, 'BLOCKED', 'Remaining tasks are blocked');
        } else {
          globalExecutiveGoalManager.updateGoalStatus(goalId, 'WAITING', 'Waiting for schedulable tasks');
        }
      }
      return goal;
    }

    // 5. Governance Evaluation for Next Task
    globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'READY', 'Task selected by scheduler');
    globalExecutiveGoalManager.setCurrentTaskId(goalId, nextTask.taskId);

    const govDecision = globalExecutiveGovernance.evaluate(nextTask);
    if (!govDecision.permitted) {
      globalExecutiveTaskManager.updateTaskStatus(
        nextTask.taskId,
        'FAILED',
        `Governance blocked: ${govDecision.violations.join('; ')}`
      );
      globalExecutiveGoalManager.updateGoalStatus(
        goalId,
        'FAILED',
        `Critical security violation: ${govDecision.violations.join('; ')}`
      );
      this._failedGoalsCount++;
      globalExecutiveAudit.record('TASK_GOVERNANCE_BLOCKED', nextTask.taskId, {
        violations: govDecision.violations,
      });
      return goal;
    }

    // 6. Human Gate Check
    if (govDecision.requiresHumanApproval && !humanAuthTokenId) {
      globalExecutiveTaskManager.updateTaskStatus(
        nextTask.taskId,
        'AWAITING_HUMAN',
        'Task requires human authorization token'
      );
      globalExecutiveGoalManager.updateGoalStatus(
        goalId,
        'AWAITING_HUMAN',
        `Task '${nextTask.taskId}' awaiting human authorization`
      );
      globalExecutiveAudit.record('TASK_AWAITING_HUMAN', nextTask.taskId, {
        riskLevel: govDecision.riskLevel,
      });
      return goal;
    }

    // 7. Execute Task
    globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'RUNNING', 'Dispatching execution');
    const targetResource = nextTask.plan?.targetPath;
    if (targetResource) {
      globalExecutiveScheduler.acquireLock(targetResource);
    }

    try {
      const execResult = await globalExecutiveExecution.executeTask(
        nextTask,
        goal.sessionId,
        humanAuthTokenId,
        goal.goalId
      );
      this._totalTasksExecutedCount++;

      // Check USER_STOP immediately after execution
      if (globalExecutiveCancellation.isUserStopActive) {
        globalExecutiveGoalManager.updateGoalStatus(goalId, 'STOPPED', 'USER_STOP triggered during execution');
        return goal;
      }

      if (!execResult.success) {
        // Task Failed -> Classify Recovery
        globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'FAILED', execResult.error);
        const assessment = globalExecutiveRecovery.assessFailure(nextTask, goalId);

        if (assessment.suggestedAction === 'RETRY') {
          globalExecutiveTaskManager.updateTaskStatus(
            nextTask.taskId,
            'RECOVERING',
            `Attempting recovery: ${assessment.reason}`
          );
          await globalExecutiveRecovery.prepareRecovery(nextTask);
          // Reset status to READY for next step retry
          globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'READY', 'Recovery prepared; reset to READY');
        } else {
          // Unrecoverable -> Escalate
          const escalation = globalExecutiveEscalation.createEscalation(
            goalId,
            `Task failed: ${execResult.error}`,
            assessment.reason,
            'Manual operator decision or abort required',
            nextTask
          );
          globalExecutiveGoalManager.updateGoalStatus(
            goalId,
            'FAILED',
            `Unrecoverable failure on task '${nextTask.taskId}': ${execResult.error}`
          );
          this._failedGoalsCount++;
          globalExecutiveAudit.record('TASK_ESCALATED', nextTask.taskId, {
            escalationId: escalation.escalationId,
            reason: escalation.reason,
          });
        }
        return goal;
      }

      // 8. Independent Verification
      globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'EXECUTED', 'Execution succeeded');
      const verified = globalExecutiveExecution.verifyTask(nextTask);

      if (!verified) {
        globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'FAILED', 'Verification failed');
        globalExecutiveGoalManager.updateGoalStatus(
          goalId,
          'FAILED',
          `Independent verification failed for task '${nextTask.taskId}'`
        );
        this._failedGoalsCount++;
        return goal;
      }

      // 9. Task Completion
      globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'VERIFIED', 'Verification succeeded');
      globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'COMPLETED', 'Task complete');

      // Update progress
      const allTasks = graph.getAllTasks();
      const progress = globalExecutiveProgress.computeProgress(goal, allTasks);
      globalExecutiveGoalManager.updateGoalProgress(goalId, progress);
      globalExecutiveGoalManager.setCurrentTaskId(goalId, undefined);

      globalExecutiveAudit.record('TASK_COMPLETED', nextTask.taskId, {
        percentComplete: progress.percentComplete,
        isComplete: progress.isComplete,
      });

      // If all tasks are completed, finalize goal
      if (progress.isComplete) {
        const success = globalExecutiveProgress.evaluateGoalSuccess(goal, allTasks);
        if (success) {
          globalExecutiveGoalManager.updateGoalStatus(goalId, 'COMPLETED', 'All tasks verified completed');
          this._completedGoalsCount++;
          globalExecutiveAudit.record('GOAL_COMPLETED', goalId, {
            totalTasks: progress.totalTasks,
          });
        }
      }

      return goal;
    } finally {
      if (targetResource) {
        globalExecutiveScheduler.releaseLock(targetResource);
      }
    }
  }

  /**
   * Runs a goal step-by-step until terminal status or maxSteps reached.
   */
  public async runGoalUntilCompletion(
    goalId: GoalId,
    options?: { maxSteps?: number; humanAuthTokens?: Map<TaskId, string> }
  ): Promise<ExecutiveGoal> {
    const maxSteps = options?.maxSteps ?? 50;
    let steps = 0;

    while (steps < maxSteps) {
      steps++;
      const goal = globalExecutiveGoalManager.getGoal(goalId);
      if (!goal) break;

      if (
        goal.status === 'COMPLETED' ||
        goal.status === 'FAILED' ||
        goal.status === 'CANCELLED' ||
        goal.status === 'STOPPED' ||
        goal.status === 'PAUSED'
      ) {
        return goal;
      }

      const nextToken = goal.currentTaskId
        ? options?.humanAuthTokens?.get(goal.currentTaskId)
        : undefined;

      await this.stepGoal(goalId, nextToken);

      if (goal.status === 'AWAITING_HUMAN' && !nextToken) {
        // Paused waiting for human input
        return goal;
      }
    }

    return globalExecutiveGoalManager.getGoal(goalId)!;
  }

  // -------------------------------------------------------------------------
  // 3. User Control Plane (STOP, CANCEL, PAUSE, RESUME)
  // -------------------------------------------------------------------------

  public triggerUserStop(reason: string = 'Operator emergency stop'): void {
    globalExecutiveCancellation.triggerUserStop(reason);
    globalExecutiveAudit.record('USER_STOP_TRIGGERED', 'GLOBAL', { reason });
  }

  public resetUserStop(): void {
    globalExecutiveCancellation.resetUserStop();
    globalExecutiveAudit.record('USER_STOP_RESET', 'GLOBAL');
  }

  public cancelGoal(goalId: GoalId, reason: string = 'User cancellation'): void {
    globalExecutiveCancellation.cancelGoal(goalId, reason);
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (goal && goal.status !== 'COMPLETED' && goal.status !== 'FAILED') {
      globalExecutiveGoalManager.updateGoalStatus(goalId, 'CANCELLED', reason);
    }
    globalExecutiveAudit.record('USER_CANCEL_TRIGGERED', goalId, { reason });
  }

  public pauseGoal(goalId: GoalId, reason: string = 'User pause'): void {
    globalExecutiveCancellation.pauseGoal(goalId, reason);
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (goal && (goal.status === 'RUNNING' || goal.status === 'READY' || goal.status === 'WAITING' || goal.status === 'SUBMITTED')) {
      globalExecutiveGoalManager.updateGoalStatus(goalId, 'PAUSED', reason);
    }
    globalExecutiveAudit.record('USER_PAUSE_TRIGGERED', goalId, { reason });
  }

  public resumeGoal(goalId: GoalId): void {
    globalExecutiveCancellation.resumeGoal(goalId);
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (goal && goal.status === 'PAUSED') {
      globalExecutiveGoalManager.updateGoalStatus(goalId, 'RUNNING', 'Resumed by operator');
    }
    globalExecutiveAudit.record('USER_RESUME_TRIGGERED', goalId);
  }

  // -------------------------------------------------------------------------
  // 4. Persistence & Crash Recovery Checkpoints
  // -------------------------------------------------------------------------

  public checkpointGoal(goalId: GoalId): ExecutiveCheckpoint {
    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (!goal) {
      throw new Error(`[GOAL_NOT_FOUND] Goal '${goalId}' not found for checkpointing`);
    }

    const tasks = globalExecutiveTaskManager.getTasksByGoal(goalId);
    const escalations = globalExecutiveEscalation.getEscalationsByGoal(goalId);
    const checkpoint = globalExecutiveCheckpoint.createCheckpoint(goal, tasks, escalations);

    globalExecutivePersistence.saveCheckpoint(checkpoint);
    globalExecutiveAudit.record('CHECKPOINT_SAVED', goalId, {
      checkpointId: checkpoint.checkpointId,
      checksum: checkpoint.sha256Checksum,
    });

    return checkpoint;
  }

  public restoreFromCheckpoint(goalId: GoalId): ExecutiveGoal {
    const checkpoint = globalExecutivePersistence.loadCheckpoint(goalId);
    if (!checkpoint) {
      throw new Error(`[CHECKPOINT_NOT_FOUND] Checkpoint for goal '${goalId}' not found`);
    }

    const validation = globalExecutiveCheckpoint.validateCheckpoint(checkpoint);
    if (!validation.valid) {
      throw new Error(`[CHECKPOINT_INVALID] ${validation.error}`);
    }

    // Reconstruct Graph
    const graph = new ExecutiveDependencyGraph();
    for (const task of checkpoint.tasks) {
      graph.addTask(task);
    }
    this._goalGraphs.set(goalId, graph);

    // Rehydrate durable identities only after checksum, schema, and DAG validation.
    // Authorization secrets are intentionally not stored in ExecutiveCheckpoint.
    const goal = globalExecutiveGoalManager.restoreGoal(checkpoint.goal);
    for (const task of checkpoint.tasks) globalExecutiveTaskManager.restoreTask(task);

    globalExecutiveAudit.record('CHECKPOINT_RESTORED', goalId, {
      checkpointId: checkpoint.checkpointId,
    });

    return goal;
  }

  // -------------------------------------------------------------------------
  // 5. Query & Diagnostics
  // -------------------------------------------------------------------------

  public getGoalGraph(goalId: GoalId): ExecutiveDependencyGraph | undefined {
    return this._goalGraphs.get(goalId);
  }

  public getHealth(): ExecutiveHealth {
    const activeGoals = Array.from(this._goalGraphs.keys()).filter((id) => {
      const g = globalExecutiveGoalManager.getGoal(id);
      return g ? g.status === 'RUNNING' || g.status === 'READY' : false;
    }).length;

    let status: 'OPERATIONAL' | 'HEALTHY' | 'RUNNING' | 'USER_STOP' | 'PAUSED' | 'DEGRADED' = 'HEALTHY';
    if (globalExecutiveCancellation.isUserStopActive) {
      status = 'USER_STOP';
    }

    const allTasks = Array.from(this._goalGraphs.values()).flatMap(g => g.getAllTasks());
    const activeTasks = allTasks.filter(t => t.status === 'RUNNING' || t.status === 'READY').length;
    const pendingAuthorizations = allTasks.filter(t => t.status === 'AWAITING_HUMAN').length;

    return {
      status,
      userStop: globalExecutiveCancellation.isUserStopActive,
      activeGoals,
      activeTasks,
      pendingAuthorizations,
      completedGoals: this._completedGoalsCount,
      failedGoals: this._failedGoalsCount,
      totalTasksExecuted: Math.max(this._totalTasksExecutedCount, globalExecutiveExecution.executedTasksCount),
      persistencePath: globalExecutivePersistence.storageDir,
      isSafeStopActive: globalExecutiveCancellation.isSafeStopActive,
      isUserStopActive: globalExecutiveCancellation.isUserStopActive,
      activeLocks: globalExecutiveScheduler.activeLockCount,
    };
  }

  public clear(): void {
    this._goalGraphs.clear();
    this._completedGoalsCount = 0;
    this._failedGoalsCount = 0;
    this._totalTasksExecutedCount = 0;
    globalExecutiveGoalManager.clear();
    globalExecutiveTaskManager.clear();
    globalExecutiveScheduler.clear();
    globalExecutiveCancellation.clear();
    globalExecutiveEscalation.clear();
    globalExecutiveAuthorization.clear();
    globalExecutiveAudit.clear();
    globalExecutiveExecution.clear();
  }
}

export const globalExecutiveRuntime = new ExecutiveRuntime();
