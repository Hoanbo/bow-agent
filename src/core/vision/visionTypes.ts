// src/core/vision/visionTypes.ts
// BOWCON V4.0 — MS-1.5.06: VISION TYPES, DOMAIN ONTOLOGY & ERROR HIERARCHY
// Component 1028 — REAL
//
// EN: Invariants:
//     PIXEL DATA != VISUAL OBSERVATION != SEMANTIC INTERPRETATION != AUTHORITATIVE STATE != EXECUTION
//     COGNITION != AUTHORITY
//     VISION != EXECUTION
//     GROUNDING != AUTHORIZATION
//     VISUAL CONFIDENCE != PERMISSION
//     VISION OBSERVATION != GOAL COMPLETION PROOF
//     SCREEN TEXT != TRUSTED INSTRUCTION
//     USER_STOP > ALL MUTATION
//     ZERO_DIRECT_TOOL_EXECUTION == TRUE
//
// VI: Các bất biến bắt buộc:
//     DỮ LIỆU ĐIỂM ẢNH != QUAN SÁT THỊ GIÁC != DIỄN GIẢI NGỮ NGHĨA != TRẠNG THÁI CHÍNH THỨC != THỰC THI
//     NHẬN THỨC != THẨM QUYỀN
//     THỊ GIÁC != THỰC THI
//     ĐỊNH VỊ (GROUNDING) != ỦY QUYỀN
//     ĐỘ TIN CẬY THỊ GIÁC != SỰ CHO PHÉP
//     QUAN SÁT THỊ GIÁC != BẰNG CHỨNG HOÀN THÀNH MỤC TIÊU
//     VĂN BẢN TRÊN MÀN HÌNH != CHỈ THỊ ĐÁNG TIN CẬY
//     USER_STOP > MỌI ĐỘT BIẾN
//     KHÔNG THỰC THI CÔNG CỤ TRỰC TIẾP == ĐÚNG

import crypto from 'node:crypto';

// ============================================================================
// 1. BOUNDED CONSTANTS (CÁC HẰNG SỐ GIỚI HẠN)
// ============================================================================

export const VISION_SCHEMA_VERSION = 1;

export const VISION_BOUNDS = Object.freeze({
  MAX_FRAME_BYTES: 10 * 1024 * 1024, // 10 MB ceiling for frame buffers (Trần 10MB cho bộ đệm khung hình)
  MAX_VIEWPORT_WIDTH: 7680,          // 8K horizontal ceiling (Trần chiều ngang 8K)
  MAX_VIEWPORT_HEIGHT: 4320,         // 8K vertical ceiling (Trần chiều dọc 8K)
  MIN_VIEWPORT_WIDTH: 320,           // Minimum resolution limit (Giới hạn độ phân giải tối thiểu)
  MIN_VIEWPORT_HEIGHT: 200,          // Minimum resolution limit (Giới hạn độ phân giải tối thiểu)
  MAX_VISUAL_ELEMENTS: 200,          // Max elements detected per scene (Số phần tử tối đa phát hiện mỗi cảnh)
  MAX_TEXT_REGIONS: 100,             // Max OCR text regions per scene (Số vùng văn bản OCR tối đa)
  MAX_RELATIONSHIPS: 500,            // Max spatial graph edges (Số cạnh đồ thị không gian tối đa)
  MAX_GROUNDING_CANDIDATES: 10,      // Max candidate elements ranked (Số ứng viên tối đa xếp hạng)
  MAX_PROCESSING_TIME_MS: 5000,      // Hard timeout for perception pass (Thời gian xử lý tối đa)
  DEFAULT_CONFIDENCE_THRESHOLD: 0.70,// Minimum grounding confidence (Ngưỡng tin cậy tối thiểu)
  AMBIGUITY_DELTA_THRESHOLD: 0.15,   // Min margin between top-1 and top-2 (Khoảng cách an toàn giữa top 1 và 2)
});

// ============================================================================
// 2. ERROR TAXONOMY (PHÂN LOẠI LỖI THỊ GIÁC)
// ============================================================================

export class VisionError extends Error {
  public readonly code: string;
  public readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`[${code}] ${message}`);
    this.name = 'VisionError';
    this.code = code;
    this.details = details ? Object.freeze({ ...details }) : undefined;
  }
}

