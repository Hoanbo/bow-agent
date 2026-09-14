// src/core/vision/visionInputValidator.ts
// BOWCON V4.0 — MS-1.5.06: VISION INPUT VALIDATOR (FAILS-CLOSED)
// Component 1029 — REAL
//
// EN: Enforces strict fails-closed validation across visual frames, viewports, coordinates,
//     prototype pollution attempts, and forbidden Chain-of-Thought (CoT) reasoning markers.
// VI: Thực thi kiểm tra nghiêm ngặt đóng-khi-lỗi đối với khung hình thị giác, viewport,
//     tọa độ, phòng thủ ô nhiễm prototype và cấm các dấu vết suy luận CoT.

import {
  VISION_BOUNDS,
  type VisualFrame,
  type ScreenViewport,
  type BoundingBox,
  type VisualElement,
  type VisualGroundingQuery,
  type VisualSessionDocument,
  VisionValidationError,
  VisionSecurityError,
  VisionCapacityError,
} from './visionTypes.js';

const FORBIDDEN_COT_TAGS = Object.freeze([
  '<thought>',
  '</thought>',
  '[scratchpad]',
  'internalreasoning',
  'chainofthought',
  'reasoning_trace',
  'hidden_reasoning',
  'privatedeliberation',
  'modelthinking',
]);

const FORBIDDEN_OBJECT_KEYS = Object.freeze(['__proto__', 'constructor', 'prototype']);

export class VisionInputValidator {
  /**
   * EN: Validates a raw VisualFrame object fails-closed.
   * VI: Kiểm tra đối tượng VisualFrame đóng-khi-lỗi.
   */
  public static validateFrame(frame: unknown): asserts frame is VisualFrame {
    if (!frame || typeof frame !== 'object') {
      throw new VisionValidationError('Visual frame must be a non-null object', ['INVALID_FRAME_OBJECT']);
    }

    this.assertNoPrototypePollutionOrCoT(frame, 'VisualFrame');

    const f = frame as Record<string, unknown>;
    const errors: string[] = [];

    // 1. Metadata validation (Kiểm tra siêu dữ liệu)
    if (!f.metadata || typeof f.metadata !== 'object') {
      errors.push('metadata object is required');
    } else {
      const m = f.metadata as Record<string, unknown>;
      if (typeof m.frameId !== 'string' || !m.frameId.trim()) errors.push('metadata.frameId must be non-empty string');
      if (typeof m.tenantId !== 'string' || !m.tenantId.trim()) errors.push('metadata.tenantId must be non-empty string');
      if (typeof m.sessionId !== 'string' || !m.sessionId.trim()) errors.push('metadata.sessionId must be non-empty string');
      if (typeof m.captureTimestamp !== 'string' || isNaN(Date.parse(m.captureTimestamp))) {
        errors.push('metadata.captureTimestamp must be a valid ISO date string');
      }
      if (typeof m.contentLengthBytes !== 'number' || !Number.isFinite(m.contentLengthBytes) || m.contentLengthBytes <= 0) {
        errors.push('metadata.contentLengthBytes must be a positive finite number');
      } else if (m.contentLengthBytes > VISION_BOUNDS.MAX_FRAME_BYTES) {
        throw new VisionCapacityError(m.contentLengthBytes, VISION_BOUNDS.MAX_FRAME_BYTES, 'frame buffer bytes');
      }

      const validFormats = new Set(['PNG', 'JPEG', 'WEBP', 'RAW_RGBA']);
      if (typeof m.format !== 'string' || !validFormats.has(m.format)) {
        errors.push(`metadata.format must be one of: ${[...validFormats].join(', ')}`);
      }
    }

    // 2. Viewport validation (Kiểm tra khung nhìn hiển thị)
    if (!f.viewport || typeof f.viewport !== 'object') {
      errors.push('viewport object is required');
    } else {
      try {
        this.validateViewport(f.viewport as ScreenViewport);
      } catch (err) {
        if (err instanceof VisionValidationError) {
          errors.push(...err.validationErrors);
        } else {
          errors.push(String(err));
        }
      }
    }

    // 3. Buffer & Frame Hash validation (Kiểm tra bộ đệm và mã băm khung hình)
    if (!f.frameBuffer || (typeof f.frameBuffer !== 'string' && !(f.frameBuffer instanceof Uint8Array))) {
      errors.push('frameBuffer must be a non-empty string or Uint8Array');
    }

    if (typeof f.frameHash !== 'string' || !/^[0-9a-fA-F]{64}$/.test(f.frameHash)) {
      errors.push('frameHash must be a valid 64-character hex SHA-256 string');
    }

    if (errors.length > 0) {
      throw new VisionValidationError('Visual frame validation failed', errors);
    }
  }

