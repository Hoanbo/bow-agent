// src/core/executive/executiveAgentLoopBridge.ts
// BOWCON V4.0 — MS-1.3.38: MASTER HUMAN AUTHORITY UNIFICATION & EXECUTIVE GOVERNANCE CLOSURE
//
// Delegation Bridge connecting ContinuousAgentLoop and ExecutiveRuntime.
//
// Invariants:
// ContinuousAgentLoop = lifecycle engine (Observe -> Reconstruct -> Reason -> Plan -> Govern -> Authorize -> Execute -> Verify -> Evaluate -> Observe')
// ExecutiveRuntime = long-horizon objective and task DAG orchestration
// SupervisorRuntime = autonomous anomaly diagnosis and recovery supervision
// CapabilityRuntime = governed host capability execution
// HumanGate = single human authorization boundary
// USER_STOP > MASTER_AUTHORITY_AUTONOMOUS_EXECUTION
// LLM_PROPOSE != EXECUTE
// CONFIDENCE != AUTHORIZATION
// EXECUTION != VERIFICATION
// VERIFICATION != COMMIT

import type { GoalId, TaskId, ExecutiveGoal, ExecutiveTask } from './executiveTypes.js';
import { globalExecutiveRuntime } from './executiveRuntime.js';
import { globalExecutiveGoalManager } from './executiveGoal.js';
import { globalExecutiveTaskManager } from './executiveTask.js';
import { globalExecutiveScheduler } from './executiveScheduler.js';
import { globalExecutiveGovernance } from './executiveGovernance.js';
import { globalExecutiveExecution } from './executiveExecution.js';
import { globalExecutiveProgress } from './executiveProgress.js';
import { globalExecutiveRecovery } from './executiveRecovery.js';
import { globalExecutiveAudit } from './executiveAudit.js';
import { globalExecutiveCancellation } from './executiveCancellation.js';
import { AgentLoopRuntime, globalAgentLoopRuntime } from '../agent-loop/agentLoopRuntime.js';
import { globalSupervisorRuntime } from '../supervisor/supervisorRuntime.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

export interface BridgeStepResult {
  readonly success: boolean;
  readonly goalId: GoalId;
  readonly taskId?: TaskId;
  readonly phase:
    | 'OBSERVE'
    | 'RECONSTRUCT_STATE'
    | 'REASON'
    | 'PLAN'
    | 'GOVERN'
    | 'AUTHORIZE'
    | 'EXECUTE'
    | 'VERIFY'
    | 'EVALUATE'
    | 'OBSERVE_PRIME';
  readonly status: string;
  readonly error?: string;
}