export class VisionValidationError extends VisionError {
  public readonly validationErrors: readonly string[];
  constructor(message: string, errors: string[] = [], details?: Record<string, unknown>) {
    super('VISION_VALIDATION_ERROR', `${message}: ${errors.join('; ')}`, { errors, ...details });
    this.name = 'VisionValidationError';
    this.validationErrors = Object.freeze([...errors]);
  }
}

export class VisionCapacityError extends VisionError {
  constructor(current: number, max: number, entity = 'entities') {
    super('VISION_CAPACITY_ERROR', `Capacity exceeded for ${entity}: current ${current}, maximum allowed is ${max}`, {
      current,
      max,
      entity,
    });
    this.name = 'VisionCapacityError';
  }
}

export class VisionSecurityError extends VisionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VISION_SECURITY_ERROR', message, details);
    this.name = 'VisionSecurityError';
  }
}

export class VisionUserStopError extends VisionError {
  constructor(checkpoint: string) {
    super('VISION_USER_STOP_ERROR', `Vision mutation preempted at checkpoint '${checkpoint}' because USER_STOP is active`, {
      checkpoint,
    });
    this.name = 'VisionUserStopError';
  }
}

export class CrossTenantVisionError extends VisionError {
  constructor(requestedTenant: string, activeTenant: string) {
    super(
      'CROSS_TENANT_VISION_ERROR',
      `Security violation: cross-tenant vision access blocked between requested '${requestedTenant}' and active '${activeTenant}'`,
      { requestedTenant, activeTenant }
    );
    this.name = 'CrossTenantVisionError';
  }
}

export class VisionConcurrencyError extends VisionError {
  public readonly expectedVersion: number;
  public readonly actualVersion: number;

  constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>) {
    super(
      'VISION_CONCURRENCY_ERROR',
      `Optimistic concurrency violation: expected version ${expectedVersion} but found ${actualVersion}`,
      { expectedVersion, actualVersion, ...details }
    );
    this.name = 'VisionConcurrencyError';
    this.expectedVersion = expectedVersion;
    this.actualVersion = actualVersion;
  }
}

export class VisionIntegrityError extends VisionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VISION_INTEGRITY_ERROR', message, details);
    this.name = 'VisionIntegrityError';
  }
}

export class VisionGroundingError extends VisionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VISION_GROUNDING_ERROR', message, details);
    this.name = 'VisionGroundingError';
  }
}

export class VisionPersistenceError extends VisionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VISION_PERSISTENCE_ERROR', message, details);
    this.name = 'VisionPersistenceError';
  }
}

export class VisionPromptInjectionError extends VisionError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VISION_PROMPT_INJECTION_ERROR', message, details);
    this.name = 'VisionPromptInjectionError';
  }
}

// ============================================================================
// 3. DOMAIN ONTOLOGY (HỆ THỐNG KIỂU THỊ GIÁC CHUẨN)
// ============================================================================

export interface ScreenViewport {
  readonly displayId: string;
  readonly width: number;           // Integer width in pixels (Chiều rộng theo pixel)
  readonly height: number;          // Integer height in pixels (Chiều cao theo pixel)
  readonly scaleFactor: number;     // DPI scaling, e.g. 1.0, 1.25, 1.5, 2.0 (Tỷ lệ thu phóng màn hình)
  readonly colorDepth: number;      // Bits per pixel, e.g. 24, 32 (Độ sâu màu)
}

export interface VisualFrameMetadata {
  readonly frameId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly captureTimestamp: string;
  readonly sourceDeviceId: string;
  readonly captureMethod: 'PASSIVE_BUFFER' | 'HOST_FEED' | 'FILE_IMPORT';
  readonly contentLengthBytes: number;
  readonly format: 'PNG' | 'JPEG' | 'WEBP' | 'RAW_RGBA';
}

export interface VisualFrame {
  readonly metadata: VisualFrameMetadata;
  readonly viewport: ScreenViewport;
  readonly frameBuffer: Uint8Array | string; // Buffer or Base64 representation (Bộ đệm dữ liệu)
  readonly frameHash: string;                // SHA-256 over raw pixel bytes (Mã băm SHA-256 điểm ảnh)
}

export type VisualRegionType =
  | 'BUTTON'
  | 'INPUT_FIELD'
  | 'TEXT_BLOCK'
  | 'ICON'
  | 'CHECKBOX'
  | 'RADIO'
  | 'DROPDOWN'
  | 'MODAL_DIALOG'
  | 'CONTAINER'
  | 'IMAGE'
  | 'MENU_ITEM'
  | 'UNKNOWN';

