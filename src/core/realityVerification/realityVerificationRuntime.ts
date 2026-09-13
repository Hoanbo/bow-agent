// src/core/realityVerification/realityVerificationRuntime.ts
// BOWCON V4.0 — MS-1.4.07: REALITY VERIFICATION RUNTIME
//
// EN:
// Master execution coordinator for the Empirical Reality Verification Engine.
// Orchestrates:
//   1. 4-checkpoint synchronous USER_STOP enforcement
//   2. Authoritative task version and tenant partition binding
//   3. Empirical evidence collection and defensive sanitization
//   4. Deterministic postcondition oracle evaluation
//   5. Eventual consistency and contradiction handling
//   6. Tamper-evident cryptographic provenance chaining
//   7. Canonical structured audit logging to globalAuditLedger
//
// VI:
// Bộ điều phối thực thi chính cho Động cơ Xác minh Thực tế Thực nghiệm.
// Điều phối:
//   1. Thực thi USER_STOP đồng bộ tại 4 điểm kiểm tra
//   2. Ràng buộc phiên bản tác vụ có thẩm quyền và phân vùng người thuê
//   3. Thu thập bằng chứng thực nghiệm và khử trùng phòng thủ
//   4. Đánh giá oracle postcondition tất định
//   5. Xử lý tính nhất quán cuối cùng và mâu thuẫn
//   6. Tạo chuỗi nguồn gốc mật mã chống giả mạo
//   7. Ghi nhật ký kiểm toán chuẩn tắc vào globalAuditLedger

import crypto from 'node:crypto';
import type { ToolAdapterResult } from '../toolAdapter/toolAdapterTypes.js';
import type { AgentTask } from '../taskLifecycle/agentTaskTypes.js';
import type { AgentTaskStore } from '../taskLifecycle/agentTaskStore.js';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import {
  type RealityVerificationRequest,
  type RealityVerificationResult,
  type RealityVerificationStatus,
  type RealityVerificationAuditEventType,
  REALITY_VERIFICATION_AUDIT_DOMAIN,
  VerificationValidationError,
  CrossTenantVerificationError,
  StaleTaskVerificationError,
  VerificationSecurityViolationError,
} from './realityVerificationTypes.js';
import { RealityEvidenceCollector, globalRealityEvidenceCollector } from './realityEvidenceCollector.js';
import { PostconditionVerificationOracle, globalPostconditionVerificationOracle } from './postconditionVerificationOracle.js';
import { VerificationExecutionGate, globalVerificationExecutionGate } from './verificationExecutionGate.js';

export interface RealityVerificationRuntimeOptions {
  readonly evidenceCollector?: RealityEvidenceCollector;
  readonly collector?: RealityEvidenceCollector;
  readonly oracle?: PostconditionVerificationOracle;
  readonly executionGate?: VerificationExecutionGate;
  readonly gate?: VerificationExecutionGate;
  readonly sanitizer?: DiagnosisSanitizer;
  readonly auditLedger?: AuditLedger;
  readonly taskStore?: AgentTaskStore;
  readonly deterministicTimestamp?: string;
}

export class RealityVerificationRuntime {
  private readonly evidenceCollector: RealityEvidenceCollector;
  private readonly oracle: PostconditionVerificationOracle;
  private readonly executionGate: VerificationExecutionGate;
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly auditLedger: AuditLedger;
  private readonly taskStore?: AgentTaskStore;
  private readonly deterministicTimestamp?: string;

  constructor(options?: RealityVerificationRuntimeOptions) {
    this.evidenceCollector = options?.evidenceCollector ?? options?.collector ?? globalRealityEvidenceCollector;
    this.oracle = options?.oracle ?? globalPostconditionVerificationOracle;
    this.executionGate = options?.executionGate ?? options?.gate ?? globalVerificationExecutionGate;
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.taskStore = options?.taskStore;
    this.deterministicTimestamp = options?.deterministicTimestamp;
  }