export class ExecutiveAgentLoopBridge {
  /**
   * Orchestrates a single long-horizon goal step through the ContinuousAgentLoop 10-phase lifecycle.
   * Ensures ExecutiveRuntime operates inside ContinuousAgentLoop rather than creating a competing loop.
   */
  public async stepGoalThroughAgentLoop(
    goalId: GoalId,
    agentLoop: AgentLoopRuntime = globalAgentLoopRuntime,
    options?: {
      authTokenId?: string;
      authorizationToken?: AuthorizationToken;
      isDryRun?: boolean;
    }
  ): Promise<BridgeStepResult> {
    // Phase 1: OBSERVE — check environmental safety and global USER_STOP supremacy
    if (globalMasterHumanAuthority.isUserStopActive || globalExecutiveCancellation.isUserStopActive) {
      return {
        success: false,
        goalId,
        phase: 'OBSERVE',
        status: 'USER_STOP_ACTIVE',
        error: 'USER_STOP active: autonomous loop step forbidden',
      };
    }

    const goal = globalExecutiveGoalManager.getGoal(goalId);
    if (!goal) {
      return {
        success: false,
        goalId,
        phase: 'OBSERVE',
        status: 'GOAL_NOT_FOUND',
        error: `Goal '${goalId}' not found`,
      };
    }

    // Phase 2: RECONSTRUCT_STATE — validate task graph and goal state
    const graph = globalExecutiveRuntime.getGoalGraph(goalId);
    if (!graph) {
      return {
        success: false,
        goalId,
        phase: 'RECONSTRUCT_STATE',
        status: 'GRAPH_NOT_FOUND',
        error: `Task graph for goal '${goalId}' not found`,
      };
    }

    // Check goal status
    if (
      goal.status === 'COMPLETED' ||
      goal.status === 'FAILED' ||
      goal.status === 'CANCELLED' ||
      goal.status === 'STOPPED' ||
      goal.status === 'PAUSED'
    ) {
      return {
        success: true,
        goalId,
        phase: 'RECONSTRUCT_STATE',
        status: goal.status,
      };
    }

    // Phase 3: REASON — select next ready task according to priority and DAG dependencies
    const nextTask = globalExecutiveScheduler.selectNextTask(graph);
    if (!nextTask) {
      // Recompute progress
      const allTasks = graph.getAllTasks();
      const progress = globalExecutiveProgress.computeProgress(goal, allTasks);
      globalExecutiveGoalManager.updateGoalProgress(goalId, progress);

      if (progress.isComplete) {
        const success = globalExecutiveProgress.evaluateGoalSuccess(goal, allTasks);
        if (success) {
          globalExecutiveGoalManager.updateGoalStatus(goalId, 'COMPLETED', 'All tasks complete and verified');
        } else {
          globalExecutiveGoalManager.updateGoalStatus(goalId, 'FAILED', 'Success criteria failed');
        }
      }

      return {
        success: true,
        goalId,
        phase: 'REASON',
        status: goal.status,
      };
    }

    // Phase 4: PLAN — ensure task has a governed execution plan
    if (!nextTask.plan) {
      return {
        success: false,
        goalId,
        taskId: nextTask.taskId,
        phase: 'PLAN',
        status: 'PLAN_MISSING',
        error: `Task '${nextTask.taskId}' has no governed execution plan`,
      };
    }

    // Phase 5: GOVERN — evaluate PDP governance policies
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
        `Security violation: ${govDecision.violations.join('; ')}`
      );
      return {
        success: false,
        goalId,
        taskId: nextTask.taskId,
        phase: 'GOVERN',
        status: 'GOVERNANCE_BLOCKED',
        error: govDecision.violations.join('; '),
      };
    }

    // Phase 6: AUTHORIZE — check if HumanGate approval is required
    const effectiveTokenId = options?.authTokenId ?? options?.authorizationToken?.tokenId;
    if (govDecision.requiresHumanApproval && !effectiveTokenId) {
      globalExecutiveTaskManager.updateTaskStatus(
        nextTask.taskId,
        'AWAITING_HUMAN',
        'Human authorization required'
      );
      globalExecutiveGoalManager.updateGoalStatus(
        goalId,
        'AWAITING_HUMAN',
        `Task '${nextTask.taskId}' awaiting Master Human approval`
      );
      return {
        success: false,
        goalId,
        taskId: nextTask.taskId,
        phase: 'AUTHORIZE',
        status: 'WAIT_FOR_MASTER_AUTHORIZATION',
      };
    }

    // Phase 7: EXECUTE — dispatch execution to CapabilityRuntime
    if (goal.status === 'AWAITING_HUMAN' || goal.status === 'READY') {
      globalExecutiveGoalManager.updateGoalStatus(goalId, 'RUNNING', 'Dispatching execution');
    }
    if (nextTask.status === 'AWAITING_HUMAN' || nextTask.status === 'READY') {
      globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'RUNNING', 'Dispatching execution');
    }

    const execResult = await globalExecutiveExecution.executeTask(
      nextTask,
      goal.sessionId,
      effectiveTokenId,
      goal.goalId
    );

    // Phase 8: VERIFY — independent physical verification
    if (execResult.success) {
      const verified = globalExecutiveExecution.verifyTask(nextTask);
      if (!verified) {
        globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'FAILED', 'Verification failed');
        return {
          success: false,
          goalId,
          taskId: nextTask.taskId,
          phase: 'VERIFY',
          status: 'VERIFICATION_FAILED',
          error: 'Physical verification did not confirm expected state',
        };
      }
      globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'VERIFIED', 'Verified');
      globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'COMPLETED', 'Completed');
    }

    // Phase 9: EVALUATE — if failed, diagnose via SupervisorRuntime and assess recovery
    if (!execResult.success) {
      globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'FAILED', execResult.error);
      const assessment = globalExecutiveRecovery.assessFailure(nextTask, goalId);

      // Supervised recovery diagnosis via SupervisorRuntime
      if (assessment.suggestedAction === 'RETRY') {
        await globalExecutiveRecovery.prepareRecovery(nextTask);
        globalExecutiveTaskManager.updateTaskStatus(nextTask.taskId, 'READY', 'Recovery prepared');
      } else {
        globalExecutiveGoalManager.updateGoalStatus(
          goalId,
          'FAILED',
          `Unrecoverable task '${nextTask.taskId}': ${execResult.error}`
        );
      }

      return {
        success: false,
        goalId,
        taskId: nextTask.taskId,
        phase: 'EVALUATE',
        status: assessment.classification,
        error: execResult.error,
      };
    }

    // Phase 10: OBSERVE_PRIME — update DAG progress and record in audit chain
    const allTasks = graph.getAllTasks();
    const progress = globalExecutiveProgress.computeProgress(goal, allTasks);
    globalExecutiveGoalManager.updateGoalProgress(goalId, progress);

    if (progress.isComplete) {
      const success = globalExecutiveProgress.evaluateGoalSuccess(goal, allTasks);
      globalExecutiveGoalManager.updateGoalStatus(
        goalId,
        success ? 'COMPLETED' : 'FAILED',
        success ? 'All tasks complete' : 'Criteria failed'
      );
    }

    globalExecutiveAudit.record('AGENT_LOOP_BRIDGE_STEP_COMPLETED', goalId, {
      taskId: nextTask.taskId,
      percentComplete: progress.percentComplete,
    });

    return {
      success: true,
      goalId,
      taskId: nextTask.taskId,
      phase: 'OBSERVE_PRIME',
      status: goal.status,
    };
  }
}

export const globalExecutiveAgentLoopBridge = new ExecutiveAgentLoopBridge();
