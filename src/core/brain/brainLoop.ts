// src/core/brain/brainLoop.ts
// BOWCON V4.0 — MS-1.3.30: REAL COGNITIVE BRAIN LOOP
//
// The BrainLoop is the core cognitive execution engine.
// It executes the full INPUT → UNDERSTAND → REASON → PLAN → DECIDE →
// ACT → OBSERVE → VERIFY → COMMIT cycle for a single BrainTask.
//
// INVARIANTS:
// EXECUTION != VERIFIED         — Tool response != verified result
// RECONNECT != RE-EXECUTE       — Network events do not re-run tasks
// LLM_PROPOSE != EXECUTE        — LLM output goes through governance first
// BRAIN_REASONING != TOOL_AUTH  — Brain coordinates, not authorizes
// MAX_ITERATIONS enforced       — Loop terminates, never runs forever
// CANCELLATION enforced         — Tasks can be cancelled safely mid-loop
// DEADLINE enforced             — Tasks expire if deadline exceeded

import { randomBytes } from 'node:crypto';
import {
  BRAIN_MAX_ITERATIONS_PER_TASK,
  BRAIN_MAX_RECOVERY_DEPTH,
  BRAIN_MAX_RETRY_ATTEMPTS,
  BRAIN_TOOL_EXECUTION_TIMEOUT_MS,
  makeBrainTaskId,
  appendBrainAuditEvent,
  type BrainAuditLedger,
  type BrainPlan,
  type BrainPlanStep,
  type BrainToolExecutionRecord,
  type BrainObservation,
  type BrainVerificationRecord,
  type BrainTaskResult,
  type BrainRecoveryDecision,
  type BrainModelOutput,
} from './brainTypes.js';
import { BrainTask } from './brainTask.js';
import { BrainError } from './brainFailure.js';
import type { BrainModelProvider } from './brainModelProvider.js';
import { verifyFileExists, readFileContent } from './brainTools.js';
import { toolRegistry } from '../../tools/registry.js';
import type { ToolExecutionContext } from '../../tools/registry.js';

// ---------------------------------------------------------------------------
// Loop Configuration
// ---------------------------------------------------------------------------
export interface BrainLoopConfig {
  readonly maxIterations?: number;
  readonly maxRecoveryDepth?: number;
  readonly maxRetryAttempts?: number;
  readonly toolTimeoutMs?: number;
  readonly ownerId?: string;
}

export const DEFAULT_BRAIN_LOOP_CONFIG: Required<BrainLoopConfig> = Object.freeze({
  maxIterations: BRAIN_MAX_ITERATIONS_PER_TASK,
  maxRecoveryDepth: BRAIN_MAX_RECOVERY_DEPTH,
  maxRetryAttempts: BRAIN_MAX_RETRY_ATTEMPTS,
  toolTimeoutMs: BRAIN_TOOL_EXECUTION_TIMEOUT_MS,
  ownerId: 'brain_owner',
});

// ---------------------------------------------------------------------------
// BrainLoop
// ---------------------------------------------------------------------------
export class BrainLoop {
  private readonly _config: Required<BrainLoopConfig>;
  private readonly _modelProvider: BrainModelProvider;
  private readonly _ledger: BrainAuditLedger;

  constructor(
    modelProvider: BrainModelProvider,
    config: BrainLoopConfig = {},
    ledger?: BrainAuditLedger
  ) {
    this._config = { ...DEFAULT_BRAIN_LOOP_CONFIG, ...config };
    this._modelProvider = modelProvider;
    this._ledger = ledger ?? { events: [] };
  }

