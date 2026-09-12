// src/core/crossIncident/systemicFailureDetector.ts
// BOWCON V4.0 — MS-1.3.57: GOVERNED CROSS-INCIDENT INTELLIGENCE & RESILIENCE MEMORY
//
// Governed systemic failure pattern detector.
// Identifies recurring multi-target operational patterns across correlated clusters.
// Restricts classifications strictly to pattern detection semantics:
// OBSERVED_CORRELATION, STRONG_CORRELATION, POSSIBLE_SYSTEMIC_PATTERN, INCONCLUSIVE.
// Causal certainty or attribution language is strictly forbidden.
// Trình phát hiện mẫu lỗi mang tính hệ thống có quản trị.
// Nhận diện các mẫu vận hành lặp lại trên nhiều đối tượng từ các cụm tương quan.
// Giới hạn phân loại nghiêm ngặt trong ngữ nghĩa phát hiện mẫu:
// OBSERVED_CORRELATION, STRONG_CORRELATION, POSSIBLE_SYSTEMIC_PATTERN, INCONCLUSIVE.
// Nghiêm cấm ngôn từ chắc chắn về nguyên nhân hoặc gán nguyên nhân gốc rễ.

import {
  type CrossIncidentCorrelationCluster,
  type SystemicFailureClassification,
  type SystemicFailurePattern,
  createSystemicPatternId,
} from './crossIncidentTypes.js';

export class SystemicFailureDetector {
  /**
   * Detects potential systemic failure patterns across correlated clusters.
   * Classifies strictly into allowed non-causal pattern categories.
   * Phát hiện các mẫu lỗi hệ thống tiềm ẩn qua các cụm tương quan.
   * Phân loại nghiêm ngặt vào các danh mục mẫu phi nhân quả được phép.
   */
  public detectSystemicPatterns(
    clusters: readonly CrossIncidentCorrelationCluster[]
  ): readonly SystemicFailurePattern[] {
    if (!clusters || clusters.length === 0) {
      return [];
    }

    const patterns: SystemicFailurePattern[] = [];

    for (const cluster of clusters) {
      const incidentCount = cluster.incidentIds.length;
      const score = cluster.correlationScore;

      let classification: SystemicFailureClassification;

      if (incidentCount < 2 || score < 0.3) {
        classification = 'INCONCLUSIVE';
      } else if (incidentCount >= 4 && score >= 0.75) {
        classification = 'POSSIBLE_SYSTEMIC_PATTERN';
      } else if (incidentCount >= 3 || score >= 0.6) {
        classification = 'STRONG_CORRELATION';
      } else {
        classification = 'OBSERVED_CORRELATION';
      }

      const patternId = createSystemicPatternId(`syspat_${Date.now()}_${cluster.clusterId.slice(-8)}`);
      const targetId = cluster.commonAttributes.targetId ?? 'UNKNOWN_TARGET';

      const patternDescription = `Observed pattern across ${incidentCount} incidents involving target '${targetId}' with correlation score ${score}. Classified as ${classification}.`;

      patterns.push({
        patternId,
        classification,
        affectedTargets: Object.freeze([targetId]),
        constituentIncidentIds: cluster.incidentIds,
        patternDescription,
        correlationScore: score,
        detectedAt: Date.now(),
        epistemicCaveat: 'PATTERN_DETECTION_NOT_CAUSAL_ATTRIBUTION',
      });
    }

    return Object.freeze(patterns);
  }
}
