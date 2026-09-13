// src/core/policyPostExecution/policyPostExecutionRuntime.ts
// BOWCON V4.0 — MS-1.3.66: GOVERNED POST-EXECUTION RECONCILIATION,
// IMPACT ANALYSIS & POLICY FEEDBACK PROPOSAL LAYER
//
// Master Policy Post-Execution Governance Coordinator.
// Coordinates execution reconciliation, expected-vs-actual impact analysis,
// regression detection, effectiveness assessment, feedback proposal synthesis,
// cryptographic provenance, and audit trails.
//
// Điều phối viên quản trị sau thực thi chính sách chính.
// Điều phối điều hòa thực thi, phân tích tác động dự kiến so với thực tế,
// phát hiện hồi quy, đánh giá hiệu quả, tổng hợp đề xuất phản hồi,
// nguồn gốc mật mã và nhật ký kiểm toán.
//
// Authority Invariants:
// - ZERO_AUTONOMOUS_POLICY_MUTATION: Synthesizes proposals only; NEVER modifies active/candidate policies
// - ABSOLUTE_USER_STOP_SUPREMACY: Immediate fail-closed suspension on active USER_STOP
// - STRICT_TENANT_ISOLATION: Strict partition sandboxing across all evaluations

import path from 'node:path';
import type {
  ExecutionReceipt,
  ExecutionVerificationResult,
} from '../policyExecution/policyExecutionTypes.js';
import type {
  PostExecutionReconciliationResult,
  PostExecutionImpactAnalysis,
  PostExecutionRegressionFinding,
  PostExecutionEffectivenessResult,
  PolicyFeedbackProposal,
  PolicyPostExecutionOptions,
} from './policyPostExecutionTypes.js';
import {
  PolicyPostExecutionReconciliationEngine,
  globalPolicyPostExecutionReconciliationEngine,
} from './policyPostExecutionReconciliationEngine.js';
import {
  PolicyImpactAnalysisEngine,
  globalPolicyImpactAnalysisEngine,
  type ImpactAnalysisContext,
} from './policyImpactAnalysisEngine.js';
import {
  PolicyRegressionDetectionEngine,
  globalPolicyRegressionDetectionEngine,
  type RegressionDetectionContext,
} from './policyRegressionDetectionEngine.js';
import {
  PolicyRemediationEffectivenessEngine,
  globalPolicyRemediationEffectivenessEngine,
  type EffectivenessEvaluationContext,
} from './policyRemediationEffectivenessEngine.js';
import {
  PolicyFeedbackProposalEngine,
  globalPolicyFeedbackProposalEngine,
} from './policyFeedbackProposalEngine.js';
import {
  PolicyPostExecutionProvenanceEngine,
  globalPolicyPostExecutionProvenanceEngine,
} from './policyPostExecutionProvenanceEngine.js';
import {
  PolicyPostExecutionAuditEngine,
  globalPolicyPostExecutionAuditEngine,
} from './policyPostExecutionAuditEngine.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface PostExecutionPipelineOptions extends PolicyPostExecutionOptions {
  readonly reconciliationEngine?: PolicyPostExecutionReconciliationEngine;
  readonly impactEngine?: PolicyImpactAnalysisEngine;
  readonly regressionEngine?: PolicyRegressionDetectionEngine;
  readonly effectivenessEngine?: PolicyRemediationEffectivenessEngine;
  readonly feedbackEngine?: PolicyFeedbackProposalEngine;
  readonly provenanceEngine?: PolicyPostExecutionProvenanceEngine;
  readonly auditEngine?: PolicyPostExecutionAuditEngine;
}

export interface PostExecutionPipelineResult {
  readonly reconciliation: PostExecutionReconciliationResult;
  readonly impact: PostExecutionImpactAnalysis;
  readonly regression: PostExecutionRegressionFinding;
  readonly effectiveness: PostExecutionEffectivenessResult;
  readonly feedbackProposal: PolicyFeedbackProposal;
}

export class PolicyPostExecutionRuntime {
  private readonly reconciliationEngine: PolicyPostExecutionReconciliationEngine;
  private readonly impactEngine: PolicyImpactAnalysisEngine;
  private readonly regressionEngine: PolicyRegressionDetectionEngine;
  private readonly effectivenessEngine: PolicyRemediationEffectivenessEngine;
  private readonly feedbackEngine: PolicyFeedbackProposalEngine;
  private readonly provenanceEngine: PolicyPostExecutionProvenanceEngine;
  private readonly auditEngine: PolicyPostExecutionAuditEngine;
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;

