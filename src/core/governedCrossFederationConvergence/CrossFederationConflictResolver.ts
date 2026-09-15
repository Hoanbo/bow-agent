// src/core/governedCrossFederationConvergence/CrossFederationConflictResolver.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1143 — REAL
//
// EN: 8-category governed inter-federation conflict detection and deterministic resolution engine.
// VI: Động cơ phát hiện và giải quyết xung đột liên liên đoàn có quản trị theo 8 phân loại chuẩn.

import {
  type CrossFederationConflictCategory,
  type CrossFederationConflictRecord,
  computeSha256,
  deterministicJsonStringify,
} from './GovernedCrossFederationTypes.js';

export interface ResolveConflictParams {
  readonly conflictId: string;
  readonly category: CrossFederationConflictCategory;
  readonly participatingFederationIds: readonly string[];
  readonly description: string;
  readonly humanDirectiveProposalId?: string;
  readonly winningProposalId?: string;
  readonly isPrivilegeEscalationAttempt?: boolean;
}

export class CrossFederationConflictResolver {
  private readonly resolvedConflicts = new Map<string, CrossFederationConflictRecord>();

  // EN: Categorize and resolve inter-federation conflict deterministically without fabricating authority
  // VI: Phân loại và giải quyết xung đột liên liên đoàn một cách xác định mà không bịa đặt quyền hạn
  public resolveConflict(params: ResolveConflictParams): CrossFederationConflictRecord {
    // Assert strictly valid category
    const validCategories: readonly CrossFederationConflictCategory[] = [
      'CROSS_FEDERATION_KNOWLEDGE_CONFLICT',
      'STRATEGY_CONFLICT',
      'CONVERGENCE_CONFLICT',
      'LINEAGE_CONFLICT',
      'VERSION_CONFLICT',
      'AUTHORIZATION_CONFLICT',
      'LEASE_CONFLICT',
      'POLICY_CONFLICT',
    ];

    if (!validCategories.includes(params.category)) {
      throw new Error(`Invalid conflict category: ${params.category}`);
    }

    let resolvable = false;
    let verdict: 'HUMAN_DIRECTIVE_APPLIED' | 'DETERMINISTIC_MERGE' | 'REVIEW_REQUIRED' = 'REVIEW_REQUIRED';

    // Authority challenges and privilege escalation attempts are strictly non-resolvable automatically
    if (params.isPrivilegeEscalationAttempt || params.category === 'AUTHORIZATION_CONFLICT') {
      resolvable = false;
      verdict = 'REVIEW_REQUIRED';
    } else if (params.humanDirectiveProposalId) {
      // Human directive takes absolute precedence
      resolvable = true;
      verdict = 'HUMAN_DIRECTIVE_APPLIED';
    } else if (params.category === 'VERSION_CONFLICT' || params.category === 'CONVERGENCE_CONFLICT') {
      // Deterministically resolvable via OCC retry or round increment
      resolvable = true;
      verdict = 'DETERMINISTIC_MERGE';
    } else if (params.category === 'STRATEGY_CONFLICT' && params.winningProposalId) {
      // Resolved via deterministic ranking
      resolvable = true;
      verdict = 'DETERMINISTIC_MERGE';
    } else {
      // Material contradictions, policy divergence, or lease precedence issues require human review
      resolvable = false;
      verdict = 'REVIEW_REQUIRED';
    }

    const cleanRecord: Omit<CrossFederationConflictRecord, 'provenanceHash'> = {
      conflictId: params.conflictId,
      category: params.category,
      participatingFederationIds: Object.freeze([...params.participatingFederationIds]),
      description: params.description,
      resolvable,
      resolutionVerdict: verdict,
      timestamp: Date.now(),
    };

    const provenanceHash = computeSha256(`conflict_record:${deterministicJsonStringify(cleanRecord)}`);
    const record: CrossFederationConflictRecord = Object.freeze({
      ...cleanRecord,
      provenanceHash,
    });

    this.resolvedConflicts.set(params.conflictId, record);
    return record;
  }

  public getConflict(conflictId: string): CrossFederationConflictRecord | undefined {
    return this.resolvedConflicts.get(conflictId);
  }

  public getAllConflicts(): readonly CrossFederationConflictRecord[] {
    return Object.freeze(Array.from(this.resolvedConflicts.values()));
  }

  public clear(): void {
    this.resolvedConflicts.clear();
  }
}
