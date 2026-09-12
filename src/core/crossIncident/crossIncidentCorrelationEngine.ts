// src/core/crossIncident/crossIncidentCorrelationEngine.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Governed cross-incident temporal and topological correlation engine.
// Detects correlated incident clusters across sliding temporal windows (15–60 minutes)
// and shared topological infrastructure attributes (nodes, services, configurations).
// Enforces a strict mathematical ceiling (score <= 0.95) and explicit causal humility (CORRELATION != CAUSATION).
// Động cơ tương quan liên sự cố theo thời gian và cấu trúc liên kết có quản trị.
// Phát hiện cụm sự cố tương quan qua cửa sổ trượt thời gian (15–60 phút) và thuộc tính hạ tầng dùng chung.
// Thực thi trần toán học nghiêm ngặt (điểm <= 0.95) và sự khiêm tốn nhân quả rõ ràng (TƯƠNG QUAN != NHÂN QUẢ).

import crypto from 'node:crypto';
import {
  type ArchivedIncidentRecord,
  type CrossIncidentCorrelationCluster,
  type CorrelationType,
  type CorrelatedIncidentAttributes,
  createPatternClusterId,
} from './crossIncidentTypes.js';
import type { IncidentId } from '../diagnosis/diagnosisTypes.js';

export interface CorrelationEngineOptions {
  /**
   * Sliding temporal window in minutes.
   * Provisional heuristic parameter: must remain between 15 and 60 minutes.
   */
  readonly windowMinutes?: number;
  /**
   * Minimum correlation score threshold for emitting a cluster.
   * Default 0.3, strictly capped at 0.95.
   */
  readonly minScoreThreshold?: number;
}

export class CrossIncidentCorrelationEngine {
  public static readonly MIN_TEMPORAL_WINDOW_MINUTES = 15;
  public static readonly MAX_TEMPORAL_WINDOW_MINUTES = 60;
  public static readonly DEFAULT_TEMPORAL_WINDOW_MINUTES = 30;
  public static readonly MAX_CORRELATION_CEILING = 0.95; // Provisional heuristic ceiling

  private readonly windowMs: number;
  private readonly minScoreThreshold: number;

  constructor(options?: CorrelationEngineOptions) {
    const rawMinutes = options?.windowMinutes ?? CrossIncidentCorrelationEngine.DEFAULT_TEMPORAL_WINDOW_MINUTES;
    // Bound window between 15 and 60 minutes
    const boundedMinutes = Math.max(
      CrossIncidentCorrelationEngine.MIN_TEMPORAL_WINDOW_MINUTES,
      Math.min(rawMinutes, CrossIncidentCorrelationEngine.MAX_TEMPORAL_WINDOW_MINUTES)
    );
    this.windowMs = boundedMinutes * 60 * 1000;
    this.minScoreThreshold = Math.min(options?.minScoreThreshold ?? 0.3, CrossIncidentCorrelationEngine.MAX_CORRELATION_CEILING);
  }

  /**
   * Correlates a set of archived incidents into temporal and topological clusters.
   * Preserves explicit epistemic caveat: CORRELATION != CAUSATION.
   * Tương quan một tập hợp các sự cố đã lưu trữ thành các cụm thời gian và topo.
   * Bảo toàn cảnh báo nhận thức rõ ràng: TƯƠNG QUAN != NHÂN QUẢ.
   */
  public correlate(records: readonly ArchivedIncidentRecord[]): readonly CrossIncidentCorrelationCluster[] {
    if (!records || records.length < 2) {
      return [];
    }

    // Sort records deterministically by ingestion timestamp
    const sorted = [...records].sort((a, b) => a.ingestedAt - b.ingestedAt);
    const clusters: CrossIncidentCorrelationCluster[] = [];

    // Grouping by pairwise and multi-incident clustering
    for (let i = 0; i < sorted.length; i++) {
      const anchor = sorted[i];
      const correlatedGroup: ArchivedIncidentRecord[] = [anchor];
      let sharedTopologyCount = 0;
      let sharedCategoryCount = 0;

      for (let j = i + 1; j < sorted.length; j++) {
        const candidate = sorted[j];
        const timeDiff = Math.abs(candidate.ingestedAt - anchor.ingestedAt);

        // Check sliding temporal window condition (15-60m)
        const withinTemporalWindow = timeDiff <= this.windowMs;

        // Check topological and contextual overlap
        const sameTarget = candidate.targetId === anchor.targetId;
        const sameCategory = candidate.failureCategory === anchor.failureCategory;
        const sameAction = candidate.actionClass === anchor.actionClass;

        if (withinTemporalWindow || sameTarget || sameCategory) {
          correlatedGroup.push(candidate);
          if (sameTarget) sharedTopologyCount++;
          if (sameCategory) sharedCategoryCount++;
        }
      }

      if (correlatedGroup.length >= 2) {
        // Calculate bounded heuristic correlation score
        const spanMs = correlatedGroup[correlatedGroup.length - 1].ingestedAt - correlatedGroup[0].ingestedAt;
        const temporalProximityFactor = Math.max(0, 1 - spanMs / (this.windowMs * 2));
        const topologicalFactor = sharedTopologyCount / (correlatedGroup.length - 1);
        const categoryFactor = sharedCategoryCount / (correlatedGroup.length - 1);

        // Weighted raw score
        const rawScore = 0.4 * temporalProximityFactor + 0.35 * topologicalFactor + 0.25 * categoryFactor;

        // ENFORCE HARD INVARIANT: 0.0 <= score <= 0.95 (PROVISIONAL HEURISTIC CEILING)
        const finalScore = Math.min(
          CrossIncidentCorrelationEngine.MAX_CORRELATION_CEILING,
          Math.max(0.0, Math.round(rawScore * 100) / 100)
        );

        if (finalScore >= this.minScoreThreshold) {
          const incidentIds: IncidentId[] = correlatedGroup.map((r) => r.incidentId);
          const uniqueIncidentIds = Array.from(new Set(incidentIds));

          if (uniqueIncidentIds.length >= 2) {
            let correlationType: CorrelationType = 'HYBRID';
            if (topologicalFactor > 0.5 && temporalProximityFactor <= 0.3) {
              correlationType = 'TOPOLOGICAL';
            } else if (temporalProximityFactor > 0.5 && topologicalFactor <= 0.3) {
              correlationType = 'TEMPORAL';
            }

            const commonAttrs: CorrelatedIncidentAttributes = {
              targetId: anchor.targetId,
              failureCategory: anchor.failureCategory,
            };

            const clusterHash = crypto
              .createHash('sha256')
              .update(uniqueIncidentIds.sort().join('|') + `:${spanMs}:${finalScore}`)
              .digest('hex')
              .slice(0, 12);

            const clusterId = createPatternClusterId(`cluster_${Date.now()}_${clusterHash}`);

            // Prevent duplicate clusters with exact same constituent incidents
            const alreadyClustered = clusters.some(
              (c) =>
                c.incidentIds.length === uniqueIncidentIds.length &&
                c.incidentIds.every((id) => uniqueIncidentIds.includes(id))
            );

            if (!alreadyClustered) {
              clusters.push({
                clusterId,
                incidentIds: Object.freeze(uniqueIncidentIds),
                correlationScore: finalScore,
                correlationType,
                commonAttributes: Object.freeze(commonAttrs),
                timeSpanMs: spanMs,
                isProvisionalHeuristic: true,
                epistemicCaveat: 'CORRELATION != CAUSATION',
                createdAt: Date.now(),
              });
            }
          }
        }
      }
    }

    return Object.freeze(clusters);
  }
}
