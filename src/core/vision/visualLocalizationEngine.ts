// src/core/vision/visualLocalizationEngine.ts
// BOWCON V4.0 — MS-1.5.06: VISUAL LOCALIZATION ENGINE
// Component 1032 — REAL
//
// EN: Provides deterministic geometry operations, centroid math, spatial containment,
//     overlap testing, and Euclidean distance computation without execution authority.
// VI: Cung cấp các phép toán hình học tất định, tính trọng tâm, bao hàm không gian,
//     kiểm tra chồng lấn và tính khoảng cách Euclid mà không chứa thẩm quyền thực thi.

import {
  type BoundingBox,
  type Point,
  type VisualElement,
  type ScreenViewport,
  VisionValidationError,
} from './visionTypes.js';
import { VisionInputValidator } from './visionInputValidator.js';

export class VisualLocalizationEngine {
  /**
   * EN: Tests whether containerBox completely contains childBox.
   * VI: Kiểm tra xem containerBox có bao bọc hoàn toàn childBox hay không.
   */
  public static contains(containerBox: BoundingBox, childBox: BoundingBox): boolean {
    return (
      childBox.x >= containerBox.x &&
      childBox.y >= containerBox.y &&
      childBox.x + childBox.width <= containerBox.x + containerBox.width &&
      childBox.y + childBox.height <= containerBox.y + containerBox.height
    );
  }

  /**
   * EN: Tests whether two bounding boxes overlap/intersect.
   * VI: Kiểm tra xem hai hộp bao có giao nhau/chồng lấn không.
   */
  public static overlaps(boxA: BoundingBox, boxB: BoundingBox): boolean {
    const noOverlap =
      boxA.x + boxA.width <= boxB.x ||
      boxB.x + boxB.width <= boxA.x ||
      boxA.y + boxA.height <= boxB.y ||
      boxB.y + boxB.height <= boxA.y;
    return !noOverlap;
  }

  /**
   * EN: Calculates the intersection area in pixels between two boxes.
   * VI: Tính diện tích giao nhau theo pixel giữa hai hộp bao.
   */
  public static intersectionArea(boxA: BoundingBox, boxB: BoundingBox): number {
    const xLeft = Math.max(boxA.x, boxB.x);
    const yTop = Math.max(boxA.y, boxB.y);
    const xRight = Math.min(boxA.x + boxA.width, boxB.x + boxB.width);
    const yBottom = Math.min(boxA.y + boxA.height, boxB.y + boxB.height);

    if (xRight <= xLeft || yBottom <= yTop) {
      return 0;
    }
    return (xRight - xLeft) * (yBottom - yTop);
  }

  /**
   * EN: Calculates Euclidean distance between the center points of two elements or bounding boxes.
   * VI: Tính khoảng cách Euclid giữa điểm tâm của hai phần tử hoặc hộp bao.
   */
  public static distance(
    pointA: Point | BoundingBox,
    pointB: Point | BoundingBox
  ): number {
    const p1 = 'normX' in pointA && !('width' in pointA)
      ? (pointA as Point)
      : { x: (pointA as BoundingBox).x + (pointA as BoundingBox).width / 2, y: (pointA as BoundingBox).y + (pointA as BoundingBox).height / 2 };

    const p2 = 'normX' in pointB && !('width' in pointB)
      ? (pointB as Point)
      : { x: (pointB as BoundingBox).x + (pointB as BoundingBox).width / 2, y: (pointB as BoundingBox).y + (pointB as BoundingBox).height / 2 };

    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.round(Math.sqrt(dx * dx + dy * dy) * 100) / 100;
  }

  /**
   * EN: Tests whether a specific coordinate point lies inside a bounding box.
   * VI: Kiểm tra xem một tọa độ điểm có nằm bên trong hộp bao không.
   */
  public static isPointInside(box: BoundingBox, x: number, y: number): boolean {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new VisionValidationError('Coordinates must be finite numbers', [`x=${x}, y=${y}`]);
    }
    return x >= box.x && x <= box.x + box.width && y >= box.y && y <= box.y + box.height;
  }

  /**
   * EN: Finds the smallest enclosing container element for a given target element.
   * VI: Tìm phần tử vùng chứa bao bọc nhỏ nhất cho một phần tử mục tiêu.
   */
  public static findEnclosingContainer(
    target: VisualElement,
    candidates: readonly VisualElement[]
  ): VisualElement | null {
    const enclosing = candidates.filter(
      (c) => c.elementId !== target.elementId && this.contains(c.boundingBox, target.boundingBox)
    );

    if (enclosing.length === 0) return null;

    // Smallest enclosing container by area (Vùng chứa nhỏ nhất theo diện tích)
    return enclosing.sort((a, b) => {
      const areaA = a.boundingBox.width * a.boundingBox.height;
      const areaB = b.boundingBox.width * b.boundingBox.height;
      return areaA - areaB;
    })[0];
  }

  /**
   * EN: Filters visual elements that intersect or lie within a search region.
   * VI: Lọc các phần tử thị giác giao cắt hoặc nằm trong vùng tìm kiếm.
   */
  public static filterByRegion(
    elements: readonly VisualElement[],
    region: BoundingBox
  ): readonly VisualElement[] {
    return elements.filter((el) => this.overlaps(el.boundingBox, region));
  }
}
