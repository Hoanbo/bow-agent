// src/core/vision/visualGroundingEngine.ts
// BOWCON V4.0 — MS-1.5.06: VISUAL GROUNDING ENGINE
// Component 1034 — REAL
//
// EN: Resolves natural-language cognitive references to candidate visual elements
//     with deterministic ranking, composite confidence scoring, and fail-closed ambiguity defense.
// VI: Phân giải tham chiếu nhận thức ngôn ngữ tự nhiên thành các phần tử thị giác ứng viên
//     với xếp hạng tất định, tính điểm tin cậy tổng hợp, và phòng thủ mơ hồ đóng-khi-lỗi.

import {
  VISION_BOUNDS,
  type VisualElement,
  type VisualGroundingQuery,
  type VisualGroundingCandidate,
  type VisualGroundingResult,
  type VisualGroundingStatus,
  type SpatialRelationshipDescriptor,
  type ScreenViewport,
  computeGroundingHash,
  VisionUserStopError,
  VisionCapacityError,
  VisionValidationError,
} from './visionTypes.js';
import { VisionInputValidator } from './visionInputValidator.js';
import { VisualLocalizationEngine } from './visualLocalizationEngine.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface VisualGroundingEngineOptions {
  readonly userStopProvider?: () => boolean;
}

export class VisualGroundingEngine {
  private readonly userStopProvider: () => boolean;

