export declare const VISION_SCHEMA_VERSION = 1;
export declare const VISION_BOUNDS: Readonly<{
    MAX_FRAME_BYTES: number;
    MAX_VIEWPORT_WIDTH: 7680;
    MAX_VIEWPORT_HEIGHT: 4320;
    MIN_VIEWPORT_WIDTH: 320;
    MIN_VIEWPORT_HEIGHT: 200;
    MAX_VISUAL_ELEMENTS: 200;
    MAX_TEXT_REGIONS: 100;
    MAX_RELATIONSHIPS: 500;
    MAX_GROUNDING_CANDIDATES: 10;
    MAX_PROCESSING_TIME_MS: 5000;
    DEFAULT_CONFIDENCE_THRESHOLD: 0.7;
    AMBIGUITY_DELTA_THRESHOLD: 0.15;
}>;
export declare class VisionError extends Error {
    readonly code: string;
    readonly details?: Readonly<Record<string, unknown>>;
    constructor(code: string, message: string, details?: Record<string, unknown>);
}
export declare class VisionValidationError extends VisionError {
    readonly validationErrors: readonly string[];
    constructor(message: string, errors?: string[], details?: Record<string, unknown>);
}
export declare class VisionCapacityError extends VisionError {
    constructor(current: number, max: number, entity?: string);
}
export declare class VisionSecurityError extends VisionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class VisionUserStopError extends VisionError {
    constructor(checkpoint: string);
}
export declare class CrossTenantVisionError extends VisionError {
    constructor(requestedTenant: string, activeTenant: string);
}
export declare class VisionConcurrencyError extends VisionError {
    readonly expectedVersion: number;
    readonly actualVersion: number;
    constructor(expectedVersion: number, actualVersion: number, details?: Record<string, unknown>);
}
export declare class VisionIntegrityError extends VisionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class VisionGroundingError extends VisionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class VisionPersistenceError extends VisionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export declare class VisionPromptInjectionError extends VisionError {
    constructor(message: string, details?: Record<string, unknown>);
}
export interface ScreenViewport {
    readonly displayId: string;
    readonly width: number;
    readonly height: number;
    readonly scaleFactor: number;
    readonly colorDepth: number;
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
    readonly frameBuffer: Uint8Array | string;
    readonly frameHash: string;
}
export type VisualRegionType = 'BUTTON' | 'INPUT_FIELD' | 'TEXT_BLOCK' | 'ICON' | 'CHECKBOX' | 'RADIO' | 'DROPDOWN' | 'MODAL_DIALOG' | 'CONTAINER' | 'IMAGE' | 'MENU_ITEM' | 'UNKNOWN';
export interface BoundingBox {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
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
    readonly elementId: string;
    readonly frameId: string;
    readonly regionType: VisualRegionType;
    readonly boundingBox: BoundingBox;
    readonly centerPoint: Point;
    readonly detectedText?: string;
    readonly parentContainerId?: string;
    readonly detectionConfidence: number;
    readonly isInteractive: boolean;
    readonly visualProvenanceHash: string;
}
export type SpatialRelationshipType = 'LEFT_OF' | 'RIGHT_OF' | 'ABOVE' | 'BELOW' | 'CONTAINS' | 'INSIDE' | 'OVERLAPS' | 'NEAR';
export interface SpatialRelationshipDescriptor {
    readonly sourceElementId: string;
    readonly targetElementId: string;
    readonly relationshipType: SpatialRelationshipType;
    readonly distancePixels: number;
    readonly confidence: number;
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
    readonly minConfidenceThreshold?: number;
}
export interface VisualGroundingCandidate {
    readonly element: VisualElement;
    readonly semanticScore: number;
    readonly spatialScore: number;
    readonly ocrClarityScore: number;
    readonly overallConfidence: number;
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
export interface IOcrProvider {
    recognizeText(frame: VisualFrame, boundingBox?: BoundingBox): Promise<{
        text: string;
        confidence: number;
        textRegions: readonly {
            box: BoundingBox;
            text: string;
            confidence: number;
        }[];
    }>;
}
/**
 * Computes deterministic element ID: el_<sha256(frameId:x:y:w:h)[0..15]>
 * EN: Ensures stable identity across evaluation passes without non-deterministic random IDs.
 * VI: Đảm bảo định danh phần tử bất biến và có tính tái lập giữa các lượt xử lý.
 */
export declare function computeDeterministicElementId(frameId: string, x: number, y: number, width: number, height: number): string;
/**
 * Computes deterministic SHA-256 hash of a raw frame buffer.
 * Tính toán mã băm SHA-256 tất định cho bộ đệm khung hình thô.
 */
export declare function computeFrameHash(buffer: Buffer): string;
/**
 * Computes deterministic SHA-256 hash of a VisualElement.
 */
export declare function computeElementHash(el: Omit<VisualElement, 'visualProvenanceHash'>): string;
/**
 * Computes deterministic SHA-256 hash of a VisualGroundingResult.
 */
export declare function computeGroundingHash(res: Omit<VisualGroundingResult, 'provenanceHash'>): string;
/**
 * Computes deterministic SHA-256 hash of a VisualObservation.
 */
export declare function computeObservationHash(obs: Omit<VisualObservation, 'provenanceHash'>): string;
/**
 * Computes deterministic SHA-256 provenance hash for VisualSessionDocument.
 */
export declare function computeSessionDocumentHash(doc: Omit<VisualSessionDocument, 'provenanceHash'>): string;
