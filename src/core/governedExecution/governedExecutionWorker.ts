// src/core/governedExecution/governedExecutionWorker.ts
// BOWCON V4.0 — MS-1.5.09: GOVERNED EXECUTION WORKER
// Component 1062 — REAL
//
// EN: Authoritative execution-plane master worker. Coordinates request validation,
//     authorization verification, lease consumption, synchronous USER_STOP enforcement,
//     adapter dispatch, task state synchronization with AgentTaskRuntime, and atomic persistence.
// VI: Động cơ worker chủ quyền lực mặt phẳng thực thi. Điều phối xác thực yêu cầu,
//     xác minh ủy quyền, tiêu thụ hợp đồng thuê, thực thi USER_STOP đồng bộ,
//     gửi tới adapter, đồng bộ hóa trạng thái nhiệm vụ với AgentTaskRuntime và lưu trữ nguyên tử.

import crypto from 'node:crypto';
import {
  type ExecutionRequest,
  type GovernedExecutionResultEnvelope,
  type ExecutionTelemetry,
  ExecutionUserStopError,
  ExecutionValidationError,
  ExecutionAuthorizationError,
  ExecutionLeaseError,
} from './executionTypes.js';
import { ExecutionRequestValidator } from './executionRequestValidator.js';
import { ExecutionAuthorizationVerifier } from './executionAuthorizationVerifier.js';
import { ExecutionLeaseManager } from './executionLeaseManager.js';
import { ExecutionBoundaryGate } from './executionBoundaryGate.js';
import { ExecutionResultFailureManager } from './executionResultFailureManager.js';
import { ExecutionAuditBridge } from './executionAuditBridge.js';
import { ExecutionPersistenceRecoveryEngine } from './executionPersistenceRecoveryEngine.js';
import { AgentTaskRuntime, globalAgentTaskRuntime } from '../taskLifecycle/agentTaskRuntime.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface GovernedExecutionWorkerOptions {
  readonly leaseManager?: ExecutionLeaseManager;
  readonly boundaryGate?: ExecutionBoundaryGate;
  readonly auditBridge?: ExecutionAuditBridge;
  readonly persistenceEngine?: ExecutionPersistenceRecoveryEngine;
  readonly taskRuntime?: AgentTaskRuntime;
  readonly userStopProvider?: () => boolean;
}

export class GovernedExecutionWorker {
  private readonly leaseManager: ExecutionLeaseManager;
  private readonly boundaryGate: ExecutionBoundaryGate;
  private readonly auditBridge: ExecutionAuditBridge;
  private readonly persistenceEngine: ExecutionPersistenceRecoveryEngine;
  private readonly taskRuntime: AgentTaskRuntime;
  private readonly userStopProvider: () => boolean;

  constructor(options?: GovernedExecutionWorkerOptions) {
    this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    this.leaseManager = options?.leaseManager ?? new ExecutionLeaseManager({ userStopProvider: this.userStopProvider });
    this.boundaryGate = options?.boundaryGate ?? new ExecutionBoundaryGate({ userStopProvider: this.userStopProvider });
    this.auditBridge = options?.auditBridge ?? new ExecutionAuditBridge();
    this.persistenceEngine = options?.persistenceEngine ?? new ExecutionPersistenceRecoveryEngine({ userStopProvider: this.userStopProvider });
    this.taskRuntime = options?.taskRuntime ?? globalAgentTaskRuntime;
  }