  /**
   * EN: Validates viewport dimensions, rejecting NaN, Infinity, negative or out-of-bound values.
   * VI: Xác thực kích thước viewport, từ chối NaN, vô cực, số âm hoặc ngoài giới hạn chuẩn.
   */
  public static validateViewport(viewport: ScreenViewport): void {
    if (!viewport || typeof viewport !== 'object') {
      throw new VisionValidationError('Viewport must be a non-null object', ['INVALID_VIEWPORT_OBJECT']);
    }

    const errors: string[] = [];

    if (typeof viewport.displayId !== 'string' || !viewport.displayId.trim()) {
      errors.push('viewport.displayId must be a non-empty string');
    }

    for (const [dim, val, min, max] of [
      ['width', viewport.width, VISION_BOUNDS.MIN_VIEWPORT_WIDTH, VISION_BOUNDS.MAX_VIEWPORT_WIDTH],
      ['height', viewport.height, VISION_BOUNDS.MIN_VIEWPORT_HEIGHT, VISION_BOUNDS.MAX_VIEWPORT_HEIGHT],
    ] as const) {
      if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val) || !Number.isInteger(val)) {
        errors.push(`viewport.${dim} must be a finite integer`);
      } else if (val < min || val > max) {
        errors.push(`viewport.${dim} (${val}) out of bounds [${min}, ${max}]`);
      }
    }

    if (typeof viewport.scaleFactor !== 'number' || !Number.isFinite(viewport.scaleFactor) || viewport.scaleFactor <= 0) {
      errors.push('viewport.scaleFactor must be a positive finite number');
    }

    if (typeof viewport.colorDepth !== 'number' || !Number.isFinite(viewport.colorDepth) || viewport.colorDepth <= 0) {
      errors.push('viewport.colorDepth must be a positive finite number');
    }

    if (errors.length > 0) {
      throw new VisionValidationError('Viewport validation failed', errors);
    }
  }

  /**
   * EN: Validates bounding box against viewport boundaries with fails-closed enforcement.
   * VI: Kiểm tra hộp bao (bounding box) đối chiếu giới hạn viewport với cơ chế đóng-khi-lỗi.
   */
  public static validateBoundingBox(box: BoundingBox, viewport: ScreenViewport): void {
    if (!box || typeof box !== 'object') {
      throw new VisionValidationError('Bounding box must be a non-null object', ['INVALID_BOUNDING_BOX']);
    }

    const errors: string[] = [];

    for (const prop of ['x', 'y', 'width', 'height'] as const) {
      const v = box[prop];
      if (typeof v !== 'number' || !Number.isFinite(v) || Number.isNaN(v)) {
        errors.push(`boundingBox.${prop} must be a finite number`);
      }
    }

    if (errors.length === 0) {
      if (box.x < 0) errors.push(`boundingBox.x (${box.x}) cannot be negative`);
      if (box.y < 0) errors.push(`boundingBox.y (${box.y}) cannot be negative`);
      if (box.width <= 0) errors.push(`boundingBox.width (${box.width}) must be strictly positive`);
      if (box.height <= 0) errors.push(`boundingBox.height (${box.height}) must be strictly positive`);

      if (box.x + box.width > viewport.width) {
        errors.push(`boundingBox horizontal extent (${box.x + box.width}) exceeds viewport width (${viewport.width})`);
      }
      if (box.y + box.height > viewport.height) {
        errors.push(`boundingBox vertical extent (${box.y + box.height}) exceeds viewport height (${viewport.height})`);
      }

      // Check normalized coordinates if provided
      for (const normProp of ['normX', 'normY', 'normWidth', 'normHeight'] as const) {
        const nv = box[normProp];
        if (typeof nv !== 'number' || !Number.isFinite(nv) || nv < 0.0 || nv > 1.0) {
          errors.push(`boundingBox.${normProp} must be in range [0.0, 1.0]`);
        }
      }
    }

    if (errors.length > 0) {
      throw new VisionValidationError('Bounding box validation failed', errors);
    }
  }

  /**
   * EN: Validates a detected VisualElement structure.
   * VI: Xác thực cấu trúc VisualElement đã phát hiện.
   */
  public static validateVisualElement(el: VisualElement, viewport?: ScreenViewport): void {
    if (!el || typeof el !== 'object') {
      throw new VisionValidationError('VisualElement must be a non-null object', ['INVALID_VISUAL_ELEMENT']);
    }

    this.assertNoPrototypePollutionOrCoT(el, 'VisualElement');

    const errors: string[] = [];
    if (!el.elementId || typeof el.elementId !== 'string' || !el.elementId.startsWith('el_')) {
      errors.push('VisualElement.elementId must be a non-empty string starting with "el_"');
    }
    if (!el.frameId || typeof el.frameId !== 'string') errors.push('VisualElement.frameId must be non-empty string');
    if (typeof el.detectionConfidence !== 'number' || !Number.isFinite(el.detectionConfidence) || el.detectionConfidence < 0.0 || el.detectionConfidence > 1.0) {
      errors.push('VisualElement.detectionConfidence must be in range [0.0, 1.0]');
    }
    if (typeof el.isInteractive !== 'boolean') {
      errors.push('VisualElement.isInteractive must be a boolean');
    }
    if (typeof el.visualProvenanceHash !== 'string' || el.visualProvenanceHash.length !== 64) {
      errors.push('VisualElement.visualProvenanceHash must be a 64-character hex string');
    }

    if (viewport) {
      try {
        this.validateBoundingBox(el.boundingBox, viewport);
      } catch (err) {
        if (err instanceof VisionValidationError) errors.push(...err.validationErrors);
      }
    }

    if (errors.length > 0) {
      throw new VisionValidationError('Visual element validation failed', errors);
    }
  }

  /**
   * EN: Validates a VisualGroundingQuery input fails-closed.
   * VI: Kiểm tra truy vấn định vị thị giác đóng-khi-lỗi.
   */
  public static validateGroundingQuery(query: unknown): asserts query is VisualGroundingQuery {
    if (!query || typeof query !== 'object') {
      throw new VisionValidationError('VisualGroundingQuery must be a non-null object', ['INVALID_QUERY_OBJECT']);
    }

    this.assertNoPrototypePollutionOrCoT(query, 'VisualGroundingQuery');

    const q = query as Record<string, unknown>;
    const errors: string[] = [];

    if (typeof q.queryId !== 'string' || !q.queryId.trim()) errors.push('queryId must be non-empty string');
    if (typeof q.tenantId !== 'string' || !q.tenantId.trim()) errors.push('tenantId must be non-empty string');
    if (typeof q.sessionId !== 'string' || !q.sessionId.trim()) errors.push('sessionId must be non-empty string');
    if (typeof q.frameId !== 'string' || !q.frameId.trim()) errors.push('frameId must be non-empty string');
    if (typeof q.referenceText !== 'string' || !q.referenceText.trim()) errors.push('referenceText must be non-empty string');

    if (q.minConfidenceThreshold !== undefined && q.minConfidenceThreshold !== null) {
      const thresh = q.minConfidenceThreshold;
      if (typeof thresh !== 'number' || !Number.isFinite(thresh) || thresh < 0.0 || thresh > 1.0) {
        errors.push('minConfidenceThreshold must be in range [0.0, 1.0]');
      }
    }

    if (errors.length > 0) {
      throw new VisionValidationError('Visual grounding query validation failed', errors);
    }
  }

  /**
   * EN: Validates full VisualSessionDocument for persistence/recovery.
   * VI: Kiểm tra toàn diện tài liệu VisualSessionDocument để lưu trữ/phục hồi.
   */
  public static validateSessionDocument(doc: unknown): asserts doc is VisualSessionDocument {
    if (!doc || typeof doc !== 'object') {
      throw new VisionValidationError('VisualSessionDocument must be a non-null object', ['INVALID_DOC_OBJECT']);
    }

    this.assertNoPrototypePollutionOrCoT(doc, 'VisualSessionDocument');

    const d = doc as Record<string, unknown>;
    const errors: string[] = [];

    if (d.schemaVersion !== 1) errors.push('schemaVersion must be 1');
    if (typeof d.sessionId !== 'string' || !d.sessionId.trim()) errors.push('sessionId must be non-empty string');
    if (typeof d.tenantId !== 'string' || !d.tenantId.trim()) errors.push('tenantId must be non-empty string');
    if (typeof d.sessionVersion !== 'number' || d.sessionVersion < 1) errors.push('sessionVersion must be >= 1');
    if (typeof d.provenanceHash !== 'string' || d.provenanceHash.length !== 64) {
      errors.push('provenanceHash must be a 64-character hex string');
    }

    if (!Array.isArray(d.observations)) errors.push('observations must be an array');
    if (!Array.isArray(d.groundingResults)) errors.push('groundingResults must be an array');
    if (!Array.isArray(d.securityAlerts)) errors.push('securityAlerts must be an array');

    if (errors.length > 0) {
      throw new VisionValidationError('Visual session document validation failed', errors);
    }
  }

  /**
   * EN: Pure recursive defense against prototype pollution and Chain-of-Thought reasoning tokens.
   * VI: Phòng thủ đệ quy thuần túy ngăn ô nhiễm prototype và token suy luận CoT.
   */
  public static assertNoPrototypePollutionOrCoT(val: unknown, path = ''): void {
    if (val === null || val === undefined) return;

    if (typeof val === 'string') {
      const lower = val.toLowerCase();
      for (const tag of FORBIDDEN_COT_TAGS) {
        if (lower.includes(tag)) {
          throw new VisionSecurityError(`Chain-of-thought marker '${tag}' prohibited in visual data at '${path}'`, {
            tag,
            path,
          });
        }
      }
      return;
    }

    if (Array.isArray(val)) {
      val.forEach((item, idx) => this.assertNoPrototypePollutionOrCoT(item, `${path}[${idx}]`));
      return;
    }

    if (typeof val === 'object') {
      for (const key of Object.getOwnPropertyNames(val)) {
        const lowerKey = key.toLowerCase();
        for (const forbiddenKey of FORBIDDEN_OBJECT_KEYS) {
          if (lowerKey === forbiddenKey) {
            throw new VisionSecurityError(`Prototype pollution key '${key}' detected at '${path}'`, {
              key,
              path,
            });
          }
        }
        for (const tag of FORBIDDEN_COT_TAGS) {
          if (lowerKey.replace(/[^a-z]/g, '').includes(tag.replace(/[^a-z]/g, ''))) {
            throw new VisionSecurityError(`Chain-of-thought property key '${key}' detected at '${path}'`, {
              key,
              path,
            });
          }
        }
        this.assertNoPrototypePollutionOrCoT((val as Record<string, unknown>)[key], `${path}.${key}`);
      }
    }
  }
}
