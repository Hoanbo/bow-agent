// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.18
// Component 1152: HistoricalConvergenceRetrievalEngine
// Deterministic, Bounded Historical Strategic Precedent Retrieval Engine
// ============================================================================

import {
  StrategicRetrievalQuery,
  StrategicRetrievalResult,
  StrategicMemoryRecord,
  MAX_RETRIEVAL_RESULTS_PER_QUERY,
  MAX_CONCURRENT_RETRIEVAL_OPERATIONS,
  GovernedStrategicMemoryError,
  GovernedStrategicMemorySecurityError,
  computeRetrievalQueryHash,
} from './GovernedStrategicMemoryTypes';
import { CrossFederationStrategicMemoryRegistry } from './CrossFederationStrategicMemoryRegistry';

export class HistoricalConvergenceRetrievalEngine {
  private activeQueriesCount = 0;

  constructor(private readonly registry: CrossFederationStrategicMemoryRegistry) {}

  // EN: Executes a deterministic, bounded historical query against tenant records.
  // VI: Thực thi truy vấn lịch sử có giới hạn, tất định đối với các bản ghi của tenant.
  public query(query: StrategicRetrievalQuery): { queryHash: string; results: StrategicRetrievalResult[] } {
    this.assertValidTenant(query.tenantId);

    if (this.activeQueriesCount >= MAX_CONCURRENT_RETRIEVAL_OPERATIONS) {
      throw new GovernedStrategicMemoryError(
        `Concurrent retrieval ceiling exceeded: max ${MAX_CONCURRENT_RETRIEVAL_OPERATIONS} active queries`,
        'MAX_CONCURRENT_RETRIEVAL_EXCEEDED'
      );
    }

    this.activeQueriesCount++;
    try {
      const queryHash = computeRetrievalQueryHash(query);
      const allTenantRecords = this.registry.listRecordsByTenant(query.tenantId);

      const scoredResults: StrategicRetrievalResult[] = [];
      const minConfidence = query.minConfidence ?? 0;
      const limit = Math.min(query.limit ?? MAX_RETRIEVAL_RESULTS_PER_QUERY, MAX_RETRIEVAL_RESULTS_PER_QUERY);

      for (const record of allTenantRecords) {
        // Filter out expired or unsealed records if applicable
        if (record.confidenceScore < minConfidence) {
          continue;
        }

        // Mission filter
        if (query.missionId && record.missionId !== query.missionId) {
          continue;
        }

        // Objective filter
        if (query.objectiveId && record.objectiveId !== query.objectiveId) {
          continue;
        }

        // Target federations overlap filter
        if (query.targetFederations && query.targetFederations.length > 0) {
          const hasOverlap = query.targetFederations.some((fed) =>
            record.participatingFederations.includes(fed)
          );
          if (!hasOverlap) {
            continue;
          }
        }

        // Relevance score computation
        const relevanceScore = this.computeRelevanceScore(record, query);
        scoredResults.push({
          record,
          relevanceScore,
          retrievalTimestamp: Date.now(),
        });
      }

      // Deterministic sort: relevanceScore DESC -> confidenceScore DESC -> creationTimestamp DESC -> recordId ASC
      scoredResults.sort((a, b) => {
        if (b.relevanceScore !== a.relevanceScore) {
          return b.relevanceScore - a.relevanceScore;
        }
        if (b.record.confidenceScore !== a.record.confidenceScore) {
          return b.record.confidenceScore - a.record.confidenceScore;
        }
        if (b.record.creationTimestamp !== a.record.creationTimestamp) {
          return b.record.creationTimestamp - a.record.creationTimestamp;
        }
        return a.record.recordId.localeCompare(b.record.recordId);
      });

      const boundedResults = scoredResults.slice(0, limit);
      return { queryHash, results: boundedResults };
    } finally {
      this.activeQueriesCount--;
    }
  }

  // --------------------------------------------------------------------------
  // Relevance Math & Helpers
  // --------------------------------------------------------------------------

  private computeRelevanceScore(record: StrategicMemoryRecord, query: StrategicRetrievalQuery): number {
    let score = 0.5; // Base match

    // Boost if exact mission match
    if (query.missionId && record.missionId === query.missionId) {
      score += 0.2;
    }

    // Boost if exact objective match
    if (query.objectiveId && record.objectiveId === query.objectiveId) {
      score += 0.15;
    }

    // Boost based on keywords match
    if (query.keywords && query.keywords.length > 0) {
      const recordText = `${record.missionId} ${record.objectiveId} ${record.convergedStrategyDigest}`.toLowerCase();
      let matchedCount = 0;
      for (const kw of query.keywords) {
        if (recordText.includes(kw.toLowerCase())) {
          matchedCount++;
        }
      }
      const keywordRatio = matchedCount / query.keywords.length;
      score += keywordRatio * 0.15;
    }

    // Bound in [0.0, 1.0]
    return Math.min(1.0, Math.max(0.0, score));
  }

  private assertValidTenant(tenantId: string): void {
    if (!tenantId || tenantId.trim().length === 0) {
      throw new GovernedStrategicMemorySecurityError('Tenant identifier must not be empty');
    }
  }
}
