// src/core/vision/visualRelationshipEngine.ts
// BOWCON V4.0 — MS-1.5.06: VISUAL RELATIONSHIP ENGINE
// Component 1033 — REAL
//
// EN: Constructs bounded deterministic spatial relationship graphs (LEFT_OF, ABOVE, CONTAINS,
//     NEAR, OVERLAPS, etc.) capped at MAX_RELATIONSHIPS (500) with zero execution authority.
// VI: Xây dựng đồ thị quan hệ không gian có giới hạn và tất định (LEFT_OF, ABOVE, CONTAINS,
//     NEAR, OVERLAPS, v.v.) giới hạn tối đa MAX_RELATIONSHIPS (500) mà không chứa quyền thực thi.

import {
  VISION_BOUNDS,
  type VisualElement,
  type SpatialRelationshipDescriptor,
  type SpatialRelationshipType,
  VisionUserStopError,
  VisionCapacityError,
  VisionValidationError,
} from './visionTypes.js';
import { VisualLocalizationEngine } from './visualLocalizationEngine.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';

export interface RelationshipEngineOptions {
  readonly userStopProvider?: () => boolean;
  readonly nearDistanceThresholdPixels?: number; // Defaults to 150px
}

export class VisualRelationshipEngine {
  private readonly userStopProvider: () => boolean;
  private readonly nearThreshold: number;

  constructor(options?: RelationshipEngineOptions) {
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
    this.nearThreshold = options?.nearDistanceThresholdPixels ?? 150;
  }

  /**
   * EN: Analyzes pairwise spatial relationships between visual elements in a scene.
   * VI: Phân tích các mối quan hệ không gian theo cặp giữa các phần tử thị giác trong cảnh.
   */
  public buildSpatialGraph(
    elements: readonly VisualElement[]
  ): readonly SpatialRelationshipDescriptor[] {
    if (this.userStopProvider()) {
      throw new VisionUserStopError('build_spatial_graph');
    }

    if (!Array.isArray(elements)) {
      throw new VisionValidationError('Elements must be an array', ['INVALID_ELEMENTS_ARRAY']);
    }

    const relationships: SpatialRelationshipDescriptor[] = [];

    // Evaluate pairwise relationships deterministically (Đánh giá từng cặp phần tử có tính tất định)
    for (let i = 0; i < elements.length; i++) {
      for (let j = 0; j < elements.length; j++) {
        if (i === j) continue;

        if (this.userStopProvider()) {
          throw new VisionUserStopError('spatial_relationship_iteration');
        }

        if (relationships.length >= VISION_BOUNDS.MAX_RELATIONSHIPS) {
          return Object.freeze(relationships); // Bounded at capacity (Dừng ở mức tối đa đã định)
        }

        const a = elements[i];
        const b = elements[j];

        const rels = this.evaluatePairwise(a, b);
        for (const rel of rels) {
          relationships.push(rel);
          if (relationships.length >= VISION_BOUNDS.MAX_RELATIONSHIPS) {
            break;
          }
        }
      }
    }

    // Deterministic sort: sourceElementId, relationshipType, targetElementId
    // Sắp xếp tất định: phần tử nguồn, loại quan hệ, phần tử đích
    relationships.sort((r1, r2) => {
      const srcComp = r1.sourceElementId.localeCompare(r2.sourceElementId);
      if (srcComp !== 0) return srcComp;
      const typeComp = r1.relationshipType.localeCompare(r2.relationshipType);
      if (typeComp !== 0) return typeComp;
      return r1.targetElementId.localeCompare(r2.targetElementId);
    });

    return Object.freeze(relationships);
  }

