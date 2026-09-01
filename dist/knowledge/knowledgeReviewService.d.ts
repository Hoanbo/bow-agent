import { type DeduplicatedKnowledgeGap } from './knowledgeGapDetector.js';
import type { KnowledgePriority, FaqQualityMetrics, FaqEditHistoryItem } from '../monitoring/analyticsTypes.js';
export type KnowledgeGapStatus = 'new' | 'reviewing' | 'approved' | 'rejected' | 'merged';
export interface ReviewableKnowledgeGap extends Omit<DeduplicatedKnowledgeGap, 'status'> {
    id: string;
    status: KnowledgeGapStatus;
    priority: KnowledgePriority;
    priorityScore: number;
    priorityReasons: string[];
    reviewNotes?: string;
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    convertedFaqId?: string | null;
    mergedTargetId?: string | null;
}
export interface KnowledgeSuggestionOutput {
    question: string;
    answer: string;
    category: 'policy' | 'technical' | 'support' | 'troubleshooting' | 'general' | 'other';
    relatedQuestions: string[];
    confidence: 'high' | 'medium' | 'low';
    isFallback?: boolean;
}
export interface SimilarFaqMatch {
    faq: {
        id: string;
        question: string;
        answer: string;
        sort_order?: number;
        created_at?: string;
    };
    similarity: number;
}
/**
 * Tính toán độ tương đồng giữa hai câu hỏi bằng Jaccard Similarity trên tập từ chuẩn hóa
 */
export declare function calculateQuestionSimilarity(q1: string, q2: string): number;
/**
 * 1. Tính toán Knowledge Gap Priority dựa trên tần suất, tính mới, danh mục và độ trễ
 */
export declare function calculateKnowledgeGapPriority(gap: {
    occurrenceCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    category: string;
}): {
    priority: KnowledgePriority;
    priorityScore: number;
    priorityReasons: string[];
};
/**
 * 2. Tìm các FAQ tương tự đã tồn tại trong Catalog để chống trùng lặp
 */
export declare function findSimilarFaqs(question: string, providedFaqs?: Array<{
    id: string;
    question: string;
    answer: string;
    created_at?: string;
    sort_order?: number;
}>): Promise<SimilarFaqMatch[]>;
/**
 * 3. Lấy danh sách Knowledge Gaps phục vụ Admin Hub (Tích hợp Priority & Lifecycle)
 */
export declare function getKnowledgeGaps(filters?: {
    status?: KnowledgeGapStatus | 'all';
    priority?: KnowledgePriority | 'all';
    category?: string;
    search?: string;
    sortBy?: 'frequency' | 'priority' | 'newest' | 'oldest' | 'updated';
}): Promise<ReviewableKnowledgeGap[]>;
/**
 * 4. Đánh dấu Knowledge Gap chuyển sang trạng thái "reviewing"
 */
export declare function markKnowledgeGapReviewing(gapId: string, adminUserId: string): Promise<boolean>;
/**
 * 5. Từ chối Knowledge Gap (Chuyển sang "rejected")
 */
export declare function rejectKnowledgeGap(gapId: string, reason: string, adminUserId: string): Promise<boolean>;
/**
 * 6. Smart Merge Knowledge Gaps (Gộp các biến thể câu hỏi vào Gap chính)
 */
export declare function smartMergeKnowledgeGaps(targetGapId: string, sourceGapIds: string[], adminUserId: string, reason?: string): Promise<{
    success: boolean;
    mergedCount: number;
    error?: string;
}>;
/**
 * Alias tương thích ngược với mergeKnowledgeGaps
 */
export declare function mergeKnowledgeGaps(targetId: string, sourceIds: string[], adminUserId: string): Promise<boolean>;
/**
 * 7. AI Knowledge Suggestion (Đề xuất tiêu đề & câu trả lời an toàn, trung lập, 0 hallucinate)
 */
export declare function generateKnowledgeSuggestion(gap: {
    originalQuestion: string;
    normalizedQuestion: string;
    category?: 'policy' | 'technical' | 'support' | 'troubleshooting' | 'general' | 'other';
}): Promise<KnowledgeSuggestionOutput>;
/**
 * 8. Phê duyệt Knowledge Gap và tạo FAQ chính thức trong public.faqs
 */
export declare function approveKnowledgeGap(gapId: string, faqData: {
    question: string;
    answer: string;
    category?: string;
}, adminUserId: string): Promise<{
    success: boolean;
    faqId?: string;
    error?: string;
    isDuplicate?: boolean;
}>;
/**
 * 9. Đánh giá chất lượng FAQ & Phát hiện FAQ lỗi thời (Quality Score & Stale Detection)
 */
export declare function calculateFaqQualityAndStaleMetrics(providedFaqs?: Array<{
    id: string;
    question: string;
    answer: string;
    sort_order?: number;
    created_at?: string;
}>, providedEvents?: any[], providedGaps?: ReviewableKnowledgeGap[]): Promise<FaqQualityMetrics[]>;
/**
 * 10. Chỉnh sửa FAQ có lưu vết lịch sử (FAQ Edit With Version History)
 */
export declare function editFaqWithVersionHistory(faqId: string, patch: {
    question: string;
    answer: string;
    sort_order?: number;
}, reason: string, adminUserId: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * 11. Lấy lịch sử chỉnh sửa FAQ
 */
export declare function getFaqEditHistory(faqId?: string): Promise<FaqEditHistoryItem[]>;