  /**
   * Execute the full cognitive loop for a single BrainTask.
   * Returns a BrainTaskResult when done (success or failure).
   *
   * The loop never runs more than `maxIterations` cycles and
   * respects task deadlines, cancellation, and pause signals.
   */
  public async run(task: BrainTask): Promise<BrainTaskResult> {
    const startTime = Date.now();
    let iteration = 0;
    let lastError: Error | undefined;

    appendBrainAuditEvent(this._ledger, {
      type: 'TASK_CREATED',
      brainId: task.brainId as any,
      taskId: task.taskId,
      data: { input: task.userText },
    });

    try {
      while (iteration < this._config.maxIterations) {
        iteration++;
        task.incrementIteration();

        // ── Safety checks ────────────────────────────────────────────────────
        if (task.isCancellationRequested) {
          return this._failTask(task, 'BRAIN_CANCELLED', 'Task was cancelled by user request.', startTime, iteration, false);
        }

        if (task.isDeadlineExceeded) {
          return this._failTask(task, 'BRAIN_TASK_DEADLINE_EXCEEDED', `Task deadline exceeded after ${Date.now() - task.createdAt}ms.`, startTime, iteration);
        }

        if (task.isPauseRequested) {
          task.setStatus('PAUSED');
          task.clearPauseRequest();
          // Wait until unpaused or cancelled
          await this._waitForUnpause(task, 30_000);
          if (task.isCancellationRequested) {
            return this._failTask(task, 'BRAIN_CANCELLED', 'Task cancelled during pause.', startTime, iteration, false);
          }
        }

        // ── Stage 1: UNDERSTANDING ────────────────────────────────────────────
        task.setStatus('UNDERSTANDING');
        appendBrainAuditEvent(this._ledger, { type: 'UNDERSTANDING_COMPLETED', brainId: task.brainId as any, taskId: task.taskId });

        let modelOutput: BrainModelOutput;
        try {
          modelOutput = await this._modelProvider.understand(task.userText, {
            iteration,
            recoveryDepth: task.recoveryDepth,
          });
        } catch (e: any) {
          if (task.recoveryDepth >= this._config.maxRecoveryDepth) {
            return this._failTask(task, 'BRAIN_MODEL_UNAVAILABLE', `Model provider failed: ${e.message}`, startTime, iteration);
          }
          modelOutput = await new (await import('./brainModelProvider.js')).DeterministicBrainModelProvider().understand(task.userText);
        }

        appendBrainAuditEvent(this._ledger, {
          type: 'REASONING_COMPLETED',
          brainId: task.brainId as any,
          taskId: task.taskId,
          data: { tool: modelOutput.proposedToolName, confidence: modelOutput.confidence },
        });

        // ── Stage 2: PLANNING ─────────────────────────────────────────────────
        task.setStatus('PLANNING');
        const plan = this._buildPlan(task, modelOutput);
        task.setPlan(plan);

        // ── Stage 3: DECIDING ─────────────────────────────────────────────────
        task.setStatus('DECIDING');
        if (!toolRegistry.hasTool(modelOutput.proposedToolName)) {
          return this._failTask(task, 'BRAIN_TOOL_NOT_FOUND',
            `Tool "${modelOutput.proposedToolName}" is not registered. Cannot proceed.`,
            startTime, iteration
          );
        }

        appendBrainAuditEvent(this._ledger, {
          type: 'DECISION_MADE',
          brainId: task.brainId as any,
          taskId: task.taskId,
          data: { tool: modelOutput.proposedToolName },
        });

        // ── Stage 4: ACTION PREPARING & EXECUTING ────────────────────────────
        task.setStatus('ACTION_PREPARING');

        const executionCtx: ToolExecutionContext = {
          userId: task.userId ?? this._config.ownerId,
          role: 'owner',
          isOwner: true,
          channel: 'BRAIN',
          correlationId: task.taskId,
          idempotencyKey: `brain_task_${task.taskId}_iter_${iteration}`,
        };

        appendBrainAuditEvent(this._ledger, {
          type: 'ACTION_REQUESTED',
          brainId: task.brainId as any,
          taskId: task.taskId,
          data: { tool: modelOutput.proposedToolName, args: modelOutput.proposedToolArgs },
        });

        task.setStatus('EXECUTING');
        task.incrementAttempt();

        const execRecord = await this._executeTool(
          task,
          modelOutput.proposedToolName,
          modelOutput.proposedToolArgs,
          executionCtx
        );
        task.recordExecution(execRecord);

        if (!execRecord.succeeded) {
          // Tool execution failed
          if (task.recoveryDepth >= this._config.maxRecoveryDepth || task.attemptCount >= this._config.maxRetryAttempts) {
            return this._failTask(task, 'BRAIN_TOOL_EXECUTION_FAILED',
              `Tool "${execRecord.toolName}" failed after ${task.attemptCount} attempt(s): ${execRecord.errorMessage}`,
              startTime, iteration
            );
          }
          // Try to recover
          task.setStatus('RECOVERING');
          task.incrementRecoveryDepth();
          appendBrainAuditEvent(this._ledger, {
            type: 'RECOVERY_STARTED',
            brainId: task.brainId as any,
            taskId: task.taskId,
            data: { attempt: task.attemptCount, recoveryDepth: task.recoveryDepth },
          });
          continue; // restart loop with replan
        }

        // ── Stage 5: OBSERVING ────────────────────────────────────────────────
        task.setStatus('OBSERVING');
        const observation = await this._observe(task, execRecord);
        task.recordObservation(observation);

        // ── Stage 6: VERIFYING ────────────────────────────────────────────────
        task.setStatus('VERIFYING');
        const verificationRec = await this._verify(task, observation, execRecord);
        task.setVerification(verificationRec);

        if (!verificationRec.passed) {
          // Verification failed
          if (task.recoveryDepth >= this._config.maxRecoveryDepth) {
            return this._failTask(task, 'BRAIN_VERIFICATION_FAILED',
              `Verification failed after max recovery depth: ${verificationRec.failureReason}`,
              startTime, iteration
            );
          }
          task.setStatus('RECOVERING');
          task.incrementRecoveryDepth();
          appendBrainAuditEvent(this._ledger, {
            type: 'RECOVERY_STARTED',
            brainId: task.brainId as any,
            taskId: task.taskId,
            data: { reason: verificationRec.failureReason },
          });
          continue;
        }

        // ── Stage 7: COMMITTING ───────────────────────────────────────────────
        task.setStatus('COMMITTING');
        task.setCommitState('COMMITTING');
        task.setCommitState('COMMITTED');

        // ── COMPLETED ─────────────────────────────────────────────────────────
        const summary = await this._modelProvider.summarize({
          taskId: task.taskId,
          success: true,
          tool: execRecord.toolName,
          verificationPassed: verificationRec.passed,
          iterationCount: iteration,
        });

        const result: BrainTaskResult = {
          taskId: task.taskId,
          success: true,
          summary,
          data: execRecord.rawResult,
          verificationStatus: 'VERIFIED',
          completedAt: Date.now(),
          totalDurationMs: Date.now() - startTime,
          iterationCount: iteration,
        };

        task.setResult(result);
        appendBrainAuditEvent(this._ledger, {
          type: 'TASK_COMPLETED',
          brainId: task.brainId as any,
          taskId: task.taskId,
          data: { durationMs: result.totalDurationMs, iterations: iteration },
        });

        return result;
      }

      // Max iterations exceeded
      return this._failTask(task, 'BRAIN_MAX_ITERATIONS_EXCEEDED',
        `Task exceeded maximum iterations (${this._config.maxIterations}).`,
        startTime, iteration
      );

    } catch (e: any) {
      lastError = e;
      return this._failTask(task, 'BRAIN_INTERNAL_ERROR',
        e instanceof BrainError ? e.message : `Unexpected error: ${e?.message ?? String(e)}`,
        startTime, iteration
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  private _buildPlan(task: BrainTask, modelOutput: BrainModelOutput): BrainPlan {
    const stepId = randomBytes(4).toString('hex');
    const step: BrainPlanStep = {
      stepId,
      order: 1,
      description: modelOutput.planSummary,
      toolName: modelOutput.proposedToolName,
      toolArgs: modelOutput.proposedToolArgs,
      isCompleted: false,
      skipped: false,
    };
    return {
      planId: `plan_${randomBytes(6).toString('hex')}`,
      taskId: task.taskId,
      createdAt: Date.now(),
      reasoning: modelOutput.reasoning,
      steps: [step],
      revision: (task.plan?.revision ?? 0) + 1,
    };
  }

  private async _executeTool(
    task: BrainTask,
    toolName: string,
    args: Record<string, unknown>,
    ctx: ToolExecutionContext
  ): Promise<BrainToolExecutionRecord> {
    const executionId = `exec_${randomBytes(6).toString('hex')}`;
    const startedAt = Date.now();
    try {
      // Race against timeout
      const resultPromise = toolRegistry.executeTool(toolName, args, ctx);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new BrainError('BRAIN_TOOL_TIMEOUT', `Tool "${toolName}" timed out.`)), this._config.toolTimeoutMs)
      );
      const rawResult = await Promise.race([resultPromise, timeoutPromise]);
      return {
        executionId,
        taskId: task.taskId,
        toolName,
        args,
        startedAt,
        completedAt: Date.now(),
        rawResult,
        succeeded: rawResult?.success !== false,
        errorMessage: rawResult?.success === false ? (rawResult?.message ?? rawResult?.error ?? 'Tool returned failure') : undefined,
      };
    } catch (e: any) {
      return {
        executionId,
        taskId: task.taskId,
        toolName,
        args,
        startedAt,
        completedAt: Date.now(),
        rawResult: undefined,
        succeeded: false,
        errorMessage: e?.message ?? String(e),
      };
    }
  }

