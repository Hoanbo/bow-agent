import { type BoundingBox, type Point, type VisualElement } from './visionTypes.js';
export declare class VisualLocalizationEngine {
    /**
     * EN: Tests whether containerBox completely contains childBox.
     * VI: Kiểm tra xem containerBox có bao bọc hoàn toàn childBox hay không.
     */
    static contains(containerBox: BoundingBox, childBox: BoundingBox): boolean;
    /**
     * EN: Tests whether two bounding boxes overlap/intersect.
     * VI: Kiểm tra xem hai hộp bao có giao nhau/chồng lấn không.
     */
    static overlaps(boxA: BoundingBox, boxB: BoundingBox): boolean;
    /**
     * EN: Calculates the intersection area in pixels between two boxes.
     * VI: Tính diện tích giao nhau theo pixel giữa hai hộp bao.
     */
    static intersectionArea(boxA: BoundingBox, boxB: BoundingBox): number;
    /**
     * EN: Calculates Euclidean distance between the center points of two elements or bounding boxes.
     * VI: Tính khoảng cách Euclid giữa điểm tâm của hai phần tử hoặc hộp bao.
     */
    static distance(pointA: Point | BoundingBox, pointB: Point | BoundingBox): number;
    /**
     * EN: Tests whether a specific coordinate point lies inside a bounding box.
     * VI: Kiểm tra xem một tọa độ điểm có nằm bên trong hộp bao không.
     */
    static isPointInside(box: BoundingBox, x: number, y: number): boolean;
    /**
     * EN: Finds the smallest enclosing container element for a given target element.
     * VI: Tìm phần tử vùng chứa bao bọc nhỏ nhất cho một phần tử mục tiêu.
     */
    static findEnclosingContainer(target: VisualElement, candidates: readonly VisualElement[]): VisualElement | null;
    /**
     * EN: Filters visual elements that intersect or lie within a search region.
     * VI: Lọc các phần tử thị giác giao cắt hoặc nằm trong vùng tìm kiếm.
     */
    static filterByRegion(elements: readonly VisualElement[], region: BoundingBox): readonly VisualElement[];
}