export interface BoundingBox {
  // Integer pixel coordinates relative to top-left origin (Tọa độ pixel gốc trên-trái)
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;

  // Normalized [0.0, 1.0] coordinates for resolution-invariant reasoning (Tọa độ chuẩn hóa [0,1])
  readonly normX: number;
  readonly normY: number;
  readonly normWidth: number;
  readonly normHeight: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
  readonly normX: number;
  readonly normY: number;
}

export interface VisualElement {
  readonly elementId: string;              // Deterministic el_<sha256(frameId:x:y:w:h)[0..15]>
  readonly frameId: string;
  readonly regionType: VisualRegionType;
  readonly boundingBox: BoundingBox;
  readonly centerPoint: Point;
  readonly detectedText?: string;          // Sanitized untrusted visible text (Văn bản nhìn thấy đã khử trùng)
  readonly parentContainerId?: string;     // Hierarchical nesting container (Vùng chứa cha)
  readonly detectionConfidence: number;    // Bounded in [0.0, 1.0] (Độ tin cậy phát hiện)
  readonly isInteractive: boolean;         // Advisory UI element attribute (Thuộc tính tương tác khuyến nghị)
  readonly visualProvenanceHash: string;   // SHA-256 over element state (Băm chứng minh nguồn gốc)
}

export type SpatialRelationshipType =
  | 'LEFT_OF'
  | 'RIGHT_OF'
  | 'ABOVE'
  | 'BELOW'
  | 'CONTAINS'
  | 'INSIDE'
  | 'OVERLAPS'
  | 'NEAR';

export interface SpatialRelationshipDescriptor {
  readonly sourceElementId: string;
  readonly targetElementId: string;
  readonly relationshipType: SpatialRelationshipType;
  readonly distancePixels: number;
  readonly confidence: number;             // Bounded in [0.0, 1.0]
}

export interface VisualObservation {
  readonly observationId: string;
  readonly frameId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly elements: readonly VisualElement[];
  readonly relationships: readonly SpatialRelationshipDescriptor[];
  readonly observedAt: string;
  readonly provenanceHash: string;
}

export interface VisualGroundingQuery {
  readonly queryId: string;
  readonly tenantId: string;
  readonly sessionId: string;
  readonly frameId: string;
  readonly referenceText: string;
  readonly expectedRegionType?: VisualRegionType;
  readonly spatialHints?: readonly SpatialRelationshipDescriptor[];
  readonly minConfidenceThreshold?: number; // Defaults to 0.70
}

export interface VisualGroundingCandidate {
  readonly element: VisualElement;
  readonly semanticScore: number;    // Neural/lexical similarity [0.0, 1.0] (Điểm tương đồng ngữ nghĩa)
  readonly spatialScore: number;     // Spatial constraint satisfaction [0.0, 1.0] (Điểm thỏa mãn không gian)
  readonly ocrClarityScore: number;  // Text readability & match [0.0, 1.0] (Độ rõ nét văn bản)
  readonly overallConfidence: number;// Deterministic composite [0.0, 1.0] (Độ tin cậy tổng hợp)
  readonly rationale: string;
}

export type VisualGroundingStatus = 'GROUNDED' | 'AMBIGUOUS' | 'NOT_FOUND' | 'REJECTED';

export interface VisualGroundingResult {
  readonly queryId: string;
  readonly frameId: string;
  readonly status: VisualGroundingStatus;
  readonly targetElement: VisualElement | null;
  readonly rankedCandidates: readonly VisualGroundingCandidate[];
  readonly requiresHumanClarification: boolean;
  readonly groundedAt: string;
  readonly provenanceHash: string;
}

export interface VisualSecurityAlert {
  readonly alertId: string;
  readonly frameId: string;
  readonly severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  readonly alertType: 'PROMPT_INJECTION_SUSPECTED' | 'CREDENTIAL_DETECTED' | 'EXCESSIVE_DIMENSIONS';
  readonly details: string;
  readonly detectedAt: string;
}