  constructor(options?: PostExecutionPipelineOptions) {
    this.reconciliationEngine = options?.reconciliationEngine ?? globalPolicyPostExecutionReconciliationEngine;
    this.impactEngine = options?.impactEngine ?? globalPolicyImpactAnalysisEngine;
    this.regressionEngine = options?.regressionEngine ?? globalPolicyRegressionDetectionEngine;
    this.effectivenessEngine = options?.effectivenessEngine ?? globalPolicyRemediationEffectivenessEngine;
    this.feedbackEngine = options?.feedbackEngine ?? globalPolicyFeedbackProposalEngine;
    this.provenanceEngine = options?.provenanceEngine ?? globalPolicyPostExecutionProvenanceEngine;
    this.auditEngine = options?.auditEngine ?? globalPolicyPostExecutionAuditEngine;
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Post-execution runtime suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('RUNTIME_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Executes the full governed post-execution pipeline.
   * Thực thi toàn bộ đường ống quản trị sau thực thi.
   */
  public processPostExecution(input: {
    readonly receipt: ExecutionReceipt;
    readonly verification: ExecutionVerificationResult;
    readonly impactContext: ImpactAnalysisContext;
    readonly regressionContext?: RegressionDetectionContext;
    readonly effectivenessContext?: EffectivenessEvaluationContext;
  }): PostExecutionPipelineResult {
    // 1. Fail closed on USER_STOP
    this.assertUserStopInactive();

    // 2. Strict tenant isolation
    this.validateTenant(input.receipt.tenantPartition);

    // 3. Reconciliation
    const reconciliation = this.reconciliationEngine.reconcile(input.receipt, input.verification);

    this.auditEngine.recordEvent({
      eventType: 'POST_EXECUTION_RECONCILED',
      tenantPartition: reconciliation.tenantPartition,
      executionId: reconciliation.executionId,
      status: reconciliation.status,
    });

    this.provenanceEngine.recordTransition({
      executionId: reconciliation.executionId,
      tenantPartition: reconciliation.tenantPartition,
      eventType: 'POST_EXECUTION_RECONCILED',
    });

    // 4. Impact Analysis
    const impact = this.impactEngine.analyzeImpact(reconciliation, input.impactContext);

    this.auditEngine.recordEvent({
      eventType: 'IMPACT_ANALYZED',
      tenantPartition: reconciliation.tenantPartition,
      executionId: reconciliation.executionId,
      status: impact.classification,
    });

    this.provenanceEngine.recordTransition({
      executionId: reconciliation.executionId,
      tenantPartition: reconciliation.tenantPartition,
      eventType: 'IMPACT_ANALYZED',
    });

    // 5. Regression Detection
    const regression = this.regressionEngine.detectRegression(
      reconciliation,
      impact,
      input.regressionContext
    );

    this.auditEngine.recordEvent({
      eventType: 'REGRESSION_DETECTED',
      tenantPartition: reconciliation.tenantPartition,
      executionId: reconciliation.executionId,
      status: regression.severity,
      details: { types: regression.regressionTypes },
    });

    this.provenanceEngine.recordTransition({
      executionId: reconciliation.executionId,
      tenantPartition: reconciliation.tenantPartition,
      eventType: 'REGRESSION_DETECTED',
    });

    // 6. Effectiveness Assessment
    const effectiveness = this.effectivenessEngine.assessEffectiveness(
      reconciliation,
      impact,
      regression,
      input.effectivenessContext
    );

    this.auditEngine.recordEvent({
      eventType: 'EFFECTIVENESS_ASSESSED',
      tenantPartition: reconciliation.tenantPartition,
      executionId: reconciliation.executionId,
      status: effectiveness.status,
    });

    this.provenanceEngine.recordTransition({
      executionId: reconciliation.executionId,
      tenantPartition: reconciliation.tenantPartition,
      eventType: 'EFFECTIVENESS_ASSESSED',
    });

    // 7. Feedback Proposal Synthesis
    const feedbackProposal = this.feedbackEngine.generateProposal(
      reconciliation,
      impact,
      regression,
      effectiveness
    );

    this.auditEngine.recordEvent({
      eventType: 'FEEDBACK_PROPOSED',
      tenantPartition: reconciliation.tenantPartition,
      executionId: reconciliation.executionId,
      proposalId: feedbackProposal.proposalId,
      status: feedbackProposal.proposedAction,
    });

    this.provenanceEngine.recordTransition({
      executionId: reconciliation.executionId,
      tenantPartition: reconciliation.tenantPartition,
      eventType: 'FEEDBACK_PROPOSED',
    });

    return Object.freeze({
      reconciliation,
      impact,
      regression,
      effectiveness,
      feedbackProposal,
    });
  }
}

export const globalPolicyPostExecutionRuntime = new PolicyPostExecutionRuntime();
