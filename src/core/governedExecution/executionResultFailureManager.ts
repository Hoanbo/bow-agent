// src/core/governedExecution/executionResultFailureManager.ts
// BOWCON V4.0 — MS-1.5.09: EXECUTION RESULT & FAILURE MANAGER
// Component 1064 — REAL
//
// EN: Normalizes and cryptographically seals execution results and failures.
//     Enforces secret/PII sanitization via DiagnosisSanitizer, computes deterministic provenance hashes,
//     and eliminates raw stack traces from failure outputs.
// VI: Chuẩn hóa và niêm phong mật mã các kết quả và thất bại thực thi.
//     Thực thi khử trùng bí mật/PII qua DiagnosisSanitizer, tính toán provenance hash xác định,
//     và loại bỏ dấu vết stack thô khỏi đầu ra thất bại.

import {
  type GovernedExecutionResultEnvelope,
  type GovernedExecutionState,
  type GovernedExecutionOutcome,
  type ExecutionFailure,
  type ExecutionTelemetry,
  type ExecutionRequest,
  computeExecutionResultProvenanceHash,
} from './executionTypes.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { ExecutionRequestValidator } from './executionRequestValidator.js';

export class ExecutionResultFailureManager {
  /**
   * EN: Creates a sanitized, cryptographically sealed successful execution result envelope.
   * VI: Tạo một phong bì kết quả thực thi thành công đã được khử trùng và niêm phong mật mã.
   */
  public static createSuccessEnvelope(params: {
    readonly executionId: string;
    readonly request: ExecutionRequest;
    readonly output: Readonly<Record<string, unknown>>;
    readonly telemetry: ExecutionTelemetry;
    readonly sessionVersion: number;
  }): GovernedExecutionResultEnvelope {
    const { executionId, request, output, telemetry, sessionVersion } = params;

    // 1. Sanitize Output Secrets & PII
    const sanitizedOutput = globalDiagnosisSanitizer.sanitize(output) as Readonly<Record<string, unknown>>;

    // 2. Validate against Prototype Pollution and CoT
    ExecutionRequestValidator.assertNoPrototypePollution(sanitizedOutput);
    ExecutionRequestValidator.assertNoCoTArtifacts(sanitizedOutput);

    const now = new Date().toISOString();

    const rawEnvelope = {
      executionId,
      requestId: request.requestId,
      tenantId: request.tenantId,
      sessionId: request.sessionId,
      taskId: request.taskId,
      stepId: request.stepId,
      stepIndex: request.stepIndex,
      state: 'SUCCEEDED' as GovernedExecutionState,
      outcome: 'SUCCESS' as GovernedExecutionOutcome,
      success: true,
      output: sanitizedOutput,
      telemetry,
      leaseId: request.lease.leaseId,
      completedAt: now,
      sessionVersion,
    };

    const provenanceHash = computeExecutionResultProvenanceHash(rawEnvelope);

    return Object.freeze({
      ...rawEnvelope,
      provenanceHash,
    });
  }

  /**
   * EN: Creates a sanitized, cryptographically sealed failure execution result envelope.
   * VI: Tạo một phong bì kết quả thực thi thất bại đã được khử trùng và niêm phong mật mã.
   */
  public static createFailureEnvelope(params: {
    readonly executionId: string;
    readonly request: ExecutionRequest;
    readonly state: GovernedExecutionState;
    readonly outcome: GovernedExecutionOutcome;
    readonly error: Error | unknown;
    readonly category: ExecutionFailure['category'];
    readonly telemetry: ExecutionTelemetry;
    readonly sessionVersion: number;
  }): GovernedExecutionResultEnvelope {
    const { executionId, request, state, outcome, error, category, telemetry, sessionVersion } = params;

    const rawErrorMessage = error instanceof Error ? error.message : String(error);
    const sanitizedErrorMessage = globalDiagnosisSanitizer.sanitize(rawErrorMessage);

    const failure: ExecutionFailure = Object.freeze({
      code: outcome,
      message: sanitizedErrorMessage,
      category,
      recoverable: category === 'TIMEOUT' || category === 'ADAPTER',
      failedAt: new Date().toISOString(),
    });

    const now = new Date().toISOString();

    const rawEnvelope = {
      executionId,
      requestId: request.requestId,
      tenantId: request.tenantId,
      sessionId: request.sessionId,
      taskId: request.taskId,
      stepId: request.stepId,
      stepIndex: request.stepIndex,
      state,
      outcome,
      success: false,
      failure,
      telemetry,
      leaseId: request.lease.leaseId,
      completedAt: now,
      sessionVersion,
    };

    const provenanceHash = computeExecutionResultProvenanceHash(rawEnvelope);

    return Object.freeze({
      ...rawEnvelope,
      provenanceHash,
    });
  }
}
