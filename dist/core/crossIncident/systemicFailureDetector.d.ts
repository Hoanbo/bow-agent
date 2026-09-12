import { type CrossIncidentCorrelationCluster, type SystemicFailurePattern } from './crossIncidentTypes.js';
export declare class SystemicFailureDetector {
    /**
     * Detects potential systemic failure patterns across correlated clusters.
     * Classifies strictly into allowed non-causal pattern categories.
     * Phát hiện các mẫu lỗi hệ thống tiềm ẩn qua các cụm tương quan.
     * Phân loại nghiêm ngặt vào các danh mục mẫu phi nhân quả được phép.
     */
    detectSystemicPatterns(clusters: readonly CrossIncidentCorrelationCluster[]): readonly SystemicFailurePattern[];
}
