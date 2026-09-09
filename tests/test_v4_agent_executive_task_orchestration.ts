// BOWCON V4.0 — MS-1.3.37 Executive Task & Long-Horizon Goal Orchestration Reality Gate
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  ExecutiveDependencyGraph,
  ExecutiveGoalManager,
  ExecutiveTaskManager,
  globalExecutiveRuntime,
  globalExecutiveCheckpoint,
  globalExecutivePersistence,
  globalExecutiveAudit,
  globalExecutiveCancellation,
  globalExecutiveAuthorization,
  globalExecutiveGovernance,
  globalExecutiveScheduler,
  globalExecutiveProgress,
  globalExecutiveRecovery,
} from '../src/index.js';

let checks = 0;
const check = (value: unknown, message: string): void => { checks++; assert.ok(value, message); };
const rejects = (fn: () => unknown, message: string): void => {
  checks++;
  assert.throws(fn, undefined, message);
};

async function main(): Promise<void> {
  const sandbox = path.resolve('scratch', 'executive-reality-gate');
  fs.rmSync(sandbox, { recursive: true, force: true });
  fs.mkdirSync(sandbox, { recursive: true });

  try {
    // Authoritative transitions and a strict DAG: no cycles, duplicate IDs, or orphan dependencies.
    const goals = new ExecutiveGoalManager();
    const tasks = new ExecutiveTaskManager();
    const goal = goals.createGoal({ sessionId: 'session-a', objective: 'Validate DAG' });
    const a = tasks.createTask({ goalId: goal.goalId, title: 'A', description: 'root' });
    const b = tasks.createTask({ goalId: goal.goalId, title: 'B', description: 'dependent', dependencies: [{ parentTaskId: a.taskId, requiredStatus: 'COMPLETED' }] });
    const graph = new ExecutiveDependencyGraph();
    graph.addTask(a);
    graph.addTask(b);
    check(graph.validateGraph().valid, 'valid dependency graph is accepted');
    check(graph.getReadyTasks().map(t => t.taskId).includes(a.taskId), 'root task is ready');
    check(!graph.getReadyTasks().map(t => t.taskId).includes(b.taskId), 'dependent task is blocked');
    rejects(() => graph.addDependency(a.taskId, b.taskId), 'cycles are rejected');
    rejects(() => graph.addDependency(a.taskId, 'missing'), 'orphan dependencies are rejected');
    rejects(() => graph.addTask(a), 'duplicate task IDs are rejected');
    check(graph.topologicalOrder()[0] === a.taskId, 'topological order is deterministic for dependency root');
    check(graph.getBlockedTasks().some(t => t.taskId === b.taskId), 'blocked-task detection reflects unmet parent state');
    check(globalExecutiveScheduler.acquireLock('resource:test'), 'resource lock is acquired exclusively');
    check(!globalExecutiveScheduler.acquireLock('resource:test'), 'resource conflict blocks second acquisition');
    globalExecutiveScheduler.releaseLock('resource:test');
    check(globalExecutiveScheduler.activeLockCount === 0, 'resource lock is released deterministically');

    // Governance, authorization binding, anti-replay, secret redaction, and bounded recovery.
    const critical = tasks.createTask({ goalId: goal.goalId, title: 'Critical', description: 'human gated', riskLevel: 'CRITICAL' });
    check(globalExecutiveGovernance.evaluate(critical).requiresHumanApproval, 'critical priority/risk cannot bypass human gate');
    const blockedTarget = tasks.createTask({ goalId: goal.goalId, title: 'Blocked', description: 'protected target', plan: { planId: 'p', capabilityId: 'cap_fs_read', actionName: 'READ', targetPath: 'C:/BOW/shopofbow/secret', parameters: {}, isDryRun: true } });
    check(!globalExecutiveGovernance.evaluate(blockedTarget).permitted, 'protected workspace target is governance-rejected');
    const token = globalExecutiveAuthorization.issueHumanToken(critical.taskId, 'session-a', 'operator');
    check(globalExecutiveAuthorization.consumeToken(token.tokenId, critical.taskId, 'session-a').consumed, 'human token is task/session-bound and consumed');
    rejects(() => globalExecutiveAuthorization.consumeToken(token.tokenId, critical.taskId, 'session-a'), 'authorization token anti-replay is enforced');
    rejects(() => globalExecutiveAuthorization.issueHumanToken(critical.taskId, 'session-a', '').tokenId, 'empty approver cannot issue a token');
    critical.attemptCount = critical.retryPolicy.maxAttempts;
    check(globalExecutiveRecovery.assessFailure(critical, goal.goalId).suggestedAction === 'ESCALATE', 'retry limit escalates rather than loops');
    const secretEvent = globalExecutiveAudit.record('SECRET_TEST', goal.goalId, { password: 'p', token: 'secret' });
    check(secretEvent.details.password === '[REDACTED_SECRET]' && secretEvent.details.token === '[REDACTED_SECRET]', 'audit recursively redacts secret fields');

    // Durable checkpoints retain identity and fail closed on tampering and stale data.
    const checkpoint = globalExecutiveCheckpoint.createCheckpoint(goal, [a, b]);
    check(globalExecutiveCheckpoint.validateCheckpoint(checkpoint).valid, 'fresh checksum-valid checkpoint is accepted');
    const tampered = { ...checkpoint, goal: { ...checkpoint.goal, objective: 'tampered' } };
    check(!globalExecutiveCheckpoint.validateCheckpoint(tampered).valid, 'tampered checkpoint is rejected');
    check(!globalExecutiveCheckpoint.validateCheckpoint(checkpoint, checkpoint.timestamp + 25 * 60 * 60 * 1000).valid, 'stale checkpoint is rejected');
    const persistence = new (globalExecutivePersistence.constructor as new (dir: string) => typeof globalExecutivePersistence)(sandbox);
    persistence.saveCheckpoint(checkpoint);
    check(persistence.loadCheckpoint(goal.goalId)?.goal.goalId === goal.goalId, 'persisted checkpoint reloads with original goal ID');

    // End-to-end governed execution: objective -> task DAG -> capability observation -> verification -> completion.
    globalExecutiveRuntime.clear();
    const e2e = await globalExecutiveRuntime.submitGoal({ sessionId: 'session-e2e', objective: 'Check host health', description: 'Observe then verify host health' });
    check(e2e.status === 'READY', 'submitted goal reaches READY after interpretation, decomposition, and planning');
    const completed = await globalExecutiveRuntime.runGoalUntilCompletion(e2e.goalId);
    check(completed.status === 'COMPLETED', 'goal completes only after governed task execution and verification');
    check(completed.progress.percentComplete === 100 && completed.progress.isComplete, 'progress is derived from completed task ledger');
    check(globalExecutiveAudit.verifyChain().intact, 'executive audit chain is tamper-evident');
    check(globalExecutiveRuntime.getHealth().totalTasksExecuted >= 2, 'runtime health derives execution count from real dispatched tasks');
    check(!globalExecutiveProgress.validateClaimedProgress(completed, 90), 'fabricated progress claim is rejected against task ledger');

    // Human control plane has precedence over scheduler and queued work.
    const paused = await globalExecutiveRuntime.submitGoal({ sessionId: 'session-pause', objective: 'Check pause behavior' });
    globalExecutiveRuntime.pauseGoal(paused.goalId);
    check(paused.status === 'PAUSED', 'pause checkpoints execution state before scheduling more work');
    globalExecutiveRuntime.resumeGoal(paused.goalId);
    check(paused.status === 'RUNNING', 'resume re-enters governed runtime state');
    const cancelled = await globalExecutiveRuntime.submitGoal({ sessionId: 'session-cancel', objective: 'Check cancellation behavior' });
    globalExecutiveRuntime.cancelGoal(cancelled.goalId);
    check(cancelled.status === 'CANCELLED', 'cancel prevents future autonomous execution for its goal');
    globalExecutiveRuntime.triggerUserStop('reality gate');
    await assert.rejects(() => globalExecutiveRuntime.submitGoal({ sessionId: 'session-stop', objective: 'must not queue' }));
    checks++;
    check(globalExecutiveRuntime.getHealth().status === 'USER_STOP', 'USER_STOP supersedes executive scheduling');
    globalExecutiveRuntime.resetUserStop();
    check(!globalExecutiveCancellation.isUserStopActive, 'only explicit reset clears USER_STOP');

    // Session isolation prevents cross-session reads.
    rejects(() => goals.getGoal(goal.goalId, 'session-b'), 'goals cannot be read from another session');
    console.log(`EXECUTIVE REALITY GATE COMPLETE: ${checks}`);
  } finally {
    fs.rmSync(sandbox, { recursive: true, force: true });
    globalExecutiveRuntime.clear();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