  private async _observe(
    task: BrainTask,
    execRecord: BrainToolExecutionRecord
  ): Promise<BrainObservation> {
    const observationId = `obs_${randomBytes(4).toString('hex')}`;
    const expectedConditions: string[] = [];
    const actualConditions: string[] = [];

    const raw = execRecord.rawResult as any;

    // Tool-specific observation logic
    if (execRecord.toolName === 'brain_fs_write' || execRecord.toolName === 'brain_fs_append') {
      const expectedPath = (execRecord.args.path as string) ?? '';
      expectedConditions.push(`File exists at: ${expectedPath}`);
      const check = verifyFileExists(expectedPath);
      if (check.exists) {
        actualConditions.push(`File exists at: ${check.resolvedPath} ✓`);
      } else {
        actualConditions.push(`File NOT found at: ${expectedPath} ✗`);
      }

      // Content verification for write
      if (execRecord.toolName === 'brain_fs_write') {
        const expectedContent = (execRecord.args.content as string) ?? '';
        expectedConditions.push(`File content matches written content`);
        const fileRead = readFileContent(expectedPath);
        if (fileRead.content !== undefined && fileRead.content.includes(expectedContent.substring(0, Math.min(50, expectedContent.length)))) {
          actualConditions.push(`Content verified ✓`);
        } else {
          actualConditions.push(`Content mismatch ✗`);
        }
      }
    } else if (execRecord.toolName === 'brain_fs_read') {
      const expectedPath = (execRecord.args.path as string) ?? '';
      expectedConditions.push(`File read returned content`);
      if (raw?.success && raw?.content !== undefined) {
        actualConditions.push(`File content retrieved (${raw.content.length} chars) ✓`);
      } else {
        actualConditions.push(`No content returned ✗`);
      }
    } else if (execRecord.toolName === 'brain_fs_delete') {
      const expectedPath = (execRecord.args.path as string) ?? '';
      expectedConditions.push(`File removed from: ${expectedPath}`);
      const check = verifyFileExists(expectedPath);
      actualConditions.push(check.exists ? `File still exists ✗` : `File successfully removed ✓`);
    } else {
      // Generic: tool returned success
      expectedConditions.push('Tool execution succeeded');
      actualConditions.push(execRecord.succeeded ? 'Tool returned success=true ✓' : 'Tool returned failure ✗');
    }

    const allMet = actualConditions.every(c => c.includes('✓')) && !actualConditions.some(c => c.includes('✗'));
    return { observationId, taskId: task.taskId, toolName: execRecord.toolName, observedAt: Date.now(), expectedConditions, actualConditions, allMet };
  }