  /**
   * EN: Executes an authorized execution request under the governed execution envelope.
   * VI: Thực thi một yêu cầu thực thi đã được ủy quyền dưới phong bì thực thi có quản trị.
   */
  public async executeTaskStep(request: ExecutionRequest): Promise<GovernedExecutionResultEnvelope> {
    const startTime = new Date().toISOString();
    const startMs = Date.now();
    const executionId = `exec_${request.tenantId}_${request.taskId}_${request.stepIndex}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    // 1. Synchronous Checkpoint 1: Initial Entry Gate USER_STOP
    if (this.userStopProvider()) {
      const err = new ExecutionUserStopError('worker_entry');
      return this.handlePreExecutionFailure(request, executionId, startTime, startMs, err, 'USER_STOP');
    }

    // Load session persistence document to get current sessionVersion
    let sessionDoc = this.persistenceEngine.loadSessionDocument(request.tenantId, request.sessionId);

    try {
      // 2. Structural & Integrity Validation
      ExecutionRequestValidator.validateRequest(request);

      // 3. Complete End-to-End Authorization Chain Verification
      ExecutionAuthorizationVerifier.verifyAuthorizationChain({
        tenantId: request.tenantId,
        sessionId: request.sessionId,
        binding: request.bindingSnapshot,
        task: request.taskSnapshot,
        stepIndex: request.stepIndex,
        lease: request.lease,
      });

      // 4. Synchronous Checkpoint 2: Post-Authorization USER_STOP
      if (this.userStopProvider()) {
        throw new ExecutionUserStopError('post_authorization');
      }

      // 5. Consume Execution Lease (Enforces single-use & anti-replay)
      this.leaseManager.consumeLease(request.lease.leaseId, request.lease.version, {
        tenantId: request.tenantId,
        sessionId: request.sessionId,
      });

      // 6. Synchronous Checkpoint 3: Pre-Execution State Sync USER_STOP
      if (this.userStopProvider()) {
        throw new ExecutionUserStopError('pre_task_state_update');
      }

      // 7. Synchronize Task Runtime Step Status -> RUNNING
      try {
        const currentTask = this.taskRuntime.getTask(request.tenantId, request.taskId);
        this.taskRuntime.updateStep(request.tenantId, request.taskId, {
          stepIndex: request.stepIndex,
          status: 'RUNNING',
          expectedVersion: currentTask.version,
          executionTokenId: request.lease.leaseId,
        });
      } catch (runtimeErr) {
        // If task state transition fails, do not execute
        throw new ExecutionValidationError(`Failed to update task step to RUNNING: ${runtimeErr}`);
      }

      // 8. Audit Event: EXECUTION_STARTED
      this.auditBridge.recordTransition({
        tenantId: request.tenantId,
        eventType: 'EXECUTION_STARTED',
        state: 'EXECUTING',
        request,
      });

      // 9. Synchronous Checkpoint 4: Immediate Dispatch USER_STOP
      if (this.userStopProvider()) {
        throw new ExecutionUserStopError('immediate_dispatch');
      }

      // 10. Execute Through Boundary Gate
      const output = await this.boundaryGate.executeThroughBoundary(request, executionId);

      // 11. Synchronous Checkpoint 5: Post-Execution Return USER_STOP
      if (this.userStopProvider()) {
        throw new ExecutionUserStopError('post_execution_return');
      }

      // 12. Synchronize Task Runtime Step Status -> COMPLETED
      try {
        const currentTask = this.taskRuntime.getTask(request.tenantId, request.taskId);
        this.taskRuntime.updateStep(request.tenantId, request.taskId, {
          stepIndex: request.stepIndex,
          status: 'COMPLETED',
          expectedVersion: currentTask.version,
          executionResult: output,
          executionTokenId: request.lease.leaseId,
        });
      } catch (runtimeErr) {
        throw new ExecutionValidationError(`Failed to update task step to COMPLETED: ${runtimeErr}`);
      }

      const endMs = Date.now();
      const telemetry: ExecutionTelemetry = {
        startTime,
        endTime: new Date().toISOString(),
        durationMs: endMs - startMs,
        retryCount: 0,
      };

      // 13. Create Sealed Success Envelope
      const successEnvelope = ExecutionResultFailureManager.createSuccessEnvelope({
        executionId,
        request,
        output,
        telemetry,
        sessionVersion: sessionDoc.sessionVersion,
      });

      // 14. Synchronous Checkpoint 6: Pre-Persistence USER_STOP
      if (this.userStopProvider()) {
        throw new ExecutionUserStopError('pre_persistence');
      }

      // 15. Atomically Persist Result in Session Document
      const updatedResults = [...sessionDoc.executionResults, successEnvelope];
      const updatedDoc = {
        ...sessionDoc,
        executionResults: updatedResults,
      };
      this.persistenceEngine.saveSessionDocument(updatedDoc, sessionDoc.sessionVersion);

      // 16. Audit Event: EXECUTION_SUCCEEDED
      this.auditBridge.recordTransition({
        tenantId: request.tenantId,
        eventType: 'EXECUTION_SUCCEEDED',
        state: 'SUCCEEDED',
        request,
        result: successEnvelope,
      });

      return successEnvelope;
    } catch (err: any) {
      return this.handleExecutionError(request, executionId, startTime, startMs, err, sessionDoc);
    }
  }

  private handlePreExecutionFailure(
    request: ExecutionRequest,
    executionId: string,
    startTime: string,
    startMs: number,
    err: Error,
    category: 'USER_STOP' | 'SECURITY'
  ): GovernedExecutionResultEnvelope {
    const endMs = Date.now();
    const telemetry: ExecutionTelemetry = {
      startTime,
      endTime: new Date().toISOString(),
      durationMs: endMs - startMs,
      retryCount: 0,
    };

    const isUserStop = err instanceof ExecutionUserStopError;
    const outcome = isUserStop ? 'USER_STOP_PREEMPTED' : 'AUTHORIZATION_DENIED';
    const state = isUserStop ? 'PREEMPTED' : 'DENIED';

    const failureEnvelope = ExecutionResultFailureManager.createFailureEnvelope({
      executionId,
      request,
      state,
      outcome,
      error: err,
      category,
      telemetry,
      sessionVersion: 1,
    });

    this.auditBridge.recordTransition({
      tenantId: request.tenantId,
      eventType: `EXECUTION_${state}`,
      state,
      request,
      result: failureEnvelope,
    });

    return failureEnvelope;
  }

  private handleExecutionError(
    request: ExecutionRequest,
    executionId: string,
    startTime: string,
    startMs: number,
    err: Error | unknown,
    sessionDoc: any
  ): GovernedExecutionResultEnvelope {
    const endMs = Date.now();
    const telemetry: ExecutionTelemetry = {
      startTime,
      endTime: new Date().toISOString(),
      durationMs: endMs - startMs,
      retryCount: 0,
    };

    let category: any = 'SYSTEM';
    let state: any = 'FAILED';
    let outcome: any = 'FAILURE';

    if (err instanceof ExecutionUserStopError) {
      category = 'USER_STOP';
      state = 'PREEMPTED';
      outcome = 'USER_STOP_PREEMPTED';
    } else if (err instanceof ExecutionAuthorizationError) {
      category = 'SECURITY';
      state = 'DENIED';
      outcome = 'AUTHORIZATION_DENIED';
    } else if (err instanceof ExecutionLeaseError) {
      category = 'POLICY';
      state = 'EXPIRED';
      outcome = 'LEASE_EXPIRED';
    } else if (err instanceof ExecutionValidationError) {
      category = 'SECURITY';
      state = 'DENIED';
      outcome = 'VALIDATION_FAILED';
    }

    // Update Task Step to FAILED in AgentTaskRuntime if possible
    try {
      const currentTask = this.taskRuntime.getTask(request.tenantId, request.taskId);
      this.taskRuntime.updateStep(request.tenantId, request.taskId, {
        stepIndex: request.stepIndex,
        status: 'FAILED',
        expectedVersion: currentTask.version,
        error: err instanceof Error ? err.message : String(err),
      });
    } catch {
      // Ignore task runtime sync error on failure handling
    }

    const failureEnvelope = ExecutionResultFailureManager.createFailureEnvelope({
      executionId,
      request,
      state,
      outcome,
      error: err,
      category,
      telemetry,
      sessionVersion: sessionDoc?.sessionVersion ?? 1,
    });

    // Try to record in audit ledger
    this.auditBridge.recordTransition({
      tenantId: request.tenantId,
      eventType: `EXECUTION_${state}`,
      state,
      request,
      result: failureEnvelope,
    });

    return failureEnvelope;
  }
}