export interface VisualSessionDocument {
  readonly schemaVersion: number;
  readonly sessionId: string;
  readonly tenantId: string;
  readonly sessionVersion: number;
  readonly observations: readonly VisualObservation[];
  readonly groundingResults: readonly VisualGroundingResult[];
  readonly securityAlerts: readonly VisualSecurityAlert[];
  readonly provenanceHash: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly recoveredFromBackup?: boolean;
}

// Advisory OCR Provider Interface (Giao diện dịch vụ OCR khuyến nghị)
export interface IOcrProvider {
  recognizeText(frame: VisualFrame, boundingBox?: BoundingBox): Promise<{
    text: string;
    confidence: number;
    textRegions: readonly { box: BoundingBox; text: string; confidence: number }[];
  }>;
}

// ============================================================================
// 4. CANONICAL PROVENANCE HASHER FUNCTIONS (CÁC HÀM TẠO MÃ BĂM NGUỒN GỐC)
// ============================================================================

/**
 * Computes deterministic element ID: el_<sha256(frameId:x:y:w:h)[0..15]>
 * EN: Ensures stable identity across evaluation passes without non-deterministic random IDs.
 * VI: Đảm bảo định danh phần tử bất biến và có tính tái lập giữa các lượt xử lý.
 */
export function computeDeterministicElementId(
  frameId: string,
  x: number,
  y: number,
  width: number,
  height: number
): string {
  const hash = crypto
    .createHash('sha256')
    .update(`${frameId.trim()}:${Math.round(x)}:${Math.round(y)}:${Math.round(width)}:${Math.round(height)}`, 'utf8')
    .digest('hex')
    .slice(0, 16);
  return `el_${hash}`;
}

/**
 * Computes deterministic SHA-256 hash of a raw frame buffer.
 * Tính toán mã băm SHA-256 tất định cho bộ đệm khung hình thô.
 */
export function computeFrameHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Computes deterministic SHA-256 hash of a VisualElement.
 */
export function computeElementHash(
  el: Omit<VisualElement, 'visualProvenanceHash'>
): string {
  const material = {
    elementId: el.elementId,
    frameId: el.frameId,
    regionType: el.regionType,
    boundingBox: {
      x: el.boundingBox.x,
      y: el.boundingBox.y,
      width: el.boundingBox.width,
      height: el.boundingBox.height,
    },
    detectedText: el.detectedText ?? null,
    parentContainerId: el.parentContainerId ?? null,
    detectionConfidence: el.detectionConfidence,
    isInteractive: el.isInteractive,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}

/**
 * Computes deterministic SHA-256 hash of a VisualGroundingResult.
 */
export function computeGroundingHash(
  res: Omit<VisualGroundingResult, 'provenanceHash'>
): string {
  const material = {
    queryId: res.queryId,
    frameId: res.frameId,
    status: res.status,
    targetElementId: res.targetElement?.elementId ?? null,
    candidateIds: res.rankedCandidates.map((c) => c.element.elementId),
    requiresHumanClarification: res.requiresHumanClarification,
    groundedAt: res.groundedAt,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}

/**
 * Computes deterministic SHA-256 hash of a VisualObservation.
 */
export function computeObservationHash(
  obs: Omit<VisualObservation, 'provenanceHash'>
): string {
  const material = {
    observationId: obs.observationId,
    frameId: obs.frameId,
    tenantId: obs.tenantId,
    sessionId: obs.sessionId,
    elementHashes: obs.elements.map((e) => `${e.elementId}:${e.visualProvenanceHash}`).sort(),
    relationships: obs.relationships.map((r) => `${r.sourceElementId}:${r.relationshipType}:${r.targetElementId}`).sort(),
    observedAt: obs.observedAt,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}

/**
 * Computes deterministic SHA-256 provenance hash for VisualSessionDocument.
 */
export function computeSessionDocumentHash(
  doc: Omit<VisualSessionDocument, 'provenanceHash'>
): string {
  const material = {
    schemaVersion: doc.schemaVersion,
    sessionId: doc.sessionId,
    tenantId: doc.tenantId,
    sessionVersion: doc.sessionVersion,
    observationHashes: doc.observations.map((o) => o.provenanceHash).sort(),
    groundingHashes: doc.groundingResults.map((g) => g.provenanceHash).sort(),
    alertIds: doc.securityAlerts.map((a) => a.alertId).sort(),
    updatedAt: doc.updatedAt,
  };
  return crypto.createHash('sha256').update(JSON.stringify(material), 'utf8').digest('hex');
}