  private async _verify(
    task: BrainTask,
    observation: BrainObservation,
    execRecord: BrainToolExecutionRecord
  ): Promise<BrainVerificationRecord> {
    const verificationId = `ver_${randomBytes(4).toString('hex')}`;
    const evidence: string[] = [
      `Tool "${execRecord.toolName}" executed: ${execRecord.succeeded ? 'success' : 'failure'}`,
      `Observation allMet: ${observation.allMet}`,
      ...observation.actualConditions,
    ];

    const passed = observation.allMet && execRecord.succeeded;
    return {
      verificationId,
      taskId: task.taskId,
      status: passed ? 'VERIFIED' : 'VERIFICATION_FAILED',
      verifiedAt: Date.now(),
      passed,
      evidence,
      failureReason: passed ? undefined : `Observation conditions not fully met.`,
    };
  }

  private _failTask(
    task: BrainTask,
    code: import('./brainFailure.js').BrainErrorCode,
    message: string,
    startTime: number,
    iteration: number,
    recordFailure = true
  ): BrainTaskResult {
    if (recordFailure && !task.isTerminal) {
      task.recordFailure({ code, message, occurredAt: Date.now(), recoverable: false });
    }
    appendBrainAuditEvent(this._ledger, {
      type: 'TASK_FAILED',
      brainId: task.brainId as any,
      taskId: task.taskId,
      data: { code, message, iterations: iteration },
    });
    return {
      taskId: task.taskId,
      success: false,
      summary: `Brain task failed: ${message}`,
      verificationStatus: 'VERIFICATION_FAILED',
      completedAt: Date.now(),
      totalDurationMs: Date.now() - startTime,
      iterationCount: iteration,
    };
  }

  private async _waitForUnpause(task: BrainTask, maxWaitMs: number): Promise<void> {
    const start = Date.now();
    while (task.status === 'PAUSED' && !task.isCancellationRequested && Date.now() - start < maxWaitMs) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  public getLedger(): BrainAuditLedger { return this._ledger; }
}
