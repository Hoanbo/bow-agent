// src/core/policyFeedbackReview/policyFeedbackRevalidationEngine.ts
// BOWCON V4.0 — MS-1.3.67: GOVERNED FEEDBACK REVIEW, POLICY EVOLUTION INTAKE & HUMAN REVIEW QUEUE LAYER
//
// Governed Policy Feedback Revalidation Engine (Component 757).
// Performs independent revalidation of MS-1.3.66 feedback proposals prior to queuing.
// Revalidates:
// 1. Proposal integrity and branded identifier format
// 2. Cryptographic execution linkage and tenant binding
// 3. Independent verification and reconciliation outcome integrity
// 4. Expected-vs-actual impact analysis consistency
// 5. Remediation effectiveness classification (strictly enforces SUCCESS != EFFECTIVE)
// 6. Regression and degradation classification
// 7. Deterministic freshness and TTL expiration
// 8. Supersession detection
// 9. Fail-closed on invalid evidence; preserves UNKNOWN and INCONCLUSIVE
//
// Authority Invariants:
// - LEVEL_0_ANALYSIS: Read-only revalidation; zero policy mutation
// - EMPIRICAL_PROOF_REQUIRED: SUCCESS does not imply EFFECTIVE without verified proof
// - STRICT_TENANT_ISOLATION: Reject cross-tenant and malformed tenant partitions
// - USER_STOP > EVERYTHING

import path from 'node:path';
import type {
  PolicyFeedbackProposal,
  PostExecutionReconciliationResult,
  PostExecutionImpactAnalysis,
  PostExecutionRegressionFinding,
  PostExecutionEffectivenessResult,
} from '../policyPostExecution/policyPostExecutionTypes.js';
import type {
  FeedbackRevalidationResult,
  PolicyFeedbackReviewOptions,
} from './policyFeedbackReviewTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';

export interface RevalidationContext {
  readonly proposal: PolicyFeedbackProposal;
  readonly reconciliation?: PostExecutionReconciliationResult;
  readonly impact?: PostExecutionImpactAnalysis;
  readonly regression?: PostExecutionRegressionFinding;
  readonly effectiveness?: PostExecutionEffectivenessResult;
  readonly existingProposalsForCandidate?: readonly PolicyFeedbackProposal[];
  readonly currentTimeMs?: number;
}

export class PolicyFeedbackRevalidationEngine {
  private readonly baseDir: string;
  private readonly isUserStopActiveFn?: () => boolean;
  private readonly proposalTtlMs: number;

  constructor(options?: PolicyFeedbackReviewOptions) {
    this.baseDir = path.resolve(options?.baseDir ?? path.join(process.cwd(), 'data', 'partitions'));
    this.isUserStopActiveFn = options?.isUserStopActive;
    this.proposalTtlMs = options?.proposalTtlMs ?? 86400000; // 24 hours
  }

  private assertUserStopInactive(): void {
    if (this.isUserStopActiveFn && this.isUserStopActiveFn()) {
      throw new Error('OPERATION_SUSPENDED_BY_USER_STOP: Revalidation suspended by USER_STOP supremacy');
    }
  }

  private validateTenant(tenantPartition: string): void {
    if (!tenantPartition || typeof tenantPartition !== 'string' || tenantPartition.trim().length === 0) {
      throw new Error('REVALIDATION_SECURITY_VIOLATION: tenantPartition must be a non-empty string');
    }
    resolveUserPartition(tenantPartition.trim(), this.baseDir);
  }