  constructor(options?: VisualGroundingEngineOptions) {
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Grounding pass: resolves query to a localized visual element. Fails closed on ambiguity.
   * VI: Lượt định vị: phân giải truy vấn thành phần tử thị giác. Đóng-khi-lỗi khi có sự mơ hồ.
   */
  public groundReference(
    query: VisualGroundingQuery,
    elements: readonly VisualElement[],
    viewport?: ScreenViewport,
    spatialGraph: readonly SpatialRelationshipDescriptor[] = []
  ): VisualGroundingResult {
    // 1. Synchronous USER_STOP check (Kiểm tra USER_STOP đồng bộ)
    if (this.userStopProvider()) {
      throw new VisionUserStopError('ground_reference_pass');
    }

    // 2. Validate query fails-closed (Xác thực truy vấn đóng-khi-lỗi)
    VisionInputValidator.validateGroundingQuery(query);

    const minThreshold = query.minConfidenceThreshold ?? VISION_BOUNDS.DEFAULT_CONFIDENCE_THRESHOLD;

    if (elements.length === 0) {
      return this.makeResult(query.queryId, query.frameId, 'NOT_FOUND', null, [], false);
    }

    const candidates: VisualGroundingCandidate[] = [];
    const refLower = query.referenceText.toLowerCase().trim();

    // 3. Score every element deterministically (Tính điểm mọi phần tử có tính tất định)
    for (const el of elements) {
      if (this.userStopProvider()) {
        throw new VisionUserStopError('grounding_candidate_evaluation');
      }

      const scores = this.calculateCandidateScores(el, query, refLower, viewport, spatialGraph);

      // Composite confidence formula: 0.50 * semantic + 0.35 * spatial + 0.15 * ocr
      // Công thức độ tin cậy tổng hợp: 0.50 * ngữ nghĩa + 0.35 * không gian + 0.15 * OCR
      let overallConfidence =
        0.50 * scores.semanticScore +
        0.35 * scores.spatialScore +
        0.15 * scores.ocrClarityScore;

      overallConfidence = Math.max(0.0, Math.min(1.0, Math.round(overallConfidence * 10000) / 10000));

      candidates.push({
        element: el,
        semanticScore: scores.semanticScore,
        spatialScore: scores.spatialScore,
        ocrClarityScore: scores.ocrClarityScore,
        overallConfidence,
        rationale: scores.rationale,
      });
    }

    // 4. Deterministic candidate ranking (Xếp hạng ứng viên có tính tất định)
    // 1. Highest overallConfidence (Độ tin cậy cao nhất)
    // 2. Highest spatialScore (Điểm không gian cao nhất)
    // 3. Highest semanticScore (Điểm ngữ nghĩa cao nhất)
    // 4. Smallest distance to screen center (Gần tâm màn hình nhất)
    // 5. Lexicographical elementId (So sánh chuỗi elementId)
    candidates.sort((c1, c2) => {
      if (c2.overallConfidence !== c1.overallConfidence) {
        return c2.overallConfidence - c1.overallConfidence;
      }
      if (c2.spatialScore !== c1.spatialScore) {
        return c2.spatialScore - c1.spatialScore;
      }
      if (c2.semanticScore !== c1.semanticScore) {
        return c2.semanticScore - c1.semanticScore;
      }
      if (viewport) {
        const center = { x: viewport.width / 2, y: viewport.height / 2, normX: 0.5, normY: 0.5 };
        const d1 = VisualLocalizationEngine.distance(c1.element.centerPoint, center);
        const d2 = VisualLocalizationEngine.distance(c2.element.centerPoint, center);
        if (d1 !== d2) return d1 - d2;
      }
      return c1.element.elementId.localeCompare(c2.element.elementId);
    });

    const topCandidates = candidates.slice(0, VISION_BOUNDS.MAX_GROUNDING_CANDIDATES);
    const top1 = topCandidates.length > 0 ? topCandidates[0] : null;
    const top2 = topCandidates.length > 1 ? topCandidates[1] : null;

    // 5. Evaluate threshold and ambiguity rules (Đánh giá ngưỡng và quy tắc mơ hồ)
    if (!top1 || top1.overallConfidence < minThreshold) {
      return this.makeResult(query.queryId, query.frameId, 'NOT_FOUND', null, topCandidates, false);
    }

    // Mandatory Ambiguity Rule: top1 - top2 < 0.15 with both >= threshold -> AMBIGUOUS
    // Quy tắc mơ hồ bắt buộc: độ chênh lệch top 1 và 2 < 0.15 -> Mơ hồ, yêu cầu con người xác nhận
    if (
      top2 &&
      top2.overallConfidence >= minThreshold * 0.85 &&
      top1.overallConfidence - top2.overallConfidence < VISION_BOUNDS.AMBIGUITY_DELTA_THRESHOLD
    ) {
      return this.makeResult(query.queryId, query.frameId, 'AMBIGUOUS', null, topCandidates, true);
    }

    // Grounded cleanly (Định vị thành công)
    return this.makeResult(query.queryId, query.frameId, 'GROUNDED', top1.element, topCandidates, false);
  }

  private calculateCandidateScores(
    el: VisualElement,
    query: VisualGroundingQuery,
    refLower: string,
    viewport?: ScreenViewport,
    spatialGraph: readonly SpatialRelationshipDescriptor[] = []
  ): { semanticScore: number; spatialScore: number; ocrClarityScore: number; rationale: string } {
    let textScore = 0.0;
    let ocrClarityScore = el.detectionConfidence;
    const rationaleParts: string[] = [];

    // Text content matching (Khớp nội dung văn bản nhìn thấy)
    if (el.detectedText) {
      const textLower = el.detectedText.toLowerCase().trim();
      if (textLower === refLower) {
        textScore = 1.0;
        ocrClarityScore = 1.0;
        rationaleParts.push('exact text match');
      } else if (textLower.includes(refLower) || refLower.includes(textLower)) {
        textScore = 0.6;
        ocrClarityScore = 0.85;
        rationaleParts.push('partial text match');
      } else {
        // Distinct text has near-zero semantic similarity for this reference
        textScore = 0.05;
        rationaleParts.push('non-matching text');
      }
    } else {
      // Element lacks detected text
      textScore = query.referenceText ? 0.1 : 0.5;
    }

    // Region type match (Khớp loại vùng hiển thị)
    let regionScore = 0.5;
    if (query.expectedRegionType) {
      if (el.regionType === query.expectedRegionType) {
        regionScore = 1.0;
        rationaleParts.push(`regionType matches ${query.expectedRegionType}`);
      } else {
        regionScore = 0.1;
        rationaleParts.push(`regionType mismatch: expected ${query.expectedRegionType}, got ${el.regionType}`);
      }
    }

    // Semantic score: weighted 70% text relevance + 30% region type congruence
    const semanticScore = query.expectedRegionType
      ? 0.7 * textScore + 0.3 * regionScore
      : textScore;

    // Spatial hint checking (Kiểm tra gợi ý không gian)
    let spatialScore = 1.0;
    if (query.spatialHints && query.spatialHints.length > 0) {
      let matchedHints = 0;
      for (const hint of query.spatialHints) {
        const found = spatialGraph.some(
          (r) =>
            r.sourceElementId === el.elementId &&
            r.relationshipType === hint.relationshipType &&
            (hint.targetElementId === '*' || r.targetElementId === hint.targetElementId)
        );
        if (found) matchedHints++;
      }
      spatialScore = matchedHints / query.spatialHints.length;
      rationaleParts.push(`satisfied ${matchedHints}/${query.spatialHints.length} spatial hints`);
    }

    return {
      semanticScore: Math.max(0.0, Math.min(1.0, Math.round(semanticScore * 100) / 100)),
      spatialScore: Math.max(0.0, Math.min(1.0, Math.round(spatialScore * 100) / 100)),
      ocrClarityScore: Math.max(0.0, Math.min(1.0, Math.round(ocrClarityScore * 100) / 100)),
      rationale: rationaleParts.join('; ') || 'heuristic scoring',
    };
  }

  private makeResult(
    queryId: string,
    frameId: string,
    status: VisualGroundingStatus,
    targetElement: VisualElement | null,
    rankedCandidates: readonly VisualGroundingCandidate[],
    requiresHumanClarification: boolean
  ): VisualGroundingResult {
    const groundedAt = new Date().toISOString();
    const draft: Omit<VisualGroundingResult, 'provenanceHash'> = {
      queryId,
      frameId,
      status,
      targetElement,
      rankedCandidates: Object.freeze([...rankedCandidates]),
      requiresHumanClarification,
      groundedAt,
    };

    const provenanceHash = computeGroundingHash(draft);

    return Object.freeze({
      ...draft,
      provenanceHash,
    });
  }
}

export const globalVisualGroundingEngine = new VisualGroundingEngine();
