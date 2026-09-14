import { type VisualFrame, type VisualElement, type VisualRegionType } from './visionTypes.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
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
export declare class VisualElementDetectionEngine {
    private readonly sanitizer;
    private readonly userStopProvider;
    constructor(options?: DetectionEngineOptions);
    /**
     * EN: Ingests candidate visual element inputs, validates boundaries, computes deterministic IDs,
     *     and produces immutable VisualElement records.
     * VI: Tiếp nhận dữ liệu ứng viên phần tử thị giác, xác thực ranh giới, tính định danh tất định,
     *     và tạo các bản ghi VisualElement bất biến.
     */
    detectElements(frame: VisualFrame, candidates: readonly VisualElementInput[]): readonly VisualElement[];
    /**
     * EN: Sanitizes visible OCR/screen text against sensitive credentials and secrets.
     * VI: Khử trùng văn bản OCR/màn hình khỏi các thông tin nhạy cảm và bí mật.
     */
    private sanitizeText;
}
export declare const globalVisualElementDetectionEngine: VisualElementDetectionEngine;