  /**
   * Primary entrypoint: verifies an executed tool result against intended reality invariants.
   */
  public async verifyReality(request: RealityVerificationRequest, currentTime?: string): Promise<RealityVerificationResult> {
    const now = currentTime || this.deterministicTimestamp || new Date().toISOString();
    const { executionResult, postconditions = [], expectedOutcome, expectedTaskVersion } = request;

    // ------------------------------------------------------------------------
    // GATE 1: USER_STOP Check before Request Acceptance
    // ------------------------------------------------------------------------
    try {
      this.executionGate.assertCanAcceptRequest({
        executionId: executionResult?.executionId,
        toolName: executionResult?.toolName,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'REALITY_USER_STOP_ABORTED',
        toolName: executionResult?.toolName || 'unknown',
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { gate: 'GATE_1_BEFORE_REQUEST_ACCEPTANCE', reason: err.message },
      });
      throw err;
    }

    // 1. Structural validation of execution result
    if (!executionResult || typeof executionResult !== 'object') {
      throw new VerificationValidationError('MALFORMED_REQUEST: executionResult must be a non-null object.');
    }

    if (!executionResult.executionId || !executionResult.taskId || !executionResult.tenantId) {
      throw new VerificationValidationError(
        'INVALID_EXECUTION_RESULT: executionResult must contain executionId, taskId, and tenantId.'
      );
    }

    if (
      !executionResult.executionProvenanceHash ||
      typeof executionResult.executionProvenanceHash !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(executionResult.executionProvenanceHash)
    ) {
      throw new VerificationValidationError(
        'MALFORMED_PROVENANCE_HASH: executionProvenanceHash must be a valid 64-character hex SHA-256 string.'
      );
    }

    if (typeof expectedTaskVersion !== 'number' || expectedTaskVersion < 0 || !Number.isInteger(expectedTaskVersion)) {
      throw new VerificationValidationError(
        `INVALID_TASK_VERSION: expectedTaskVersion must be a non-negative integer (received: ${expectedTaskVersion}).`
      );
    }

    this.recordAudit({
      eventType: 'REALITY_VERIFICATION_REQUESTED',
      toolName: executionResult.toolName,
      status: 'BLOCKED',
      policyDecision: 'PERMIT',
      details: {
        executionId: executionResult.executionId,
        taskId: executionResult.taskId,
        tenantId: executionResult.tenantId,
        executionStatus: executionResult.status,
      },
    });

    // 2. Resolve authoritative task state
    let authoritativeTask = request.authoritativeTask;
    if (!authoritativeTask && this.taskStore && executionResult.tenantId && executionResult.taskId) {
      const stored = await this.taskStore.getTask(executionResult.tenantId, executionResult.taskId);
      if (stored) {
        authoritativeTask = stored;
      }
    }

    // 3. Tenant isolation verification
    if (authoritativeTask) {
      if (executionResult.tenantId !== authoritativeTask.tenantId) {
        this.recordAudit({
          eventType: 'REALITY_TENANT_VIOLATION',
          toolName: executionResult.toolName,
          status: 'BLOCKED',
          policyDecision: 'DENY',
          details: {
            executionTenant: executionResult.tenantId,
            taskTenant: authoritativeTask.tenantId,
          },
        });
        throw new CrossTenantVerificationError(
          `CROSS_TENANT_VERIFICATION: Result tenantId "${executionResult.tenantId}" does not match authoritative task tenantId "${authoritativeTask.tenantId}".`
        );
      }

      if (executionResult.taskId !== authoritativeTask.taskId) {
        throw new VerificationValidationError(
          `TASK_ID_MISMATCH: Result taskId "${executionResult.taskId}" does not match authoritative taskId "${authoritativeTask.taskId}".`
        );
      }

      // 4. Stale task version check
      if (authoritativeTask.version !== expectedTaskVersion) {
        this.recordAudit({
          eventType: 'REALITY_VERIFICATION_STALE',
          toolName: executionResult.toolName,
          status: 'BLOCKED',
          policyDecision: 'DENY',
          details: {
            expectedVersion: expectedTaskVersion,
            currentVersion: authoritativeTask.version,
          },
        });

        return this.createVerificationResult({
          request,
          status: 'STALE',
          confidence: 0.95,
          postconditionResults: [],
          evidence: [],
          summary: {
            totalInvariants: postconditions.length,
            passedCount: 0,
            failedCount: postconditions.length,
            unknownCount: 0,
            conflictingCount: 0,
            allRequiredPassed: false,
          },
          failure: {
            category: 'STALE_TASK_VERSION',
            message: `Task version changed from ${expectedTaskVersion} to ${authoritativeTask.version} before verification.`,
          },
          recommendation: 'ABORT',
          verifiedAt: now,
        });
      }
    }

    // 5. Adapter Timeout handling
    if (executionResult.status === 'TIMED_OUT') {
      this.recordAudit({
        eventType: 'REALITY_VERIFICATION_UNKNOWN',
        toolName: executionResult.toolName,
        status: 'FAILURE',
        policyDecision: 'PERMIT',
        details: { reason: 'Tool execution timed out at adapter plane; reality state unknown.' },
      });

      return this.createVerificationResult({
        request,
        status: 'UNKNOWN',
        confidence: 0.2,
        postconditionResults: [],
        evidence: [],
        summary: {
          totalInvariants: postconditions.length,
          passedCount: 0,
          failedCount: 0,
          unknownCount: postconditions.length,
          conflictingCount: 0,
          allRequiredPassed: false,
        },
        failure: {
          category: 'TIMEOUT_UNKNOWN',
          message: 'Tool adapter timed out; external real-world state is unknown.',
        },
        recommendation: 'MANUAL_INSPECTION',
        verifiedAt: now,
      });
    }

    // ------------------------------------------------------------------------
    // GATE 2: USER_STOP Check before Evidence Collection
    // ------------------------------------------------------------------------
    try {
      this.executionGate.assertCanCollectEvidence({
        executionId: executionResult.executionId,
        toolName: executionResult.toolName,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'REALITY_USER_STOP_ABORTED',
        toolName: executionResult.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { gate: 'GATE_2_BEFORE_EVIDENCE_COLLECTION', reason: err.message },
      });
      throw err;
    }

    // 6. Collect and sanitize evidence
    let evidenceList: readonly import('./realityVerificationTypes.js').RealityEvidence[];
    try {
      evidenceList = this.evidenceCollector.collectEvidence(
        executionResult,
        request.externalEvidence,
        Date.parse(now)
      );
    } catch (err: any) {
      const eventType: RealityVerificationAuditEventType =
        err.code === 'CROSS_TENANT_VERIFICATION_ERROR'
          ? 'REALITY_TENANT_VIOLATION'
          : err.code === 'CONTRADICTORY_EVIDENCE_ERROR'
          ? 'REALITY_VERIFICATION_CONTRADICTORY'
          : 'REALITY_SECURITY_VIOLATION';

      this.recordAudit({
        eventType,
        toolName: executionResult.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { error: err.message, code: err.code },
      });

      if (err.code === 'CONTRADICTORY_EVIDENCE_ERROR') {
        return this.createVerificationResult({
          request,
          status: 'CONTRADICTORY',
          confidence: 0.5,
          postconditionResults: [],
          evidence: [],
          summary: {
            totalInvariants: postconditions.length,
            passedCount: 0,
            failedCount: 0,
            unknownCount: 0,
            conflictingCount: 1,
            allRequiredPassed: false,
          },
          failure: {
            category: 'CONTRADICTORY_EVIDENCE',
            message: err.message,
          },
          recommendation: 'MANUAL_INSPECTION',
          verifiedAt: now,
        });
      }

      throw err;
    }

    this.recordAudit({
      eventType: 'REALITY_EVIDENCE_COLLECTED',
      toolName: executionResult.toolName,
      status: 'BLOCKED',
      policyDecision: 'PERMIT',
      details: {
        evidenceCount: evidenceList.length,
        sources: Array.from(new Set(evidenceList.map(e => e.source))),
      },
    });

    // ------------------------------------------------------------------------
    // GATE 3: USER_STOP Check before Oracle Evaluation
    // ------------------------------------------------------------------------
    try {
      this.executionGate.assertCanEvaluateOracle({
        executionId: executionResult.executionId,
        toolName: executionResult.toolName,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'REALITY_USER_STOP_ABORTED',
        toolName: executionResult.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { gate: 'GATE_3_BEFORE_ORACLE_EVALUATION', reason: err.message },
      });
      throw err;
    }

    // 7. Evaluate postcondition invariants via oracle
    const oracleOutcome = this.oracle.evaluateInvariants({
      postconditions,
      expectedOutcome,
      evidence: evidenceList,
      executionSucceeded: executionResult.status === 'SUCCESS',
    });

    // ------------------------------------------------------------------------
    // GATE 4: USER_STOP Check before Result Emission
    // ------------------------------------------------------------------------
    try {
      this.executionGate.assertCanEmitResult({
        executionId: executionResult.executionId,
        toolName: executionResult.toolName,
      });
    } catch (err: any) {
      this.recordAudit({
        eventType: 'REALITY_USER_STOP_ABORTED',
        toolName: executionResult.toolName,
        status: 'BLOCKED',
        policyDecision: 'DENY',
        details: { gate: 'GATE_4_BEFORE_RESULT_EMISSION', reason: err.message },
      });
      throw err;
    }

    let finalStatus = oracleOutcome.status;
    let finalRecommendation = oracleOutcome.recommendation;

    // Eventual consistency: if adapter succeeded but read-back observations are pending
    if (
      oracleOutcome.status === 'UNKNOWN' &&
      executionResult.status === 'SUCCESS' &&
      request.allowPendingVerification
    ) {
      finalStatus = 'PENDING_VERIFICATION';
      finalRecommendation = 'NONE';
    }

    const finalResult = this.createVerificationResult({
      request,
      status: finalStatus,
      confidence: oracleOutcome.confidence,
      postconditionResults: oracleOutcome.postconditionResults,
      evidence: evidenceList,
      summary: oracleOutcome.summary,
      failure: oracleOutcome.failure,
      recommendation: finalRecommendation,
      verifiedAt: now,
    });

    // 8. Record final audit event
    const auditEventType: RealityVerificationAuditEventType =
      finalResult.status === 'VERIFIED'
        ? 'REALITY_VERIFICATION_PASSED'
        : finalResult.status === 'NOT_VERIFIED'
        ? 'REALITY_VERIFICATION_FAILED'
        : finalResult.status === 'CONTRADICTORY'
        ? 'REALITY_VERIFICATION_CONTRADICTORY'
        : 'REALITY_VERIFICATION_UNKNOWN';

    this.recordAudit({
      eventType: auditEventType,
      toolName: executionResult.toolName,
      status: finalResult.status === 'VERIFIED' ? 'SUCCESS' : 'FAILURE',
      policyDecision: 'PERMIT',
      details: {
        verificationId: finalResult.verificationId,
        status: finalResult.status,
        confidence: finalResult.confidence,
        verificationProvenanceHash: finalResult.verificationProvenanceHash,
      },
    });

    return finalResult;
  }

