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
    MAX_VIEWPORT_WIDTH: 7680, // 8K horizontal ceiling (Trần chiều ngang 8K)
    MAX_VIEWPORT_HEIGHT: 4320, // 8K vertical ceiling (Trần chiều dọc 8K)
    MIN_VIEWPORT_WIDTH: 320, // Minimum resolution limit (Giới hạn độ phân giải tối thiểu)
    MIN_VIEWPORT_HEIGHT: 200, // Minimum resolution limit (Giới hạn độ phân giải tối thiểu)
    MAX_VISUAL_ELEMENTS: 200, // Max elements detected per scene (Số phần tử tối đa phát hiện mỗi cảnh)
    MAX_TEXT_REGIONS: 100, // Max OCR text regions per scene (Số vùng văn bản OCR tối đa)
    MAX_RELATIONSHIPS: 500, // Max spatial graph edges (Số cạnh đồ thị không gian tối đa)
    MAX_GROUNDING_CANDIDATES: 10, // Max candidate elements ranked (Số ứng viên tối đa xếp hạng)
    MAX_PROCESSING_TIME_MS: 5000, // Hard timeout for perception pass (Thời gian xử lý tối đa)
    DEFAULT_CONFIDENCE_THRESHOLD: 0.70, // Minimum grounding confidence (Ngưỡng tin cậy tối thiểu)
    AMBIGUITY_DELTA_THRESHOLD: 0.15, // Min margin between top-1 and top-2 (Khoảng cách an toàn giữa top 1 và 2)
});
// ============================================================================
// 2. ERROR TAXONOMY (PHÂN LOẠI LỖI THỊ GIÁC)
// ============================================================================
export class VisionError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.name = 'VisionError';
        this.code = code;
        this.details = details ? Object.freeze({ ...details }) : undefined;
    }
}
export class VisionValidationError extends VisionError {
    validationErrors;
    constructor(message, errors = [], details) {
        super('VISION_VALIDATION_ERROR', `${message}: ${errors.join('; ')}`, { errors, ...details });
        this.name = 'VisionValidationError';
        this.validationErrors = Object.freeze([...errors]);
    }
}
export class VisionCapacityError extends VisionError {
    constructor(current, max, entity = 'entities') {
        super('VISION_CAPACITY_ERROR', `Capacity exceeded for ${entity}: current ${current}, maximum allowed is ${max}`, {
            current,
            max,
            entity,
        });
        this.name = 'VisionCapacityError';
    }
}
export class VisionSecurityError extends VisionError {
    constructor(message, details) {
        super('VISION_SECURITY_ERROR', message, details);
        this.name = 'VisionSecurityError';
    }
}
export class VisionUserStopError extends VisionError {
    constructor(checkpoint) {
        super('VISION_USER_STOP_ERROR', `Vision mutation preempted at checkpoint '${checkpoint}' because USER_STOP is active`, {
            checkpoint,
        });
        this.name = 'VisionUserStopError';
    }
}
export class CrossTenantVisionError extends VisionError {
    constructor(requestedTenant, activeTenant) {
        super('CROSS_TENANT_VISION_ERROR', `Security violation: cross-tenant vision access blocked between requested '${requestedTenant}' and active '${activeTenant}'`, { requestedTenant, activeTenant });
        this.name = 'CrossTenantVisionError';
    }
}
export class VisionConcurrencyError extends VisionError {
    expectedVersion;
    actualVersion;
    constructor(expectedVersion, actualVersion, details) {
        super('VISION_CONCURRENCY_ERROR', `Optimistic concurrency violation: expected version ${expectedVersion} but found ${actualVersion}`, { expectedVersion, actualVersion, ...details });
        this.name = 'VisionConcurrencyError';
        this.expectedVersion = expectedVersion;
        this.actualVersion = actualVersion;
    }
}
export class VisionIntegrityError extends VisionError {
    constructor(message, details) {
        super('VISION_INTEGRITY_ERROR', message, details);
        this.name = 'VisionIntegrityError';
    }
}
export class VisionGroundingError extends VisionError {
    constructor(message, details) {
        super('VISION_GROUNDING_ERROR', message, details);
        this.name = 'VisionGroundingError';
    }
}
export class VisionPersistenceError extends VisionError {
    constructor(message, details) {
        super('VISION_PERSISTENCE_ERROR', message, details);
        this.name = 'VisionPersistenceError';
    }
}
export class VisionPromptInjectionError extends VisionError {
    constructor(message, details) {
        super('VISION_PROMPT_INJECTION_ERROR', message, details);
        this.name = 'VisionPromptInjectionError';
    }
}
// ============================================================================
// 4. CANONICAL PROVENANCE HASHER FUNCTIONS (CÁC HÀM TẠO MÃ BĂM NGUỒN GỐC)
// ============================================================================
/**
 * Computes deterministic element ID: el_<sha256(frameId:x:y:w:h)[0..15]>
 * EN: Ensures stable identity across evaluation passes without non-deterministic random IDs.
 * VI: Đảm bảo định danh phần tử bất biến và có tính tái lập giữa các lượt xử lý.
 */
export function computeDeterministicElementId(frameId, x, y, width, height) {
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
export function computeFrameHash(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}
/**
 * Computes deterministic SHA-256 hash of a VisualElement.
 */
export function computeElementHash(el) {
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
export function computeGroundingHash(res) {
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
export function computeObservationHash(obs) {
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
export function computeSessionDocumentHash(doc) {
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
