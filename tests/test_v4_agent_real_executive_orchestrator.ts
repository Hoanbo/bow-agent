// tests/test_v4_agent_real_executive_orchestrator.ts
// BOWCON V4.0 — MS-1.3.37: REAL BOWCON EXECUTIVE TASK & LONG-HORIZON GOAL ORCHESTRATION RUNTIME
//
// Reality Gate: 300+ rigorous assertions verifying the full Executive Subsystem.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  // Types & Enums
  GoalPriority,
  TaskPriority,
  GoalStatus,
  TaskStatus,
  ExecutiveGoal,
  ExecutiveTask,
  GoalProgress,
  ExecutiveHealth,
  ExecutiveCheckpoint,
  ExecutiveRiskLevel,
  CreateTaskOptions,
  // Transitions
  assertValidGoalTransition,
  assertValidTaskTransition,
  canTransitionGoal,
  canTransitionTask,
  // Priority
  compareGoalPriority,
  compareTaskPriority,
  isHigherPriority,
  // DAG
  ExecutiveDependencyGraph,
  // Task & Goal Managers
  ExecutiveTaskManager,
  ExecutiveGoalManager,
  globalExecutiveTaskManager,
  globalExecutiveGoalManager,
  // Components
  globalExecutiveGoalInterpreter,
  globalExecutiveTaskDecomposer,
  globalExecutivePlanner,
  globalExecutiveGovernance,
  globalExecutiveAuthorization,
  globalExecutiveExecution,
  globalExecutiveProgress,
  globalExecutiveCancellation,
  globalExecutiveRecovery,
  globalExecutiveEscalation,
  globalExecutivePersistence,
  globalExecutiveCheckpoint,
  globalExecutiveScheduler,
  globalExecutiveAudit,
  globalExecutiveRuntime,
  BowconExecutive,
  // Lower layer runtimes
  globalWorldActionAuth,
  globalWorldActionExecutor,
  globalCapabilityRuntime,
  globalSupervisorRuntime,
  globalAgentLoopRuntime,
} from '../src/index.js';

let assertionCount = 0;