  /**
   * EN: Evaluates spatial relation from element A to element B.
   * VI: Đánh giá mối quan hệ không gian từ phần tử A tới phần tử B.
   */
  private evaluatePairwise(
    a: VisualElement,
    b: VisualElement
  ): SpatialRelationshipDescriptor[] {
    const boxA = a.boundingBox;
    const boxB = b.boundingBox;
    const dist = VisualLocalizationEngine.distance(a.centerPoint, b.centerPoint);
    const results: SpatialRelationshipDescriptor[] = [];

    // 1. Containment (Bao hàm)
    if (VisualLocalizationEngine.contains(boxA, boxB)) {
      results.push(this.makeDescriptor(a.elementId, b.elementId, 'CONTAINS', dist, 1.0));
      return results;
    }
    if (VisualLocalizationEngine.contains(boxB, boxA)) {
      results.push(this.makeDescriptor(a.elementId, b.elementId, 'INSIDE', dist, 1.0));
      return results;
    }

    // 2. Overlap (Chồng lấn)
    if (VisualLocalizationEngine.overlaps(boxA, boxB)) {
      results.push(this.makeDescriptor(a.elementId, b.elementId, 'OVERLAPS', dist, 0.95));
    }

    // Check vertical overlap for horizontal alignment (Kiểm tra chồng lấn dọc cho căn hàng ngang)
    const hasVerticalOverlap =
      Math.max(boxA.y, boxB.y) < Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    // Check horizontal overlap for vertical alignment (Kiểm tra chồng lấn ngang cho căn hàng dọc)
    const hasHorizontalOverlap =
      Math.max(boxA.x, boxB.x) < Math.min(boxA.x + boxA.width, boxB.x + boxB.width);

    // 3. Directional: LEFT_OF / RIGHT_OF (Bên trái / Bên phải)
    if (boxA.x + boxA.width <= boxB.x && hasVerticalOverlap) {
      const conf = Math.max(0.5, Math.min(1.0, 1.0 - (boxB.x - (boxA.x + boxA.width)) / 1000));
      results.push(this.makeDescriptor(a.elementId, b.elementId, 'LEFT_OF', dist, Math.round(conf * 100) / 100));
    } else if (boxB.x + boxB.width <= boxA.x && hasVerticalOverlap) {
      const conf = Math.max(0.5, Math.min(1.0, 1.0 - (boxA.x - (boxB.x + boxB.width)) / 1000));
      results.push(this.makeDescriptor(a.elementId, b.elementId, 'RIGHT_OF', dist, Math.round(conf * 100) / 100));
    }

    // 4. Directional: ABOVE / BELOW (Phía trên / Phía dưới)
    if (boxA.y + boxA.height <= boxB.y && hasHorizontalOverlap) {
      const conf = Math.max(0.5, Math.min(1.0, 1.0 - (boxB.y - (boxA.y + boxA.height)) / 1000));
      results.push(this.makeDescriptor(a.elementId, b.elementId, 'ABOVE', dist, Math.round(conf * 100) / 100));
    } else if (boxB.y + boxB.height <= boxA.y && hasHorizontalOverlap) {
      const conf = Math.max(0.5, Math.min(1.0, 1.0 - (boxA.y - (boxB.y + boxB.height)) / 1000));
      results.push(this.makeDescriptor(a.elementId, b.elementId, 'BELOW', dist, Math.round(conf * 100) / 100));
    }

    // 5. Proximity: NEAR (Gần kề)
    if (dist <= this.nearThreshold && !VisualLocalizationEngine.overlaps(boxA, boxB)) {
      const conf = Math.max(0.5, Math.min(1.0, 1.0 - dist / this.nearThreshold));
      results.push(this.makeDescriptor(a.elementId, b.elementId, 'NEAR', dist, Math.round(conf * 100) / 100));
    }

    return results;
  }

  private makeDescriptor(
    src: string,
    tgt: string,
    type: SpatialRelationshipType,
    dist: number,
    conf: number
  ): SpatialRelationshipDescriptor {
    return Object.freeze({
      sourceElementId: src,
      targetElementId: tgt,
      relationshipType: type,
      distancePixels: dist,
      confidence: Math.max(0.0, Math.min(1.0, conf)),
    });
  }
}

export const globalVisualRelationshipEngine = new VisualRelationshipEngine();
