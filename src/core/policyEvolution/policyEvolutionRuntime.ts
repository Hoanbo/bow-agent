// src/core/policyEvolution/policyEvolutionRuntime.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Master coordinator runtime for governed operational policy evolution.
// Coordinates proposal synthesis, counterfactual incident simulation, guardrail margin calibration,
// human review staging, single-use token authorization verification, transactional rollout,
// automatic failure rollback, cryptographic provenance chaining, and canonical AuditLedger logging.
// Authority Invariant: Level 0/1/2 Governance Runtime — Absolute USER_STOP Supremacy.
// Runtime điều phối bậc thầy cho tiến hóa chính sách vận hành có quản trị.

import crypto from 'node:crypto';
import { AuditLedger, globalAuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer, globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import {
  type PolicyEvolutionProposal,
  type CounterfactualSimulationResult,
  type GuardrailCalibrationResult,
  type PolicyReviewRecord,
  type PolicyRolloutRecord,
  type PolicyRollbackRecord,
  type PolicyEvolutionProvenanceRecord,
  type PolicyConfiguration,
  type PolicySnapshot,
} from './policyEvolutionTypes.js';
import { PolicySnapshotStore } from './policySnapshotStore.js';
import { PolicyRefinementSynthesizer, type SynthesizeProposalInput } from './policyRefinementSynthesizer.js';
import { CounterfactualSimulationEngine } from './counterfactualSimulationEngine.js';
import { GuardrailCalibrationEngine } from './guardrailCalibrationEngine.js';
import { PolicyEvolutionReviewBridge, type StagedReviewPackage } from './policyEvolutionReviewBridge.js';
import { GovernedPolicyRolloutEngine } from './governedPolicyRolloutEngine.js';
import { PolicyEvolutionRollbackEngine } from './policyEvolutionRollbackEngine.js';
import { PolicyEvolutionProvenanceEngine } from './policyEvolutionProvenanceEngine.js';
import type { AuthorizationToken } from '../world-action/worldActionTypes.js';

export interface PolicyEvolutionRuntimeOptions {
  readonly snapshotStore?: PolicySnapshotStore;
  readonly synthesizer?: PolicyRefinementSynthesizer;
  readonly simulationEngine?: CounterfactualSimulationEngine;
  readonly calibrationEngine?: GuardrailCalibrationEngine;
  readonly reviewBridge?: PolicyEvolutionReviewBridge;
  readonly rolloutEngine?: GovernedPolicyRolloutEngine;
  readonly rollbackEngine?: PolicyEvolutionRollbackEngine;
  readonly provenanceEngine?: PolicyEvolutionProvenanceEngine;
  readonly auditLedger?: AuditLedger;
  readonly sanitizer?: DiagnosisSanitizer;
}

export class PolicyEvolutionRuntime {
  public static readonly AUDIT_DOMAIN = 'POLICY_EVOLUTION';
  private static readonly PROTECTED_WORKSPACE_PATTERN = /[Cc]:[\\/]BOW[\\/]shopofbow/i;

  private readonly snapshotStore: PolicySnapshotStore;
  private readonly synthesizer: PolicyRefinementSynthesizer;
  private readonly simulationEngine: CounterfactualSimulationEngine;
  private readonly calibrationEngine: GuardrailCalibrationEngine;
  private readonly reviewBridge: PolicyEvolutionReviewBridge;
  private readonly rolloutEngine: GovernedPolicyRolloutEngine;
  private readonly rollbackEngine: PolicyEvolutionRollbackEngine;
  private readonly provenanceEngine: PolicyEvolutionProvenanceEngine;
  private readonly auditLedger: AuditLedger;
  private readonly sanitizer: DiagnosisSanitizer;

  private userStopActive = false;

  constructor(options?: PolicyEvolutionRuntimeOptions) {
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.auditLedger = options?.auditLedger ?? globalAuditLedger;
    this.snapshotStore = options?.snapshotStore ?? new PolicySnapshotStore({ sanitizer: this.sanitizer });
    this.synthesizer = options?.synthesizer ?? new PolicyRefinementSynthesizer();
    this.simulationEngine = options?.simulationEngine ?? new CounterfactualSimulationEngine();
    this.calibrationEngine = options?.calibrationEngine ?? new GuardrailCalibrationEngine();
    this.reviewBridge = options?.reviewBridge ?? new PolicyEvolutionReviewBridge();
    this.rolloutEngine = options?.rolloutEngine ?? new GovernedPolicyRolloutEngine(this.snapshotStore);
    this.rollbackEngine = options?.rollbackEngine ?? new PolicyEvolutionRollbackEngine(this.snapshotStore);
    this.provenanceEngine = options?.provenanceEngine ?? new PolicyEvolutionProvenanceEngine();
  }

  /**
   * Sets or unsets the USER_STOP emergency circuit breaker.
   * When active, all operations fail closed immediately.
   * Đặt hoặc hủy cầu dao khẩn cấp USER_STOP.
   */
  public setUserStop(active: boolean): void {
    this.userStopActive = active;
    this.recordAudit('USER_STOP_STATE_CHANGED', {
      userStopActive: active,
      timestamp: Date.now(),
    });
  }

  public isUserStopActive(): boolean {
    return this.userStopActive;
  }

  /**
   * Invariant check ensuring operational safety, USER_STOP supremacy, and protected workspace isolation.
   * Kiểm tra bất biến đảm bảo an toàn vận hành, quyền tối thượng của USER_STOP và cách ly không gian bảo vệ.
   */
  private assertOperationalSafety(contextString?: string): void {
    if (this.userStopActive) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP');
    }

    if (contextString && PolicyEvolutionRuntime.PROTECTED_WORKSPACE_PATTERN.test(contextString)) {
      this.recordAudit('SECURITY_VIOLATION_DETECTED', {
        context: 'PROTECTED_WORKSPACE_ATTEMPT',
        stringExcerpt: contextString.slice(0, 100),
      });
      throw new Error('SECURITY_VIOLATION: Protected workspace C:\\BOW\\shopofbow access is strictly forbidden');
    }
  }

  /**
   * Records an immutable event to canonical globalAuditLedger under domain 'POLICY_EVOLUTION'.
   * Ghi sự kiện bất biến vào globalAuditLedger chuẩn tắc dưới miền 'POLICY_EVOLUTION'.
   */
  private recordAudit(action: string, details: Record<string, unknown>): void {
    try {
      const sanitizedDetails = this.sanitizer.sanitize(details) as Record<string, unknown>;
      const rawPayload = JSON.stringify({ action, details: sanitizedDetails });
      const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');

      this.auditLedger.record({
        timestamp: new Date().toISOString(),
        actor: {
          userId: 'POLICY_EVOLUTION_RUNTIME',
          role: 'GOVERNANCE_COORDINATOR',
          channel: 'INTERNAL',
        },
        domain: PolicyEvolutionRuntime.AUDIT_DOMAIN,
        toolName: action,
        classification: action.includes('VIOLATION') || action.includes('USER_STOP') ? 'SAFETY' : 'GOVERNANCE',
        argumentsHash,
        policyDecision: 'PERMIT',
        executionStatus: 'SUCCESS',
      });
    } catch (err) {
      console.warn('[PolicyEvolutionRuntime] Audit recording failed:', err);
    }
  }

  /**
   * Retrieves active policy configuration.
   * Lấy cấu hình chính sách hiện đang hoạt động.
   */
  public getActiveConfiguration(userId?: string): PolicyConfiguration {
    this.assertOperationalSafety();
    return this.snapshotStore.getActiveConfiguration(userId);
  }

  /**
   * Synthesizes a candidate PolicyEvolutionProposal from cross-incident intelligence artifacts.
   * Fails closed if USER_STOP is active.
   * Tổng hợp một Đề xuất Tiến hóa Chính sách ứng viên từ các hiện vật tình báo liên sự cố.
   */
  public synthesizeProposal(input: SynthesizeProposalInput): PolicyEvolutionProposal {
    this.assertOperationalSafety(input.targetAction);
    const proposal = this.synthesizer.synthesizeProposal(input);

    this.recordAudit('POLICY_PROPOSAL_SYNTHESIZED', {
      proposalId: proposal.proposalId,
      baseVersionId: proposal.baseVersionId,
      confidence: proposal.confidence,
      riskClassification: proposal.riskClassification,
    });

    return proposal;
  }

  /**
   * Runs counterfactual incident simulation against archived incident history.
   * Authority: Level 0 Read-Only. Fails closed if USER_STOP is active.
   * Chạy mô phỏng sự cố phản thực tế trên lịch sử sự cố đã lưu trữ.
   */
  public runSimulation(
    proposal: PolicyEvolutionProposal,
    userId?: string
  ): CounterfactualSimulationResult {
    this.assertOperationalSafety(proposal.proposalId);
    const result = this.simulationEngine.simulateProposal(proposal, { userId });

    this.recordAudit('COUNTERFACTUAL_SIMULATION_COMPLETED', {
      simulationId: result.simulationId,
      proposalId: result.proposalId,
      replayedIncidentsCount: result.replayedIncidentsCount,
      simulatedMttrDeltaMs: result.simulatedMttrDeltaMs,
      simulatedSafetyRegressionsCount: result.simulatedSafetyRegressionsCount,
    });

    return result;
  }

  /**
   * Calibrates guardrail margins and enforces hard safety invariants.
   * Authority: Level 0 Read-Only. Fails closed if USER_STOP is active.
   * Hiệu chuẩn biên giới bảo vệ và thực thi các bất biến an toàn cốt lõi.
   */
  public calibrateGuardrails(
    proposal: PolicyEvolutionProposal,
    simulationResult: CounterfactualSimulationResult
  ): GuardrailCalibrationResult {
    this.assertOperationalSafety(proposal.proposalId);
    const result = this.calibrationEngine.calibrateGuardrails(proposal, simulationResult);

    this.recordAudit('GUARDRAILS_CALIBRATED', {
      proposalId: proposal.proposalId,
      passed: result.passed,
      safetyMarginScore: result.safetyMarginScore,
      violatesForbiddenProtection: result.violatesForbiddenProtection,
      erosionDetected: result.erosionDetected,
    });

    return result;
  }

  /**
   * Stages a validated proposal package for Master Human Operator review.
   * Generates cryptographic provenance seal. Fails closed if USER_STOP is active.
   * Chuẩn bị gói đề xuất đã xác thực cho đánh giá của Master Human Operator.
   */
  public stageForReview(
    proposal: PolicyEvolutionProposal,
    simulationResult: CounterfactualSimulationResult,
    guardrailResult: GuardrailCalibrationResult,
    userId?: string
  ): { stagedPackage: StagedReviewPackage; provenance: PolicyEvolutionProvenanceRecord } {
    this.assertOperationalSafety(proposal.proposalId);

    const activeConfig = this.snapshotStore.getActiveConfiguration(userId);

    const provenance = this.provenanceEngine.generateProvenance({
      proposal,
      simulationResult,
      guardrailResult,
    });

    const stagedPackage = this.reviewBridge.stageForReview(
      proposal,
      simulationResult,
      guardrailResult,
      provenance.provenanceSha256,
      activeConfig.versionId
    );

    this.recordAudit('POLICY_PROPOSAL_STAGED_FOR_REVIEW', {
      proposalId: proposal.proposalId,
      provenanceSha256: provenance.provenanceSha256,
      targetPolicyVersionId: stagedPackage.targetPolicyVersionId,
    });

    return { stagedPackage, provenance };
  }

  /**
   * Submits an explicit human review decision.
   * Rejects autonomous agent self-approval. Fails closed if USER_STOP is active.
   * Đệ trình quyết định đánh giá của con người rõ ràng.
   */
  public submitHumanReview(
    stagedPackage: StagedReviewPackage,
    decision: 'APPROVED' | 'REJECTED',
    reviewerId: string,
    reviewNotes: string,
    authorizationToken?: AuthorizationToken
  ): PolicyReviewRecord {
    this.assertOperationalSafety(stagedPackage.proposal.proposalId);

    const reviewRecord = this.reviewBridge.processReview({
      stagedPackage,
      decision,
      reviewerId,
      reviewNotes,
      authorizationToken,
    });

    this.recordAudit('POLICY_REVIEW_COMPLETED', {
      reviewId: reviewRecord.reviewId,
      proposalId: reviewRecord.proposalId,
      decision: reviewRecord.decision,
      reviewedBy: reviewRecord.reviewedBy,
      hasAuthToken: reviewRecord.authorizationToken !== undefined,
    });

    return reviewRecord;
  }

  /**
   * Executes a transactional policy rollout upon receiving explicit human authorization.
   * Consumes authorization token atomically. Fails closed if USER_STOP is active.
   * Thực thi triển khai chính sách có giao dịch sau khi nhận được ủy quyền rõ ràng của con người.
   */
  public applyPolicyRollout(
    proposal: PolicyEvolutionProposal,
    reviewRecord: PolicyReviewRecord,
    provenanceSha256: string,
    userId?: string
  ): { rolloutRecord: PolicyRolloutRecord; updatedConfiguration: PolicyConfiguration } {
    this.assertOperationalSafety(proposal.proposalId);

    const outcome = this.rolloutEngine.executeRollout({
      proposal,
      reviewRecord,
      provenanceSha256,
      userId,
    });

    this.recordAudit('POLICY_ROLLOUT_COMMITTED', {
      rolloutId: outcome.rolloutRecord.rolloutId,
      proposalId: outcome.rolloutRecord.proposalId,
      fromVersionId: outcome.rolloutRecord.fromVersionId,
      toVersionId: outcome.rolloutRecord.toVersionId,
      verificationOutcome: outcome.rolloutRecord.verificationOutcome,
    });

    return outcome;
  }

  /**
   * Rolls back active policy to previous snapshot upon failure or revocation.
   * Hoàn tác chính sách đang hoạt động về bản chụp trước đó khi có lỗi hoặc thu hồi.
   */
  public rollbackPolicy(
    rolloutRecord: PolicyRolloutRecord,
    reason: string,
    userId?: string
  ): { rollbackRecord: PolicyRollbackRecord; restoredSnapshot: PolicySnapshot } {
    this.assertOperationalSafety(rolloutRecord.rolloutId);

    const outcome = this.rollbackEngine.executeRollback({
      rolloutRecord,
      reason,
      userId,
    });

    this.recordAudit('POLICY_ROLLBACK_EXECUTED', {
      rollbackId: outcome.rollbackRecord.rollbackId,
      rolloutId: outcome.rollbackRecord.rolloutId,
      revertedToVersionId: outcome.rollbackRecord.revertedToVersionId,
      reason,
    });

    return outcome;
  }
}