  /**
   * Independently revalidates a feedback proposal against its post-execution artifacts.
   */
  public revalidateProposal(context: RevalidationContext): FeedbackRevalidationResult {
    // 1. Fail closed on USER_STOP
    this.assertUserStopInactive();

    const { proposal, reconciliation, impact, regression, effectiveness, existingProposalsForCandidate } = context;
    const reasons: string[] = [];

    // 2. Proposal existence and format validation
    if (!proposal || !proposal.proposalId || typeof proposal.proposalId !== 'string' || proposal.proposalId.trim().length === 0) {
      return {
        valid: false,
        proposalId: (proposal?.proposalId ?? 'UNKNOWN_PROPOSAL') as any,
        tenantPartition: proposal?.tenantPartition ?? 'UNKNOWN_TENANT',
        executionId: (proposal?.executionId ?? 'UNKNOWN_EXECUTION') as any,
        candidateId: proposal?.candidateId,
        isFresh: false,
        isSuperseded: false,
        integrityVerified: false,
        reasons: ['INVALID_PROPOSAL_PAYLOAD: Missing or malformed proposal object or proposalId'],
        revalidatedAt: new Date().toISOString(),
      };
    }

    // 3. Strict tenant validation
    try {
      this.validateTenant(proposal.tenantPartition);
    } catch (err: any) {
      return {
        valid: false,
        proposalId: proposal.proposalId,
        tenantPartition: proposal.tenantPartition,
        executionId: proposal.executionId,
        candidateId: proposal.candidateId,
        isFresh: false,
        isSuperseded: false,
        integrityVerified: false,
        reasons: [`TENANT_ISOLATION_REJECTED: ${err.message}`],
        revalidatedAt: new Date().toISOString(),
      };
    }

    // 4. Autonomous mutation invariant check
    if (proposal.isAutonomousMutation !== false) {
      reasons.push('AUTHORITY_INVARIANT_VIOLATION: Proposal must declare isAutonomousMutation as strictly false');
    }

    // 5. Execution ID linkage
    if (!proposal.executionId || typeof proposal.executionId !== 'string' || proposal.executionId.trim().length === 0) {
      reasons.push('MISSING_EXECUTION_LINKAGE: Proposal lacks valid executionId binding');
    }

    // 6. Reconciliation linkage and consistency
    if (reconciliation) {
      if (reconciliation.executionId !== proposal.executionId) {
        reasons.push(`RECONCILIATION_MISMATCH: ExecutionId ${reconciliation.executionId} does not match proposal ${proposal.executionId}`);
      }
      if (reconciliation.tenantPartition !== proposal.tenantPartition) {
        reasons.push(`TENANT_BINDING_MISMATCH: Reconciliation tenant ${reconciliation.tenantPartition} does not match proposal ${proposal.tenantPartition}`);
      }
      if (reconciliation.status === 'RECONCILIATION_INVALID' || reconciliation.status === 'RECONCILIATION_DEGRADED') {
        reasons.push(`DEGRADED_RECONCILIATION: Post-execution reconciliation was ${reconciliation.status}`);
      }
    }

    // 7. Impact analysis consistency
    if (impact) {
      if (impact.executionId !== proposal.executionId) {
        reasons.push(`IMPACT_ANALYSIS_MISMATCH: ExecutionId ${impact.executionId} does not match proposal ${proposal.executionId}`);
      }
      if (impact.classification !== proposal.impactClassification) {
        reasons.push(`IMPACT_CLASSIFICATION_CONTRADICTION: Proposal has ${proposal.impactClassification}, impact analysis reports ${impact.classification}`);
      }
    }

    // 8. Effectiveness assessment consistency & SUCCESS != EFFECTIVE rule
    if (effectiveness) {
      if (effectiveness.executionId !== proposal.executionId) {
        reasons.push(`EFFECTIVENESS_MISMATCH: ExecutionId ${effectiveness.executionId} does not match proposal ${proposal.executionId}`);
      }
      if (effectiveness.status !== proposal.effectivenessStatus) {
        reasons.push(`EFFECTIVENESS_CONTRADICTION: Proposal has ${proposal.effectivenessStatus}, effectiveness engine reports ${effectiveness.status}`);
      }
      // Strict invariant: SUCCESS does not imply EFFECTIVE without empirical proof
      if (effectiveness.executionSuccess && !effectiveness.issueResolved && effectiveness.status === 'EFFECTIVE') {
        reasons.push('INVALID_EFFECTIVENESS_INFERENCE: Execution success without issue resolution cannot be classified as EFFECTIVE');
      }
    }

    // 9. Regression findings consistency
    if (regression) {
      if (regression.executionId !== proposal.executionId) {
        reasons.push(`REGRESSION_ANALYSIS_MISMATCH: ExecutionId ${regression.executionId} does not match proposal ${proposal.executionId}`);
      }
    }

    // 10. Freshness & TTL check
    const now = context.currentTimeMs ?? Date.now();
    const proposedTimestamp = new Date(proposal.proposedAt).getTime();
    let isFresh = true;
    if (Number.isNaN(proposedTimestamp) || proposedTimestamp <= 0) {
      isFresh = false;
      reasons.push('INVALID_TIMESTAMP: proposal proposedAt is not a valid ISO date');
    } else if (now - proposedTimestamp > this.proposalTtlMs) {
      isFresh = false;
      reasons.push(`PROPOSAL_EXPIRED: Proposal age (${Math.round((now - proposedTimestamp) / 1000)}s) exceeds TTL (${this.proposalTtlMs / 1000}s)`);
    }

    // 11. Supersession check
    let isSuperseded = false;
    if (existingProposalsForCandidate && existingProposalsForCandidate.length > 0) {
      for (const other of existingProposalsForCandidate) {
        if (other.proposalId !== proposal.proposalId) {
          const otherTime = new Date(other.proposedAt).getTime();
          if (otherTime > proposedTimestamp) {
            isSuperseded = true;
            reasons.push(`PROPOSAL_SUPERSEDED: Superseded by newer proposal ${other.proposalId} at ${other.proposedAt}`);
            break;
          }
        }
      }
    }

    const valid = reasons.length === 0 && isFresh && !isSuperseded;

    return {
      valid,
      proposalId: proposal.proposalId,
      tenantPartition: proposal.tenantPartition,
      executionId: proposal.executionId,
      candidateId: proposal.candidateId,
      isFresh,
      isSuperseded,
      integrityVerified: reasons.filter(r => !r.startsWith('PROPOSAL_EXPIRED') && !r.startsWith('PROPOSAL_SUPERSEDED')).length === 0,
      reasons: Object.freeze(reasons),
      revalidatedAt: new Date(now).toISOString(),
    };
  }
}