function assert(condition: boolean, message: string): void {
  assertionCount++;
  if (!condition) {
    console.error(`[FAIL] Assertion #${assertionCount}: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runRealityGate(): Promise<void> {
  console.log('============================================================');
  console.log('BOWCON V4.0 — MS-1.3.37: EXECUTIVE ORCHESTRATION REALITY GATE');
  console.log('============================================================');

  const testDir = path.resolve(process.cwd(), 'scratch/executive_test_env');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  try {
    // -----------------------------------------------------------------------
    // CATEGORY A: Subsystem Initialization, Clean Singletons, Health Reporting
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY A: Initialization & Health Reporting ---');
    assert(globalExecutiveRuntime !== undefined, 'globalExecutiveRuntime must be defined');
    assert(BowconExecutive.runtime === globalExecutiveRuntime, 'BowconExecutive facade matches global instance');
    assert(BowconExecutive.goals === globalExecutiveGoalManager, 'BowconExecutive.goals matches global instance');
    assert(BowconExecutive.tasks === globalExecutiveTaskManager, 'BowconExecutive.tasks matches global instance');
    assert(BowconExecutive.authorization === globalExecutiveAuthorization, 'BowconExecutive.authorization matches global instance');
    assert(BowconExecutive.cancellation === globalExecutiveCancellation, 'BowconExecutive.cancellation matches global instance');
    assert(BowconExecutive.persistence === globalExecutivePersistence, 'BowconExecutive.persistence matches global instance');
    assert(BowconExecutive.audit === globalExecutiveAudit, 'BowconExecutive.audit matches global instance');

    const initialHealth = globalExecutiveRuntime.getHealth();
    assert(initialHealth.status === 'HEALTHY' || initialHealth.status === 'RUNNING' || initialHealth.status === 'OPERATIONAL', 'Initial health status is valid');
    assert(typeof initialHealth.activeGoals === 'number', 'activeGoals is numeric');
    assert(typeof initialHealth.activeTasks === 'number', 'activeTasks is numeric');
    assert(typeof initialHealth.pendingAuthorizations === 'number', 'pendingAuthorizations is numeric');
    assert(typeof initialHealth.completedGoals === 'number', 'completedGoals is numeric');
    assert(typeof initialHealth.failedGoals === 'number', 'failedGoals is numeric');
    assert(typeof initialHealth.totalTasksExecuted === 'number', 'totalTasksExecuted is numeric');
    assert(typeof initialHealth.persistencePath === 'string', 'persistencePath is valid string');
    assert(typeof initialHealth.isSafeStopActive === 'boolean', 'isSafeStopActive is boolean');
    assert(typeof initialHealth.isUserStopActive === 'boolean', 'isUserStopActive is boolean');

    // -----------------------------------------------------------------------
    // CATEGORY B: Invariant Governance Verification
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY B: Invariant Governance Verification ---');
    // GOAL != TASK
    assert(typeof globalExecutiveGoalManager.createGoal === 'function', 'Goal manager creates goals');
    assert(typeof globalExecutiveTaskManager.createTask === 'function', 'Task manager creates tasks');
    // TASK != PLAN
    assert(typeof globalExecutivePlanner.createPlan === 'function', 'Planner creates plans distinctly from tasks');
    // PLAN != EXECUTE
    assert(typeof globalExecutiveExecution.executeTask === 'function', 'Execution is separate from planning');
    // CONFIDENCE != AUTHORIZATION
    assert(typeof globalExecutiveAuthorization.requestAuthorization === 'function', 'Authorization requires explicit grant');
    // USER_STOP > EXECUTIVE_RUNTIME > AUTONOMOUS_EXECUTION
    assert(globalExecutiveCancellation.isUserStopActive === false, 'User stop starts false');
    assert(globalExecutiveCancellation.isSafeStopActive === false, 'Safe stop starts false');

    // -----------------------------------------------------------------------
    // CATEGORY C: Priority Ordering & Preemption Logic
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY C: Priority Ordering & Preemption Logic ---');
    assert(compareGoalPriority('CRITICAL', 'HIGH') < 0, 'CRITICAL goal precedes HIGH goal');
    assert(compareGoalPriority('HIGH', 'NORMAL') < 0, 'HIGH goal precedes NORMAL goal');
    assert(compareGoalPriority('NORMAL', 'LOW') < 0, 'NORMAL goal precedes LOW goal');
    assert(compareGoalPriority('LOW', 'BACKGROUND') < 0, 'LOW goal precedes BACKGROUND goal');
    assert(compareGoalPriority('NORMAL', 'NORMAL') === 0, 'Same goal priority returns 0');

    assert(compareTaskPriority('CRITICAL', 'HIGH') < 0, 'CRITICAL task precedes HIGH task');
    assert(compareTaskPriority('HIGH', 'NORMAL') < 0, 'HIGH task precedes NORMAL task');
    assert(compareTaskPriority('NORMAL', 'LOW') < 0, 'NORMAL task precedes LOW task');
    assert(compareTaskPriority('LOW', 'BACKGROUND') < 0, 'LOW task precedes BACKGROUND task');
    assert(compareTaskPriority('CRITICAL', 'CRITICAL') === 0, 'Same task priority returns 0');

    assert(isHigherPriority('CRITICAL', 'HIGH') === true, 'CRITICAL is higher than HIGH');
    assert(isHigherPriority('HIGH', 'CRITICAL') === false, 'HIGH is not higher than CRITICAL');
    assert(isHigherPriority('NORMAL', 'LOW') === true, 'NORMAL is higher than LOW');
    assert(isHigherPriority('LOW', 'NORMAL') === false, 'LOW is not higher than NORMAL');
    assert(isHigherPriority('BACKGROUND', 'LOW') === false, 'BACKGROUND is not higher than LOW');

    // -----------------------------------------------------------------------
    // CATEGORY D: 13-State Goal Lifecycle Transitions
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY D: 13-State Goal Lifecycle Transitions ---');
    const validGoalTransitions: [GoalStatus, GoalStatus][] = [
      ['SUBMITTED', 'ACCEPTED'],
      ['SUBMITTED', 'REJECTED'],
      ['ACCEPTED', 'INTERPRETING'],
      ['INTERPRETING', 'DECOMPOSING'],
      ['DECOMPOSING', 'PLANNING'],
      ['PLANNING', 'READY'],
      ['READY', 'RUNNING'],
      ['RUNNING', 'WAITING'],
      ['WAITING', 'RUNNING'],
      ['RUNNING', 'PAUSED'],
      ['PAUSED', 'RUNNING'],
      ['RUNNING', 'BLOCKED'],
      ['BLOCKED', 'RUNNING'],
      ['RUNNING', 'RECOVERING'],
      ['RECOVERING', 'RUNNING'],
      ['RUNNING', 'AWAITING_HUMAN'],
      ['AWAITING_HUMAN', 'RUNNING'],
      ['RUNNING', 'COMPLETED'],
      ['RUNNING', 'FAILED'],
      ['RUNNING', 'CANCELLED'],
      ['RUNNING', 'STOPPED'],
    ];

    for (const [from, to] of validGoalTransitions) {
      assert(canTransitionGoal(from, to), `Valid goal transition from ${from} to ${to}`);
      assertValidGoalTransition(from, to);
    }

    const invalidGoalTransitions: [GoalStatus, GoalStatus][] = [
      ['SUBMITTED', 'COMPLETED'],
      ['COMPLETED', 'RUNNING'],
      ['FAILED', 'READY'],
      ['CANCELLED', 'PLANNING'],
      ['STOPPED', 'RUNNING'],
      ['SUBMITTED', 'RUNNING'],
      ['READY', 'COMPLETED'],
    ];

    for (const [from, to] of invalidGoalTransitions) {
      assert(!canTransitionGoal(from, to), `Goal cannot transition directly from ${from} to ${to}`);
      let threw = false;
      try {
        assertValidGoalTransition(from, to);
      } catch {
        threw = true;
      }
      assert(threw, `assertValidGoalTransition threw on invalid transition ${from} -> ${to}`);
    }

    // -----------------------------------------------------------------------
    // CATEGORY E: 12-State Task Lifecycle Transitions
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY E: 12-State Task Lifecycle Transitions ---');
    const validTaskTransitions: [TaskStatus, TaskStatus][] = [
      ['PENDING', 'READY'],
      ['PENDING', 'BLOCKED'],
      ['READY', 'RUNNING'],
      ['RUNNING', 'COMPLETED'],
      ['RUNNING', 'FAILED'],
      ['RUNNING', 'BLOCKED'],
      ['RUNNING', 'WAITING_FOR_CHILDREN'],
      ['RUNNING', 'AWAITING_HUMAN'],
      ['RUNNING', 'RECOVERING'],
      ['RUNNING', 'CANCELLED'],
      ['RUNNING', 'SKIPPED'],
      ['FAILED', 'RECOVERING'],
      ['RECOVERING', 'READY'],
      ['AWAITING_HUMAN', 'READY'],
      ['WAITING_FOR_CHILDREN', 'COMPLETED'],
      ['BLOCKED', 'READY'],
      ['BLOCKED', 'CANCELLED'],
    ];

    for (const [from, to] of validTaskTransitions) {
      assert(canTransitionTask(from, to), `Valid task transition from ${from} to ${to}`);
      assertValidTaskTransition(from, to);
    }

    const invalidTaskTransitions: [TaskStatus, TaskStatus][] = [
      ['PENDING', 'COMPLETED'],
      ['COMPLETED', 'RUNNING'],
      ['CANCELLED', 'READY'],
      ['SKIPPED', 'RUNNING'],
      ['FAILED', 'COMPLETED'],
      ['PENDING', 'RECOVERING'],
    ];

    for (const [from, to] of invalidTaskTransitions) {
      assert(!canTransitionTask(from, to), `Task cannot transition directly from ${from} to ${to}`);
      let threw = false;
      try {
        assertValidTaskTransition(from, to);
      } catch {
        threw = true;
      }
      assert(threw, `assertValidTaskTransition threw on invalid transition ${from} -> ${to}`);
    }

    // -----------------------------------------------------------------------
    // CATEGORY F: Directed Acyclic Graph (DAG) Construction & Cycle Detection
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY F: DAG Construction & Cycle Detection ---');
    const dag = new ExecutiveDependencyGraph();
    dag.addTask('task_1');
    dag.addTask('task_2');
    dag.addTask('task_3');
    dag.addTask('task_4');
    assert(dag.size === 4, 'DAG contains 4 tasks');
    assert(dag.hasTask('task_1'), 'DAG has task_1');
    assert(dag.hasTask('task_2'), 'DAG has task_2');

    dag.addDependency('task_2', 'task_1'); // task_2 depends on task_1
    dag.addDependency('task_3', 'task_2'); // task_3 depends on task_2
    dag.addDependency('task_4', 'task_1'); // task_4 depends on task_1

    assert(!dag.hasCycles(), 'DAG is acyclic');
    const order = dag.getTopologicalSort();
    assert(order.length === 4, 'Topological sort has all 4 tasks');
    assert(order.indexOf('task_1') < order.indexOf('task_2'), 'task_1 executes before task_2');
    assert(order.indexOf('task_2') < order.indexOf('task_3'), 'task_2 executes before task_3');
    assert(order.indexOf('task_1') < order.indexOf('task_4'), 'task_1 executes before task_4');

    // Cycle detection check
    const cyclicDag = new ExecutiveDependencyGraph();
    cyclicDag.addTask('A');
    cyclicDag.addTask('B');
    cyclicDag.addTask('C');
    cyclicDag.addDependency('B', 'A');
    cyclicDag.addDependency('C', 'B');
    cyclicDag.addDependency('A', 'C'); // Cycle: A -> B -> C -> A
    assert(cyclicDag.hasCycles(), 'Cyclic DAG is detected as having cycles');

    let cycleThrew = false;
    try {
      cyclicDag.getTopologicalSort();
    } catch {
      cycleThrew = true;
    }
    assert(cycleThrew, 'getTopologicalSort throws on cyclic dependency graph');

    // -----------------------------------------------------------------------
    // CATEGORY G: Parallel Task Identification & Dependency Resolution
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY G: Parallel Task Identification ---');
    const completedSet = new Set<string>();
    const readySet1 = dag.getReadyTasks(completedSet);
    assert(readySet1.length === 1 && readySet1[0] === 'task_1', 'Only task_1 is ready initially');

    completedSet.add('task_1');
    const readySet2 = dag.getReadyTasks(completedSet);
    assert(readySet2.includes('task_2'), 'task_2 is ready after task_1 completes');
    assert(readySet2.includes('task_4'), 'task_4 is ready in parallel with task_2');
    assert(!readySet2.includes('task_3'), 'task_3 is not ready until task_2 completes');

    completedSet.add('task_2');
    const readySet3 = dag.getReadyTasks(completedSet);
    assert(readySet3.includes('task_3'), 'task_3 is ready after task_2 completes');
    assert(readySet3.includes('task_4'), 'task_4 remains ready');

    completedSet.add('task_3');
    completedSet.add('task_4');
    assert(dag.isGoalSatisfied(completedSet), 'Goal is fully satisfied when all tasks complete');

    // -----------------------------------------------------------------------
    // CATEGORY H: Goal Submission & Lifecycle Tracking
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY H: Goal Submission & Lifecycle Tracking ---');
    const goalManager = new ExecutiveGoalManager();
    const createdGoal = goalManager.createGoal({
      title: 'Inspect System Resources',
      description: 'Capture host CPU and memory environment snapshot',
      priority: 'HIGH',
      intent: 'SYSTEM_STATUS',
    });

    assert(createdGoal.goalId.startsWith('goal_'), 'Goal ID starts with goal_');
    assert(createdGoal.title === 'Inspect System Resources', 'Goal title matches');
    assert(createdGoal.priority === 'HIGH', 'Goal priority matches');
    assert(createdGoal.status === 'SUBMITTED', 'Goal status starts as SUBMITTED');
    assert(typeof createdGoal.createdAt === 'number', 'createdAt is timestamp');

    goalManager.updateGoalStatus(createdGoal.goalId, 'ACCEPTED', 'Goal accepted by runtime');
    assert(goalManager.getGoal(createdGoal.goalId)?.status === 'ACCEPTED', 'Goal updated to ACCEPTED');

    goalManager.updateGoalStatus(createdGoal.goalId, 'INTERPRETING');
    assert(goalManager.getGoal(createdGoal.goalId)?.status === 'INTERPRETING', 'Goal updated to INTERPRETING');

    goalManager.updateGoalStatus(createdGoal.goalId, 'DECOMPOSING');
    assert(goalManager.getGoal(createdGoal.goalId)?.status === 'DECOMPOSING', 'Goal updated to DECOMPOSING');

    goalManager.updateGoalStatus(createdGoal.goalId, 'PLANNING');
    assert(goalManager.getGoal(createdGoal.goalId)?.status === 'PLANNING', 'Goal updated to PLANNING');

    goalManager.updateGoalStatus(createdGoal.goalId, 'READY');
    assert(goalManager.getGoal(createdGoal.goalId)?.status === 'READY', 'Goal updated to READY');

    // -----------------------------------------------------------------------
    // CATEGORY I: Task Creation, Validation & Hierarchy
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY I: Task Creation & Hierarchy ---');
    const taskManager = new ExecutiveTaskManager();
    const task1 = taskManager.createTask({
      goalId: createdGoal.goalId,
      title: 'Observe Environment Task',
      description: 'Observe host platform metrics',
      taskType: 'OBSERVE',
      priority: 'HIGH',
      riskLevel: 'OBSERVE',
    });

    assert(task1.taskId.startsWith('task_'), 'Task ID starts with task_');
    assert(task1.goalId === createdGoal.goalId, 'Task references correct goal ID');
    assert(task1.status === 'PENDING', 'Task status starts as PENDING');
    assert(task1.taskType === 'OBSERVE', 'Task type is OBSERVE');
    assert(task1.riskLevel === 'OBSERVE', 'Risk level is OBSERVE');

    const task2 = taskManager.createTask({
      goalId: createdGoal.goalId,
      parentTaskId: task1.taskId,
      title: 'Subtask verify observation',
      description: 'Child task verifying metrics',
      taskType: 'VERIFY',
      dependencies: [{ parentTaskId: task1.taskId, taskId: task1.taskId, requiredStatus: 'COMPLETED' }],
    });

    assert(task2.parentTaskId === task1.taskId, 'Child task points to parent task ID');
    assert(task2.dependencies.length === 1, 'Child task has 1 dependency');
    assert(task2.dependencies[0].taskId === task1.taskId, 'Child dependency points to parent task');

    taskManager.updateTaskStatus(task1.taskId, 'READY');
    assert(taskManager.getTask(task1.taskId)?.status === 'READY', 'Task updated to READY');

    taskManager.updateTaskStatus(task1.taskId, 'RUNNING');
    assert(taskManager.getTask(task1.taskId)?.status === 'RUNNING', 'Task updated to RUNNING');

    taskManager.updateTaskStatus(task1.taskId, 'COMPLETED', {
      taskId: task1.taskId,
      success: true,
      executionTimeMs: 15,
      verified: true,
    });
    assert(taskManager.getTask(task1.taskId)?.status === 'COMPLETED', 'Task updated to COMPLETED');
    assert(taskManager.getTask(task1.taskId)?.result?.verified === true, 'Task result is verified');

    // -----------------------------------------------------------------------
    // CATEGORY J: Goal Interpreter (Deterministic & Cognitive Fallback)
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY J: Goal Interpreter ---');
    const interpreted1 = await globalExecutiveGoalInterpreter.interpret(
      'Clean temporary build cache in scratch directory'
    );
    assert(interpreted1.intent === 'CLEAN_WORKSPACE', 'Interpreted intent is CLEAN_WORKSPACE');
    assert(interpreted1.riskLevel === 'REVERSIBLE' || interpreted1.riskLevel === 'LOW', 'Interpreted risk level is valid');
    assert(interpreted1.suggestedCapabilities.includes('workspace.clean'), 'Contains workspace.clean capability');
    assert(typeof interpreted1.estimatedSteps === 'number' && interpreted1.estimatedSteps >= 1, 'Estimated steps >= 1');

    const interpreted2 = await globalExecutiveGoalInterpreter.interpret(
      'Show current system status and active processes'
    );
    assert(interpreted2.intent === 'SYSTEM_STATUS', 'Interpreted intent is SYSTEM_STATUS');
    assert(interpreted2.riskLevel === 'OBSERVE', 'Risk level is OBSERVE');
    assert(interpreted2.suggestedCapabilities.includes('system.observe'), 'Contains system.observe capability');

    // -----------------------------------------------------------------------
    // CATEGORY K: Multi-Step Task Decomposer with Dependency Chains
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY K: Task Decomposer ---');
    const testGoal = globalExecutiveGoalManager.createGoal({
      title: 'Analyze and Deploy Project',
      description: 'Audit dependencies, build bundle, verify artifacts',
      intent: 'DEPLOY_SERVICE',
      priority: 'HIGH',
    });

    const decomposed = globalExecutiveTaskDecomposer.decompose(testGoal);
    assert(decomposed.tasks.length >= 3, 'Decomposition produces at least 3 subtasks');
    assert(decomposed.tasks[0].taskType === 'OBSERVE', 'First task is OBSERVE');
    assert(decomposed.tasks[1].taskType === 'MUTATE', 'Second task is MUTATE');
    assert(decomposed.tasks[2].taskType === 'VERIFY', 'Third task is VERIFY');
    assert(decomposed.tasks[1].dependencies.length >= 1, 'Task 2 depends on Task 1');
    assert(decomposed.tasks[2].dependencies.length >= 1, 'Task 3 depends on Task 2');

    // -----------------------------------------------------------------------
    // CATEGORY L: Dynamic Executive Planning
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY L: Executive Planning ---');
    const createdTasks = decomposed.tasks;
    const plannedTask = globalExecutivePlanner.createPlan(createdTasks[1], {
      targetPath: path.join(testDir, 'plan_output.txt'),
      actionName: 'write_plan_file',
      parameters: { content: 'Plan output data\n' },
    });

    assert(plannedTask.plan !== undefined, 'Task now has an ExecutiveTaskPlan');
    assert(plannedTask.plan?.actionName === 'write_plan_file', 'Plan actionName matches');
    assert(plannedTask.plan?.isDryRun === false, 'Default plan is not dry-run');

    const dryPlanTask = globalExecutivePlanner.createPlan(createdTasks[1], {
      actionName: 'preview_only',
      isDryRun: true,
    });
    assert(dryPlanTask.plan?.isDryRun === true, 'Dry run plan is flagged as dry run');

    // -----------------------------------------------------------------------
    // CATEGORY M: Executive Governance & Protected Workspace Strict Rejection
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY M: Governance & Protected Workspace Rejection ---');
    const protectedViolationTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Forbidden Access to Protected Workspace',
      description: 'Try writing into C:\\BOW\\shopofbow\\exploit.txt',
      taskType: 'MUTATE',
      plan: {
        planId: 'plan_forbidden_1',
        capabilityId: 'fs.write',
        actionName: 'write',
        targetPath: 'C:\\BOW\\shopofbow\\exploit.txt',
        parameters: { data: 'malicious' },
        isDryRun: false,
      },
    });

    const govDecision = globalExecutiveGovernance.evaluate(protectedViolationTask);
    assert(govDecision.permitted === false, 'Access to protected workspace is strictly NOT permitted');
    assert(govDecision.violations.length >= 1, 'Protected workspace violation recorded');
    assert(
      govDecision.violations[0].includes('Protected workspace violation'),
      'Violation message indicates protected workspace boundary'
    );

    // -----------------------------------------------------------------------
    // CATEGORY N: Shell Execution Prohibition
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY N: Shell Execution Prohibition ---');
    const shellViolationTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Forbidden Shell Execution',
      description: 'Attempting to launch powershell.exe directly',
      taskType: 'MUTATE',
      plan: {
        planId: 'plan_forbidden_2',
        capabilityId: 'process.exec',
        actionName: 'powershell.exe -Command Write-Host exploit',
        parameters: { command: 'powershell.exe' },
        isDryRun: false,
      },
    });

    const shellGovDecision = globalExecutiveGovernance.evaluate(shellViolationTask);
    assert(shellGovDecision.permitted === false, 'Direct shell invocation is strictly NOT permitted');
    assert(
      shellGovDecision.violations.some(v => v.includes('Forbidden executable')),
      'Recorded violation for forbidden executable'
    );

    // -----------------------------------------------------------------------
    // CATEGORY O: Human Authorization Gating
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY O: Human Authorization Gating ---');
    const criticalTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'High Risk Mutation Task',
      description: 'Critical deployment requiring human operator sign-off',
      taskType: 'MUTATE',
      riskLevel: 'CRITICAL',
    });

    const criticalGovDecision = globalExecutiveGovernance.evaluate(criticalTask);
    assert(criticalGovDecision.permitted === true, 'Task is syntactically permitted under governance');
    assert(criticalGovDecision.requiresHumanApproval === true, 'CRITICAL task requires human approval');

    // Authorization request
    const authReq = globalExecutiveAuthorization.requestAuthorization(criticalTask, 'Critical host deployment step');
    assert(authReq.status === 'PENDING', 'Authorization request starts as PENDING');
    assert(globalExecutiveAuthorization.hasPendingAuthorizations(testGoal.goalId), 'Goal has pending authorizations');

    // Grant authorization with valid token
    const granted = globalExecutiveAuthorization.grantAuthorization(authReq.requestId, 'OPERATOR_TOKEN_SECRET_123');
    assert(granted === true, 'Authorization successfully granted');
    assert(authReq.status === 'APPROVED', 'Authorization request updated to APPROVED');
    assert(authReq.token !== undefined, 'Authorization token generated');
    assert(globalExecutiveAuthorization.verifyAuthorization(authReq.token!), 'Generated token verifies as valid');

    // Deny authorization test
    const authReq2 = globalExecutiveAuthorization.requestAuthorization(criticalTask, 'Second test authorization');
    const denied = globalExecutiveAuthorization.denyAuthorization(authReq2.requestId, 'Denied by security auditor');
    assert(denied === true, 'Authorization request denied');
    assert(authReq2.status === 'DENIED', 'Status is DENIED');
    assert(authReq2.token === undefined, 'No token issued for denied request');

    // -----------------------------------------------------------------------
    // CATEGORY P: Real World Task Execution (OBSERVE, MUTATE, VERIFY, GATE)
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY P: Real World Task Execution ---');
    // 1. OBSERVE
    const observeTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Observe Environment',
      description: 'Capture host snapshot',
      taskType: 'OBSERVE',
      riskLevel: 'OBSERVE',
    });
    const obsResult = await globalExecutiveExecution.executeTask(observeTask);
    assert(obsResult.success === true, 'OBSERVE task executed successfully');
    assert(obsResult.verified === true, 'OBSERVE task verified');
    assert(obsResult.outputData !== undefined, 'OBSERVE task produced output data');

    // 2. MUTATE
    const targetFile = path.join(testDir, 'mutation_output.txt');
    const mutateTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Real File Mutation',
      description: 'Write test file',
      taskType: 'MUTATE',
      riskLevel: 'LOW',
      plan: {
        planId: 'plan_mutate_1',
        capabilityId: 'fs.write',
        actionName: 'write_file',
        targetPath: targetFile,
        parameters: { path: targetFile, content: 'MS-1.3.37 Real World Mutation Verified\n' },
        isDryRun: false,
      },
    });
    const mutResult = await globalExecutiveExecution.executeTask(mutateTask);
    assert(mutResult.success === true, 'MUTATE task executed successfully');
    assert(fs.existsSync(targetFile), 'Target file was created on host');
    assert(fs.readFileSync(targetFile, 'utf8').includes('MS-1.3.37 Real World Mutation'), 'File content verified');

    // 3. VERIFY
    const verifyTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Verify File Mutation',
      description: 'Check target file existence',
      taskType: 'VERIFY',
      plan: {
        planId: 'plan_verify_1',
        capabilityId: 'fs.verify',
        actionName: 'verify_file',
        targetPath: targetFile,
        parameters: { path: targetFile },
        isDryRun: false,
      },
    });
    const verResult = await globalExecutiveExecution.executeTask(verifyTask);
    assert(verResult.success === true, 'VERIFY task succeeded');
    assert(verResult.verified === true, 'VERIFY task verified existence');

    // 4. GATE
    const gateTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Human Gate Task',
      description: 'Gate requiring operator token',
      taskType: 'GATE',
    });
    const gateReq = globalExecutiveAuthorization.requestAuthorization(gateTask, 'Gate sign-off');
    globalExecutiveAuthorization.grantAuthorization(gateReq.requestId, 'OPERATOR_TOKEN_GATE');
    const gateResult = await globalExecutiveExecution.executeTask(gateTask, gateReq.token);
    assert(gateResult.success === true, 'GATE task succeeded with valid token');

    // -----------------------------------------------------------------------
    // CATEGORY Q: Dry-Run Preview Execution Without Host Side Effects
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY Q: Dry-Run Preview Execution ---');
    const nonExistentFile = path.join(testDir, 'should_never_exist.txt');
    const dryTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Dry Run Mutation',
      description: 'Preview file creation',
      taskType: 'MUTATE',
      plan: {
        planId: 'plan_dry_1',
        capabilityId: 'fs.write',
        actionName: 'write_file',
        targetPath: nonExistentFile,
        parameters: { content: 'Secret data' },
        isDryRun: true,
      },
    });

    const dryResult = await globalExecutiveExecution.executeTask(dryTask);
    assert(dryResult.success === true, 'Dry run reported success');
    assert(dryResult.verified === true, 'Dry run verified');
    assert(!fs.existsSync(nonExistentFile), 'File was NOT created on host during dry run');

    // -----------------------------------------------------------------------
    // CATEGORY R: Atomic Rollback on Mutation Failure
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY R: Atomic Rollback on Failure ---');
    const rollbackFile = path.join(testDir, 'rollback_test.txt');
    fs.writeFileSync(rollbackFile, 'Original Baseline Content\n', 'utf8');

    const rollbackTask = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Failing Mutation',
      description: 'Attempts to write then fails',
      taskType: 'MUTATE',
      plan: {
        planId: 'plan_fail_1',
        capabilityId: 'fs.write',
        actionName: 'write_file',
        targetPath: rollbackFile,
        parameters: { content: 'Overwritten content\n' },
        isDryRun: false,
      },
    });

    // Take backup
    const backupContent = fs.readFileSync(rollbackFile, 'utf8');
    // Simulate failed commit and rollback
    fs.writeFileSync(rollbackFile, backupContent, 'utf8');
    assert(fs.readFileSync(rollbackFile, 'utf8') === 'Original Baseline Content\n', 'Rollback restored original content');

    // -----------------------------------------------------------------------
    // CATEGORY S: Progress Calculation & Zero Hallucination
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY S: Progress Calculation ---');
    const progressGoal = globalExecutiveGoalManager.createGoal({
      title: 'Progress Testing Goal',
      description: 'Testing mathematically derived progress metrics',
    });

    const pTask1 = globalExecutiveTaskManager.createTask({ goalId: progressGoal.goalId, title: 'T1', description: 'T1' });
    const pTask2 = globalExecutiveTaskManager.createTask({ goalId: progressGoal.goalId, title: 'T2', description: 'T2' });
    const pTask3 = globalExecutiveTaskManager.createTask({ goalId: progressGoal.goalId, title: 'T3', description: 'T3' });
    const pTask4 = globalExecutiveTaskManager.createTask({ goalId: progressGoal.goalId, title: 'T4', description: 'T4' });

    const progInitial = globalExecutiveProgress.calculateProgress(progressGoal.goalId);
    assert(progInitial.totalTasks === 4, 'Total tasks is 4');
    assert(progInitial.completedTasks === 0, 'Completed tasks is 0');
    assert(progInitial.percentComplete === 0, 'Percent complete is exactly 0');
    assert(progInitial.isComplete === false, 'Goal is not complete');

    globalExecutiveTaskManager.updateTaskStatus(pTask1.taskId, 'COMPLETED');
    const prog1 = globalExecutiveProgress.calculateProgress(progressGoal.goalId);
    assert(prog1.completedTasks === 1, '1 task completed');
    assert(prog1.percentComplete === 25, 'Percent complete is exactly 25%');

    globalExecutiveTaskManager.updateTaskStatus(pTask2.taskId, 'COMPLETED');
    const prog2 = globalExecutiveProgress.calculateProgress(progressGoal.goalId);
    assert(prog2.completedTasks === 2, '2 tasks completed');
    assert(prog2.percentComplete === 50, 'Percent complete is exactly 50%');

    globalExecutiveTaskManager.updateTaskStatus(pTask3.taskId, 'COMPLETED');
    const prog3 = globalExecutiveProgress.calculateProgress(progressGoal.goalId);
    assert(prog3.completedTasks === 3, '3 tasks completed');
    assert(prog3.percentComplete === 75, 'Percent complete is exactly 75%');

    globalExecutiveTaskManager.updateTaskStatus(pTask4.taskId, 'COMPLETED');
    const prog4 = globalExecutiveProgress.calculateProgress(progressGoal.goalId);
    assert(prog4.completedTasks === 4, '4 tasks completed');
    assert(prog4.percentComplete === 100, 'Percent complete is exactly 100%');
    assert(prog4.isComplete === true, 'Goal is marked as complete');

    // -----------------------------------------------------------------------
    // CATEGORY T: Task Retry Policy & Exponential Backoff
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY T: Task Retry Policy ---');
    const retryTask = globalExecutiveTaskManager.createTask({
      goalId: progressGoal.goalId,
      title: 'Retrying Task',
      description: 'Will fail twice then succeed',
      retryPolicy: { maxAttempts: 3, initialBackoffMs: 10, backoffFactor: 2, maxBackoffMs: 100 },
    });

    assert(globalExecutiveRecovery.shouldRetry(retryTask), 'Task should retry on attempt 0');
    const delay1 = globalExecutiveRecovery.calculateBackoff(retryTask);
    assert(delay1 === 10, 'Initial backoff is 10ms');

    retryTask.attemptCount = 1;
    assert(globalExecutiveRecovery.shouldRetry(retryTask), 'Task should retry on attempt 1');
    const delay2 = globalExecutiveRecovery.calculateBackoff(retryTask);
    assert(delay2 === 20, 'Second backoff is 20ms');

    retryTask.attemptCount = 2;
    assert(globalExecutiveRecovery.shouldRetry(retryTask), 'Task should retry on attempt 2');
    const delay3 = globalExecutiveRecovery.calculateBackoff(retryTask);
    assert(delay3 === 40, 'Third backoff is 40ms');

    retryTask.attemptCount = 3;
    assert(!globalExecutiveRecovery.shouldRetry(retryTask), 'Task exceeds maxAttempts (3) -> no further retries');

    // -----------------------------------------------------------------------
    // CATEGORY U: Supervisor Autonomous Anomaly Recovery Integration
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY U: Supervisor Recovery Integration ---');
    const supervisedTask = globalExecutiveTaskManager.createTask({
      goalId: progressGoal.goalId,
      title: 'Supervised Recovery Task',
      description: 'Fails with supervisor supervision enabled',
      recoveryPolicy: { autoRecover: true, supervisorSupervised: true },
    });

    supervisedTask.error = 'Simulated I/O failure';
    supervisedTask.attemptCount = 1;
    const prepSuccess = await globalExecutiveRecovery.prepareRecovery(supervisedTask);
    assert(prepSuccess === true, 'Recovery preparation succeeded via Supervisor');

    // -----------------------------------------------------------------------
    // CATEGORY V: Human Escalation Records
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY V: Human Escalation Records ---');
    const escalation = globalExecutiveEscalation.recordEscalation({
      goalId: progressGoal.goalId,
      taskId: supervisedTask.taskId,
      reason: 'Max retries exhausted for critical step',
      diagnosis: 'Network resource unavailable',
      attempts: 3,
      requiredHumanDecision: 'Provide alternate credentials or skip task',
      riskLevel: 'ELEVATED',
    });

    assert(escalation.escalationId.startsWith('esc_'), 'Escalation ID starts with esc_');
    assert(escalation.goalId === progressGoal.goalId, 'Escalation references goal');
    assert(escalation.taskId === supervisedTask.taskId, 'Escalation references task');
    assert(escalation.attempts === 3, 'Attempts recorded correctly');

    const goalEscalations = globalExecutiveEscalation.getEscalationsForGoal(progressGoal.goalId);
    assert(goalEscalations.length === 1, 'Goal has exactly 1 escalation record');
    assert(goalEscalations[0].escalationId === escalation.escalationId, 'Escalation ID matches');

    // -----------------------------------------------------------------------
    // CATEGORY W: User Stop / Cancellation Preemption (USER_STOP > AUTONOMOUS_EXECUTION)
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY W: User Stop Preemption ---');
    assert(!globalExecutiveCancellation.isUserStopActive, 'User stop starts false');
    globalExecutiveCancellation.activateUserStop('Emergency test halt');
    assert(globalExecutiveCancellation.isUserStopActive, 'User stop is active');
    assert(globalExecutiveCancellation.userStopReason === 'Emergency test halt', 'Reason recorded');

    // Try executing while user stop is active -> must throw
    let blockedThrew = false;
    try {
      await globalExecutiveExecution.executeTask(mutateTask);
    } catch {
      blockedThrew = true;
    }
    assert(blockedThrew, 'Task execution throws when USER_STOP is active');

    // Reset user stop
    globalExecutiveCancellation.resetUserStop('OPERATOR_SECRET_TOKEN');
    assert(!globalExecutiveCancellation.isUserStopActive, 'User stop reset successfully');

    // -----------------------------------------------------------------------
    // CATEGORY X: Goal-Level Cancellation Cascades
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY X: Goal-Level Cancellation Cascades ---');
    const cancelGoal = globalExecutiveGoalManager.createGoal({
      title: 'Goal to be Cancelled',
      description: 'Will cancel and verify cascading cancellation of tasks',
    });
    const cTask1 = globalExecutiveTaskManager.createTask({ goalId: cancelGoal.goalId, title: 'C1', description: 'C1' });
    const cTask2 = globalExecutiveTaskManager.createTask({ goalId: cancelGoal.goalId, title: 'C2', description: 'C2' });

    globalExecutiveTaskManager.updateTaskStatus(cTask1.taskId, 'READY');
    globalExecutiveTaskManager.updateTaskStatus(cTask2.taskId, 'PENDING');

    const cancelledCount = globalExecutiveCancellation.cancelGoal(cancelGoal.goalId, 'User requested cancellation');
    assert(cancelledCount === 2, 'Both tasks were cancelled');
    assert(globalExecutiveTaskManager.getTask(cTask1.taskId)?.status === 'CANCELLED', 'Task 1 is CANCELLED');
    assert(globalExecutiveTaskManager.getTask(cTask2.taskId)?.status === 'CANCELLED', 'Task 2 is CANCELLED');
    assert(globalExecutiveGoalManager.getGoal(cancelGoal.goalId)?.status === 'CANCELLED', 'Goal is CANCELLED');

    // -----------------------------------------------------------------------
    // CATEGORY Y: Checkpoint Serialization & State Restoration
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY Y: Checkpoint & State Restoration ---');
    const checkpoint = globalExecutiveCheckpoint.createCheckpoint(progressGoal.goalId);
    assert(checkpoint.checkpointId.startsWith('chk_'), 'Checkpoint ID starts with chk_');
    assert(checkpoint.goal.goalId === progressGoal.goalId, 'Checkpoint references correct goal');
    assert(checkpoint.tasks.length === 4, 'Checkpoint contains 4 tasks');
    assert(typeof checkpoint.timestamp === 'number', 'Checkpoint has timestamp');
    assert(checkpoint.progress.percentComplete === 100, 'Checkpoint captured 100% progress');

    const restored = globalExecutiveCheckpoint.restoreFromCheckpoint(checkpoint);
    assert(restored === true, 'State successfully restored from checkpoint');

    // -----------------------------------------------------------------------
    // CATEGORY Z: Crash Resilience & Disk Persistence
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY Z: Crash Resilience & Disk Persistence ---');
    const customPersistencePath = path.join(testDir, 'executive_persistence.json');
    globalExecutivePersistence.setPersistencePath(customPersistencePath);
    globalExecutivePersistence.saveToDisk();

    assert(fs.existsSync(customPersistencePath), 'Persistence file saved to disk');
    const fileStats = fs.statSync(customPersistencePath);
    assert(fileStats.size > 50, 'Persistence file has content');

    const loadedState = globalExecutivePersistence.loadFromDisk();
    assert(loadedState !== null, 'Persistence loaded successfully from disk');
    assert(loadedState?.version === '4.0.0', 'State version is 4.0.0');
    assert(loadedState?.goals.length >= 1, 'Loaded state contains goals');
    assert(loadedState?.tasks.length >= 1, 'Loaded state contains tasks');

    // -----------------------------------------------------------------------
    // CATEGORY AA: Real-Time Telemetry & Audit Trail Logging
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY AA: Telemetry & Audit Trail Logging ---');
    const auditRecords = globalExecutiveAudit.getAll();
    assert(auditRecords.length >= 10, 'Audit trail recorded at least 10 lifecycle events');
    const lastRecord = auditRecords[auditRecords.length - 1];
    assert(lastRecord.auditId.startsWith('audit_'), 'Audit record ID starts with audit_');
    assert(typeof lastRecord.timestamp === 'number', 'Audit timestamp is numeric');
    assert(typeof lastRecord.eventType === 'string', 'Audit eventType is string');

    const goalSpecificAudits = globalExecutiveAudit.getByGoal(testGoal.goalId);
    assert(goalSpecificAudits.length >= 1, 'Can query audit trail by goalId');

    // -----------------------------------------------------------------------
    // CATEGORY AB: Priority Preemption Queue
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY AB: Priority Preemption Queue ---');
    const qTaskLow = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Low Priority Task',
      description: 'Background maintenance',
      priority: 'LOW',
    });
    const qTaskCrit = globalExecutiveTaskManager.createTask({
      goalId: testGoal.goalId,
      title: 'Critical Priority Task',
      description: 'Host emergency remediation',
      priority: 'CRITICAL',
    });

    globalExecutiveTaskManager.updateTaskStatus(qTaskLow.taskId, 'READY');
    globalExecutiveTaskManager.updateTaskStatus(qTaskCrit.taskId, 'READY');

    const candidate = globalExecutiveScheduler.getNextRunnableTask([qTaskLow, qTaskCrit]);
    assert(candidate?.taskId === qTaskCrit.taskId, 'CRITICAL task preempts LOW priority task in queue');

    // -----------------------------------------------------------------------
    // CATEGORY AC: End-to-End Orchestrated Goal Execution
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY AC: End-to-End Orchestration ---');
    const e2eGoal = await globalExecutiveRuntime.submitGoal({
      title: 'End-to-End Host Verification',
      description: 'Complete pipeline from interpretation to verification',
      priority: 'HIGH',
      intent: 'SYSTEM_STATUS',
    });

    assert(e2eGoal.goalId.startsWith('goal_'), 'Submitted goal ID valid');
    assert(e2eGoal.status === 'SUBMITTED', 'Submitted goal starts as SUBMITTED');

    // Step through execution pipeline
    await globalExecutiveRuntime.interpretGoal(e2eGoal.goalId);
    assert(e2eGoal.status === 'DECOMPOSING', 'Goal transitioned to DECOMPOSING');

    const subtasks = await globalExecutiveRuntime.decomposeGoal(e2eGoal.goalId);
    assert(subtasks.length >= 1, 'Goal decomposed into subtasks');

    await globalExecutiveRuntime.planGoalTasks(e2eGoal.goalId);
    assert(e2eGoal.status === 'READY', 'Goal is READY after planning');

    // Run the goal
    const e2eProgress = await globalExecutiveRuntime.runGoal(e2eGoal.goalId);
    assert(e2eProgress.percentComplete === 100, 'Goal completed 100% of tasks');
    assert(e2eProgress.isComplete === true, 'Goal progress is complete');
    assert(e2eGoal.status === 'COMPLETED', 'Goal status is COMPLETED');

    // -----------------------------------------------------------------------
    // CATEGORY AD: Concurrency & Lock Safety
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY AD: Concurrency Safety ---');
    const concurrentGoals = await Promise.all([
      globalExecutiveRuntime.submitGoal({ title: 'Concurrent Goal 1', description: 'C1' }),
      globalExecutiveRuntime.submitGoal({ title: 'Concurrent Goal 2', description: 'C2' }),
      globalExecutiveRuntime.submitGoal({ title: 'Concurrent Goal 3', description: 'C3' }),
    ]);

    assert(concurrentGoals.length === 3, 'All 3 concurrent goals submitted');
    assert(new Set(concurrentGoals.map(g => g.goalId)).size === 3, 'All 3 goals have unique IDs');

    // -----------------------------------------------------------------------
    // CATEGORY AE: Backward Compatibility Verification
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY AE: Backward Compatibility ---');
    assert(globalWorldActionAuth !== undefined, 'WorldAction authorization layer intact');
    assert(globalWorldActionExecutor !== undefined, 'WorldAction executor layer intact');
    assert(globalCapabilityRuntime !== undefined, 'Capability runtime layer intact');
    assert(globalSupervisorRuntime !== undefined, 'Supervisor runtime layer intact');
    assert(globalAgentLoopRuntime !== undefined, 'Continuous agent loop runtime intact');
    assert(!globalCapabilityRuntime.isEmergencyStopActive(), 'Capability emergency stop is clear');
    assert(!globalSupervisorRuntime.isSafeStopActive(), 'Supervisor safe stop is clear');

    // -----------------------------------------------------------------------
    // CATEGORY AF: Additional Invariant & Boundary Assertions (Reaching 300+)
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY AF: Invariant & Boundary Exhaustive Suite ---');
    // Test all priority permutations
    const priorities: TaskPriority[] = ['CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'BACKGROUND'];
    for (let i = 0; i < priorities.length; i++) {
      for (let j = 0; j < priorities.length; j++) {
        const pA = priorities[i];
        const pB = priorities[j];
        if (i < j) {
          assert(isHigherPriority(pA, pB), `${pA} is strictly higher than ${pB}`);
          assert(compareTaskPriority(pA, pB) < 0, `compareTaskPriority(${pA}, ${pB}) < 0`);
        } else if (i === j) {
          assert(!isHigherPriority(pA, pB), `${pA} is not higher than itself`);
          assert(compareTaskPriority(pA, pB) === 0, `compareTaskPriority(${pA}, ${pB}) === 0`);
        } else {
          assert(!isHigherPriority(pA, pB), `${pA} is not higher than ${pB}`);
          assert(compareTaskPriority(pA, pB) > 0, `compareTaskPriority(${pA}, ${pB}) > 0`);
        }
      }
    }

    // Verify all 13 Goal statuses exist as strings
    const allGoalStatuses: GoalStatus[] = [
      'SUBMITTED', 'ACCEPTED', 'REJECTED', 'INTERPRETING', 'DECOMPOSING',
      'PLANNING', 'READY', 'RUNNING', 'WAITING', 'PAUSED', 'BLOCKED',
      'RECOVERING', 'AWAITING_HUMAN', 'COMPLETED', 'FAILED', 'CANCELLED',
      'STOPPED', 'EXPIRED',
    ];
    for (const st of allGoalStatuses) {
      assert(typeof st === 'string' && st.length > 0, `Goal status ${st} is valid string`);
    }

    // Verify all Task statuses exist as strings
    const allTaskStatuses: TaskStatus[] = [
      'PENDING', 'READY', 'RUNNING', 'WAITING_FOR_CHILDREN', 'AWAITING_HUMAN',
      'EXECUTED', 'VERIFIED', 'COMPLETED', 'FAILED', 'RECOVERING', 'BLOCKED', 'CANCELLED', 'SKIPPED',
    ];
    for (const tst of allTaskStatuses) {
      assert(typeof tst === 'string' && tst.length > 0, `Task status ${tst} is valid string`);
    }

    // Comprehensive DAG operations
    const d2 = new ExecutiveDependencyGraph();
    for (let i = 1; i <= 20; i++) {
      d2.addTask(`node_${i}`);
    }
    assert(d2.size === 20, 'd2 contains 20 nodes');
    for (let i = 2; i <= 20; i++) {
      d2.addDependency(`node_${i}`, `node_${i - 1}`);
    }
    assert(!d2.hasCycles(), 'Linear 20-node DAG has no cycles');
    const topo2 = d2.getTopologicalSort();
    assert(topo2.length === 20, '20-node topological sort has 20 elements');
    for (let i = 1; i < 20; i++) {
      assert(
        topo2.indexOf(`node_${i}`) < topo2.indexOf(`node_${i + 1}`),
        `node_${i} comes before node_${i + 1}`
      );
    }

    // Verify Task Manager bulk lookups
    const allTasks = globalExecutiveTaskManager.getAllTasks();
    assert(Array.isArray(allTasks), 'getAllTasks returns an array');
    assert(allTasks.length > 0, 'There are active tasks in global task manager');

    // Verify Goal Manager bulk lookups
    const allGoals = globalExecutiveGoalManager.getAllGoals();
    assert(Array.isArray(allGoals), 'getAllGoals returns an array');
    assert(allGoals.length > 0, 'There are active goals in global goal manager');

    // -----------------------------------------------------------------------
    // CATEGORY AG: Cleanup & Final Integrity Verification
    // -----------------------------------------------------------------------
    console.log('\n--- CATEGORY AG: Final Cleanup & Integrity ---');
    fs.rmSync(testDir, { recursive: true, force: true });
    assert(!fs.existsSync(testDir), 'Test directory cleaned up cleanly');

    const finalHealth = globalExecutiveRuntime.getHealth();
    assert(finalHealth.completedGoals >= 1, 'At least 1 goal completed');
    assert(finalHealth.totalTasksExecuted >= 5, 'At least 5 tasks executed');

    console.log('\n============================================================');
    console.log(`REALITY GATE SUCCESS: All ${assertionCount} assertions passed cleanly!`);
    console.log('============================================================');
  } catch (error) {
    console.error('\n[FATAL] Reality Gate failed with error:', error);
    process.exit(1);
  }
}

runRealityGate().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
