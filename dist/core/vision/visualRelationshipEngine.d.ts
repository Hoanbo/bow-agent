import { type VisualElement, type SpatialRelationshipDescriptor } from './visionTypes.js';
export interface RelationshipEngineOptions {
    readonly userStopProvider?: () => boolean;
    readonly nearDistanceThresholdPixels?: number;
}
export declare class VisualRelationshipEngine {
    private readonly userStopProvider;
    private readonly nearThreshold;
    constructor(options?: RelationshipEngineOptions);
    /**
     * EN: Analyzes pairwise spatial relationships between visual elements in a scene.
     * VI: Phân tích các mối quan hệ không gian theo cặp giữa các phần tử thị giác trong cảnh.
     */
    buildSpatialGraph(elements: readonly VisualElement[]): readonly SpatialRelationshipDescriptor[];
    /**
     * EN: Evaluates spatial relation from element A to element B.
     * VI: Đánh giá mối quan hệ không gian từ phần tử A tới phần tử B.
     */
    private evaluatePairwise;
    private makeDescriptor;
}
export declare const globalVisualRelationshipEngine: VisualRelationshipEngine;
