import { type VisualElement, type VisualGroundingQuery, type VisualGroundingResult, type SpatialRelationshipDescriptor, type ScreenViewport } from './visionTypes.js';
export interface VisualGroundingEngineOptions {
    readonly userStopProvider?: () => boolean;
}
export declare class VisualGroundingEngine {
    private readonly userStopProvider;
    constructor(options?: VisualGroundingEngineOptions);
    /**
     * EN: Grounding pass: resolves query to a localized visual element. Fails closed on ambiguity.
     * VI: Lượt định vị: phân giải truy vấn thành phần tử thị giác. Đóng-khi-lỗi khi có sự mơ hồ.
     */
    groundReference(query: VisualGroundingQuery, elements: readonly VisualElement[], viewport?: ScreenViewport, spatialGraph?: readonly SpatialRelationshipDescriptor[]): VisualGroundingResult;
    private calculateCandidateScores;
    private makeResult;
}
export declare const globalVisualGroundingEngine: VisualGroundingEngine;
