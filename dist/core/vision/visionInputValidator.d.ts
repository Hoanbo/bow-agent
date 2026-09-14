import { type VisualFrame, type ScreenViewport, type BoundingBox, type VisualElement, type VisualGroundingQuery, type VisualSessionDocument } from './visionTypes.js';
export declare class VisionInputValidator {
    /**
     * EN: Validates a raw VisualFrame object fails-closed.
     * VI: Kiểm tra đối tượng VisualFrame đóng-khi-lỗi.
     */
    static validateFrame(frame: unknown): asserts frame is VisualFrame;
    /**
     * EN: Validates viewport dimensions, rejecting NaN, Infinity, negative or out-of-bound values.
     * VI: Xác thực kích thước viewport, từ chối NaN, vô cực, số âm hoặc ngoài giới hạn chuẩn.
     */
    static validateViewport(viewport: ScreenViewport): void;
    /**
     * EN: Validates bounding box against viewport boundaries with fails-closed enforcement.
     * VI: Kiểm tra hộp bao (bounding box) đối chiếu giới hạn viewport với cơ chế đóng-khi-lỗi.
     */
    static validateBoundingBox(box: BoundingBox, viewport: ScreenViewport): void;
    /**
     * EN: Validates a detected VisualElement structure.
     * VI: Xác thực cấu trúc VisualElement đã phát hiện.
     */
    static validateVisualElement(el: VisualElement, viewport?: ScreenViewport): void;
    /**
     * EN: Validates a VisualGroundingQuery input fails-closed.
     * VI: Kiểm tra truy vấn định vị thị giác đóng-khi-lỗi.
     */
    static validateGroundingQuery(query: unknown): asserts query is VisualGroundingQuery;
    /**
     * EN: Validates full VisualSessionDocument for persistence/recovery.
     * VI: Kiểm tra toàn diện tài liệu VisualSessionDocument để lưu trữ/phục hồi.
     */
    static validateSessionDocument(doc: unknown): asserts doc is VisualSessionDocument;
    /**
     * EN: Pure recursive defense against prototype pollution and Chain-of-Thought reasoning tokens.
     * VI: Phòng thủ đệ quy thuần túy ngăn ô nhiễm prototype và token suy luận CoT.
     */
    static assertNoPrototypePollutionOrCoT(val: unknown, path?: string): void;
}
