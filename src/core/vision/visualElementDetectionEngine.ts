// src/core/vision/visualElementDetectionEngine.ts
// BOWCON V4.0 — MS-1.5.06: VISUAL ELEMENT DETECTION ENGINE
// Component 1031 — REAL
//
// EN: Extracts, validates, and categorizes visual scene elements with deterministic IDs,
//     bounded capacity (<= 200 elements), secret sanitization, and synchronous USER_STOP assertion.
// VI: Trích xuất, xác thực và phân loại phần tử thị giác với định danh tất định,
//     giới hạn sức chứa (<= 200 phần tử), khử trùng bí mật và kiểm tra USER_STOP đồng bộ.

import {
  VISION_BOUNDS,
  type VisualFrame,
  type VisualElement,
  type VisualRegionType,
  computeDeterministicElementId,
  computeElementHash,
  VisionUserStopError,
  VisionCapacityError,
  VisionValidationError,
} from './visionTypes.js';
import { VisionInputValidator } from './visionInputValidator.js';
import { VisualFrameNormalizer } from './visualFrameNormalizer.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { globalDiagnosisSanitizer, type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CloudEscalationSanitizer } from '../cognitive/cloudEscalationSanitizer.js';

export interface VisualElementInput {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly regionType: VisualRegionType;
  readonly detectedText?: string;
  readonly parentContainerId?: string;
  readonly detectionConfidence?: number;
  readonly isInteractive?: boolean;
}

export interface DetectionEngineOptions {
  readonly sanitizer?: DiagnosisSanitizer;
  readonly userStopProvider?: () => boolean;
}

export class VisualElementDetectionEngine {
  private readonly sanitizer: DiagnosisSanitizer;
  private readonly userStopProvider: () => boolean;

  constructor(options?: DetectionEngineOptions) {
    this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    this.userStopProvider =
      options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
  }

  /**
   * EN: Ingests candidate visual element inputs, validates boundaries, computes deterministic IDs,
   *     and produces immutable VisualElement records.
   * VI: Tiếp nhận dữ liệu ứng viên phần tử thị giác, xác thực ranh giới, tính định danh tất định,
   *     và tạo các bản ghi VisualElement bất biến.
   */
  public detectElements(
    frame: VisualFrame,
    candidates: readonly VisualElementInput[]
  ): readonly VisualElement[] {
    // 1. Synchronous USER_STOP check (Kiểm tra USER_STOP đồng bộ)
    if (this.userStopProvider()) {
      throw new VisionUserStopError('element_detection_pass');
    }

    // 2. Validate frame fails-closed (Xác thực khung hình đóng-khi-lỗi)
    VisionInputValidator.validateFrame(frame);

    // 3. Check capacity bounds (Kiểm tra trần số lượng phần tử)
    if (candidates.length > VISION_BOUNDS.MAX_VISUAL_ELEMENTS) {
      throw new VisionCapacityError(
        candidates.length,
        VISION_BOUNDS.MAX_VISUAL_ELEMENTS,
        'visual elements per scene'
      );
    }

    const detected: VisualElement[] = [];

    for (const input of candidates) {
      if (this.userStopProvider()) {
        throw new VisionUserStopError('element_processing_iteration');
      }

      // Validate and normalize bounding box coordinates
      const box = VisualFrameNormalizer.normalizeCoordinates(
        input.x,
        input.y,
        input.width,
        input.height,
        frame.viewport
      );

      const centerPoint = VisualFrameNormalizer.computeCentroid(box, frame.viewport);

      // Deterministic element ID calculation: el_<sha256(frameId:x:y:w:h)[0..15]>
      const elementId = computeDeterministicElementId(
        frame.metadata.frameId,
        box.x,
        box.y,
        box.width,
        box.height
      );

      // Sanitize visible text if present (Khử trùng văn bản nhìn thấy)
      const sanitizedText = input.detectedText ? this.sanitizeText(input.detectedText) : undefined;

      const confidence = Math.max(0.0, Math.min(1.0, input.detectionConfidence ?? 0.85));

      const draft: Omit<VisualElement, 'visualProvenanceHash'> = {
        elementId,
        frameId: frame.metadata.frameId,
        regionType: input.regionType,
        boundingBox: box,
        centerPoint,
        detectedText: sanitizedText,
        parentContainerId: input.parentContainerId?.trim(),
        detectionConfidence: Math.round(confidence * 10000) / 10000,
        isInteractive: Boolean(input.isInteractive),
      };

      const visualProvenanceHash = computeElementHash(draft);

      const finalElement: VisualElement = Object.freeze({
        ...draft,
        visualProvenanceHash,
      });

      VisionInputValidator.validateVisualElement(finalElement, frame.viewport);
      detected.push(finalElement);
    }

    // Deterministic sorting: top-to-bottom, left-to-right, then elementId
    // Sắp xếp tất định: từ trên xuống dưới, từ trái sang phải, sau đó theo elementId
    detected.sort((a, b) => {
      if (a.boundingBox.y !== b.boundingBox.y) {
        return a.boundingBox.y - b.boundingBox.y;
      }
      if (a.boundingBox.x !== b.boundingBox.x) {
        return a.boundingBox.x - b.boundingBox.x;
      }
      return a.elementId.localeCompare(b.elementId);
    });

    return Object.freeze(detected);
  }

  /**
   * EN: Sanitizes visible OCR/screen text against sensitive credentials and secrets.
   * VI: Khử trùng văn bản OCR/màn hình khỏi các thông tin nhạy cảm và bí mật.
   */
  private sanitizeText(raw: string): string {
    const s1 = this.sanitizer.sanitizeString(raw || '');
    const s2 = CloudEscalationSanitizer.sanitizeString(s1).sanitized;
    return s2
      .replace(/AKIA[0-9A-Z]{16}/g, '[REDACTED_AWS_KEY]')
      .replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, '[REDACTED_JWT]')
      .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED_API_KEY]')
      .replace(/sk-ant-[A-Za-z0-9_-]+/g, '[REDACTED_ANTHROPIC_KEY]')
      .replace(/ghp_[A-Za-z0-9]{30,}/g, '[REDACTED_GITHUB_TOKEN]')
      .replace(/(?:password|passwd|pwd)\s*=\s*[^\s,;]+/gi, '[REDACTED_PASSWORD]')
      .replace(/[A-Za-z]:\\\\BOW\\\\shopofbow[^\s"']*/gi, '[PROTECTED_WORKSPACE_PATH]')
      .replace(/shopofbow/gi, '[REDACTED_PROTECTED_WORKSPACE]')
      .trim();
  }
}

export const globalVisualElementDetectionEngine = new VisualElementDetectionEngine();
