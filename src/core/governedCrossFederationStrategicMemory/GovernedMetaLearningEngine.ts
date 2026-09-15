// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1153: GovernedMetaLearningEngine
// Governed Multi-Federation Pattern Extraction & Advisory Meta-Learning Engine
// ============================================================================

import {
  MetaLearningRound,
  MetaLearningRecommendation,
  StrategicMemoryRecord,
  MAX_SYNTHESIS_RECORDS_PER_ROUND,
  MAX_META_LEARNING_ROUNDS_PER_SESSION,
  GovernedStrategicMemoryError,
  GovernedStrategicMemorySecurityError,
  computeMetaLearningRoundHash,
  computeMetaLearningRecommendationHash,
} from './GovernedStrategicMemoryTypes';

export class GovernedMetaLearningEngine {
  private readonly sessionRoundsCount = new Map<string, number>();

  // EN: Executes a governed meta-learning synthesis round over a set of strategic memory records.
  // VI: Thực thi vòng tổng hợp học siêu quy tắc có kiểm soát trên tập bản ghi bộ nhớ chiến lược.
  public executeMetaLearningRound(
    tenantId: string,
    sessionId: string,
    records: StrategicMemoryRecord[]
  ): { round: MetaLearningRound; recommendations: MetaLearningRecommendation[] } {
    this.assertValidTenant(tenantId);

    // Bounded round count check
    const currentRounds = this.sessionRoundsCount.get(sessionId) || 0;
    if (currentRounds >= MAX_META_LEARNING_ROUNDS_PER_SESSION) {
      throw new GovernedStrategicMemoryError(
        `Meta-learning round ceiling reached: max ${MAX_META_LEARNING_ROUNDS_PER_SESSION} rounds per session`,
        'MAX_META_LEARNING_ROUNDS_EXCEEDED'
      );
    }

    // Bounded record input check
    if (records.length > MAX_SYNTHESIS_RECORDS_PER_ROUND) {
      throw new GovernedStrategicMemoryError(
        `Synthesis record limit exceeded: max ${MAX_SYNTHESIS_RECORDS_PER_ROUND} records per round`,
        'MAX_SYNTHESIS_RECORDS_EXCEEDED'
      );
    }

    const roundIndex = currentRounds + 1;
    this.sessionRoundsCount.set(sessionId, roundIndex);

    const now = Date.now();
    const evaluatedRecordIds = records.map((r) => r.recordId);

    // Extract patterns and generate advisory recommendations
    const recommendations = this.synthesizeAdvisoryRecommendations(tenantId, sessionId, records);

    const rawRound: MetaLearningRound = {
      roundId: `round_${sessionId}_${roundIndex}`,
      tenantId,
      sessionId,
      roundIndex,
      evaluatedRecordIds,
      extractedPatternsCount: recommendations.length,
      timestamp: now,
      roundHash: '',
    };

    const roundHash = computeMetaLearningRoundHash(rawRound);
    const round: MetaLearningRound = { ...rawRound, roundHash };

    return { round, recommendations };
  }

  // EN: Resets the engine session counts (used in testing).
  // VI: Đặt lại bộ đếm phiên của engine (dùng trong kiểm thử).
  public clear(): void {
    this.sessionRoundsCount.clear();
  }

  // --------------------------------------------------------------------------
  // Advisory Pattern Extraction Logic
  // --------------------------------------------------------------------------

  private synthesizeAdvisoryRecommendations(
    tenantId: string,
    sessionId: string,
    records: StrategicMemoryRecord[]
  ): MetaLearningRecommendation[] {
    const recommendations: MetaLearningRecommendation[] = [];
    if (records.length === 0) {
      return recommendations;
    }

    // 1. Analyze recurring participating federation clusters
    const federationFrequency = new Map<string, number>();
    for (const rec of records) {
      for (const fed of rec.participatingFederations) {
        federationFrequency.set(fed, (federationFrequency.get(fed) || 0) + 1);
      }
    }

    const frequentFederations = Array.from(federationFrequency.entries())
      .filter(([_, count]) => count >= 2)
      .map(([fed]) => fed)
      .sort();

    if (frequentFederations.length > 0) {
      const recId = `rec_topo_${sessionId}_${Date.now()}`;
      const rec: MetaLearningRecommendation = {
        recommendationId: recId,
        tenantId,
        sessionId,
        category: 'DEPENDENCY_LAYOUT',
        summary: `Recommended co-aligned federation cluster: ${frequentFederations.join(', ')}`,
        recommendedTopology: frequentFederations,
        confidenceScore: 0.85,
        isAdvisoryOnly: true, // INVARIANT: ADVISORY ONLY
        humanReviewRequired: false,
        provenanceHash: '',
        timestamp: Date.now(),
      };
      rec.provenanceHash = computeMetaLearningRecommendationHash(rec);
      recommendations.push(rec);
    }

    // 2. Analyze recurring conflict categories
    const conflictCategoryCounts = new Map<string, number>();
    for (const rec of records) {
      for (const conf of rec.conflictResolutions) {
        conflictCategoryCounts.set(conf.category, (conflictCategoryCounts.get(conf.category) || 0) + 1);
      }
    }

    for (const [category, count] of conflictCategoryCounts.entries()) {
      if (count >= 2) {
        const recId = `rec_conf_${sessionId}_${Date.now()}_${category}`;
        const rec: MetaLearningRecommendation = {
          recommendationId: recId,
          tenantId,
          sessionId,
          category: 'CONFLICT_AVOIDANCE',
          summary: `High recurrence of '${category}' detected (${count} occurrences). Review recommended.`,
          recommendedTopology: [],
          confidenceScore: 0.90,
          isAdvisoryOnly: true, // INVARIANT: ADVISORY ONLY
          humanReviewRequired: true, // Material conflict recurrence mandates human review
          provenanceHash: '',
          timestamp: Date.now(),
        };
        rec.provenanceHash = computeMetaLearningRecommendationHash(rec);
        recommendations.push(rec);
      }
    }

    // 3. High-confidence strategy template
    const highConfidenceRecords = records.filter((r) => r.confidenceScore >= 0.8 && r.stabilityScore >= 0.8);
    if (highConfidenceRecords.length > 0) {
      const recId = `rec_strat_${sessionId}_${Date.now()}`;
      const rec: MetaLearningRecommendation = {
        recommendationId: recId,
        tenantId,
        sessionId,
        category: 'STRATEGY_TEMPLATE',
        summary: `Stable convergence template synthesized from ${highConfidenceRecords.length} historical benchmarks.`,
        recommendedTopology: highConfidenceRecords[0].participatingFederations,
        confidenceScore: 0.88,
        isAdvisoryOnly: true, // INVARIANT: ADVISORY ONLY
        humanReviewRequired: false,
        provenanceHash: '',
        timestamp: Date.now(),
      };
      rec.provenanceHash = computeMetaLearningRecommendationHash(rec);
      recommendations.push(rec);
    }

    return recommendations;
  }

  private assertValidTenant(tenantId: string): void {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new GovernedStrategicMemorySecurityError('Tenant identifier must not be empty');
    }
  }
}