  /**
   * Factory constructing an immutable RealityVerificationResult with cryptographic provenance.
   */
  private createVerificationResult(params: {
    request: RealityVerificationRequest;
    status: RealityVerificationStatus;
    confidence: number;
    postconditionResults: readonly import('../verification/postconditionTypes.js').PostconditionResult[];
    evidence: readonly import('./realityVerificationTypes.js').RealityEvidence[];
    summary: import('./realityVerificationTypes.js').RealityVerificationSummary;
    failure?: import('./realityVerificationTypes.js').RealityVerificationFailure;
    recommendation: import('./realityVerificationTypes.js').VerificationRecommendation;
    verifiedAt: string;
  }): RealityVerificationResult {
    const { request, status, confidence, postconditionResults, evidence, summary, failure, recommendation, verifiedAt } = params;
    const { executionResult } = request;

    const verificationId = `verif_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    const verificationProvenanceHash = this.calculateVerificationProvenanceHash({
      executionProvenanceHash: executionResult.executionProvenanceHash,
      taskId: executionResult.taskId,
      stepId: executionResult.stepId,
      status,
      summary,
      verifiedAt,
    });

    return Object.freeze({
      verificationId,
      taskId: executionResult.taskId,
      tenantId: executionResult.tenantId,
      stepId: executionResult.stepId,
      executionId: executionResult.executionId,
      toolName: executionResult.toolName,
      status,
      confidence,
      postconditionResults,
      evidence,
      summary,
      failure,
      recommendation,
      executionProvenanceHash: executionResult.executionProvenanceHash,
      verificationProvenanceHash,
      verifiedAt,
    });
  }

  /**
   * Computes deterministic SHA-256 cryptographic provenance hash for verification.
   */
  public calculateVerificationProvenanceHash(params: {
    executionProvenanceHash: string;
    taskId: string;
    stepId: string;
    status: RealityVerificationStatus;
    summary: unknown;
    verifiedAt: string;
  }): string {
    const raw = [
      params.executionProvenanceHash,
      params.taskId,
      params.stepId,
      params.status,
      JSON.stringify(params.summary ?? ''),
      params.verifiedAt,
    ].join('|');

    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Appends structured audit record to globalAuditLedger.
   */
  private recordAudit(params: {
    eventType: RealityVerificationAuditEventType;
    toolName: string;
    status: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
    policyDecision: 'PERMIT' | 'DENY';
    details: Record<string, unknown>;
  }): void {
    try {
      const timestamp = this.deterministicTimestamp || new Date().toISOString();
      const sanitizedDetails = this.sanitizer.sanitize(params.details) as Record<string, unknown>;

      this.auditLedger.record({
        timestamp,
        actor: {
          userId: (sanitizedDetails.userId as string) || 'reality_verification_runtime',
          role: 'agent',
          channel: 'governance',
        },
        domain: REALITY_VERIFICATION_AUDIT_DOMAIN,
        toolName: params.toolName,
        classification: params.eventType,
        argumentsHash: crypto
          .createHash('sha256')
          .update(JSON.stringify(sanitizedDetails))
          .digest('hex'),
        policyDecision: params.policyDecision,
        executionStatus: params.status,
      });
    } catch {
      // Audit ledger failure must not silently compromise security fail-closed semantics
    }
  }
}

export const globalRealityVerificationRuntime = new RealityVerificationRuntime();
