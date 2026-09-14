// src/core/vision/visualFrameNormalizer.ts
// BOWCON V4.0 — MS-1.5.06: VISUAL FRAME NORMALIZER
// Component 1030 — REAL
//
// EN: Provides deterministic viewport geometry, coordinate normalization [0.0, 1.0],
//     and resolution-invariant translation between varied display viewports.
// VI: Cung cấp hình học viewport có tính tất định, chuẩn hóa tọa độ [0.0, 1.0],
//     và dịch chuyển bất biến theo độ phân giải giữa các khung nhìn hiển thị khác nhau.

import {
  type ScreenViewport,
  type BoundingBox,
  type Point,
  VisionValidationError,
} from './visionTypes.js';
import { VisionInputValidator } from './visionInputValidator.js';

export class VisualFrameNormalizer {
  /**
   * EN: Normalizes pixel coordinates to [0.0, 1.0] viewport space.
   * VI: Chuẩn hóa tọa độ pixel sang không gian viewport [0.0, 1.0].
   */
  public static normalizeCoordinates(
    x: number,
    y: number,
    width: number,
    height: number,
    viewport: ScreenViewport
  ): BoundingBox {
    VisionInputValidator.validateViewport(viewport);

    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(width) || !Number.isFinite(height)) {
      throw new VisionValidationError('Coordinates and dimensions must be finite numbers', ['NON_FINITE_COORDINATES']);
    }

    if (x < 0 || y < 0 || width <= 0 || height <= 0) {
      throw new VisionValidationError('Invalid pixel coordinates: must be positive and non-zero dimensions', [
        `x=${x}, y=${y}, width=${width}, height=${height}`,
      ]);
    }

    if (x + width > viewport.width || y + height > viewport.height) {
      throw new VisionValidationError('Bounding box exceeds viewport dimensions', [
        `x+width=${x + width} > ${viewport.width} or y+height=${y + height} > ${viewport.height}`,
      ]);
    }

    const normX = Math.max(0.0, Math.min(1.0, Math.round((x / viewport.width) * 1_000_000) / 1_000_000));
    const normY = Math.max(0.0, Math.min(1.0, Math.round((y / viewport.height) * 1_000_000) / 1_000_000));
    const normWidth = Math.max(0.0, Math.min(1.0, Math.round((width / viewport.width) * 1_000_000) / 1_000_000));
    const normHeight = Math.max(0.0, Math.min(1.0, Math.round((height / viewport.height) * 1_000_000) / 1_000_000));

    return Object.freeze({
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
      normX,
      normY,
      normWidth,
      normHeight,
    });
  }

  /**
   * EN: Computes deterministic centroid point for a bounding box.
   * VI: Tính điểm trọng tâm (centroid) tất định cho một hộp bao.
   */
  public static computeCentroid(box: BoundingBox, viewport: ScreenViewport): Point {
    VisionInputValidator.validateBoundingBox(box, viewport);

    const centerX = box.x + Math.floor(box.width / 2);
    const centerY = box.y + Math.floor(box.height / 2);

    const normCenterX = Math.max(0.0, Math.min(1.0, Math.round((centerX / viewport.width) * 1_000_000) / 1_000_000));
    const normCenterY = Math.max(0.0, Math.min(1.0, Math.round((centerY / viewport.height) * 1_000_000) / 1_000_000));

    return Object.freeze({
      x: centerX,
      y: centerY,
      normX: normCenterX,
      normY: normCenterY,
    });
  }

  /**
   * EN: Converts resolution-invariant normalized coordinates to target viewport pixel coordinates.
   * VI: Chuyển đổi tọa độ chuẩn hóa bất biến theo độ phân giải sang pixel của viewport đích.
   */
  public static denormalizeToViewport(
    normX: number,
    normY: number,
    normWidth: number,
    normHeight: number,
    targetViewport: ScreenViewport
  ): BoundingBox {
    VisionInputValidator.validateViewport(targetViewport);

    for (const [name, val] of [
      ['normX', normX],
      ['normY', normY],
      ['normWidth', normWidth],
      ['normHeight', normHeight],
    ] as const) {
      if (typeof val !== 'number' || !Number.isFinite(val) || val < 0.0 || val > 1.0) {
        throw new VisionValidationError(`Normalized coordinate '${name}' must be in [0.0, 1.0]`, [`${name}=${val}`]);
      }
    }

    const x = Math.round(normX * targetViewport.width);
    const y = Math.round(normY * targetViewport.height);
    const width = Math.max(1, Math.round(normWidth * targetViewport.width));
    const height = Math.max(1, Math.round(normHeight * targetViewport.height));

    return this.normalizeCoordinates(x, y, width, height, targetViewport);
  }
}
