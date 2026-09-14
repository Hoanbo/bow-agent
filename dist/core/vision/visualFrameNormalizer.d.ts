import { type ScreenViewport, type BoundingBox, type Point } from './visionTypes.js';
export declare class VisualFrameNormalizer {
    /**
     * EN: Normalizes pixel coordinates to [0.0, 1.0] viewport space.
     * VI: Chuẩn hóa tọa độ pixel sang không gian viewport [0.0, 1.0].
     */
    static normalizeCoordinates(x: number, y: number, width: number, height: number, viewport: ScreenViewport): BoundingBox;
    /**
     * EN: Computes deterministic centroid point for a bounding box.
     * VI: Tính điểm trọng tâm (centroid) tất định cho một hộp bao.
     */
    static computeCentroid(box: BoundingBox, viewport: ScreenViewport): Point;
    /**
     * EN: Converts resolution-invariant normalized coordinates to target viewport pixel coordinates.
     * VI: Chuyển đổi tọa độ chuẩn hóa bất biến theo độ phân giải sang pixel của viewport đích.
     */
    static denormalizeToViewport(normX: number, normY: number, normWidth: number, normHeight: number, targetViewport: ScreenViewport): BoundingBox;
}
