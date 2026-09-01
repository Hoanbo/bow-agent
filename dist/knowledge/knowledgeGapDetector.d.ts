import type { KnowledgeGapClassification, KnowledgeGapMetadata, ResponseSource } from '../monitoring/analyticsTypes.js';
export type { KnowledgeGapClassification, KnowledgeGapMetadata, ResponseSource };
export interface KnowledgeGapCandidate {
    id?: string;
    originalQuestion: string;
    normalizedQuestion: string;
    category: 'policy' | 'technical' | 'support' | 'troubleshooting' | 'general' | 'other';
    classification: KnowledgeGapClassification;
    confidence: number;
    source: ResponseSource;
    timestamp: string;
    sessionId?: string;
    userId?: string | null;
    sampleQueries?: string[];
}
export interface DeduplicatedKnowledgeGap {
    normalizedQuestion: string;
    canonicalQuestion: string;
    category: 'policy' | 'technical' | 'support' | 'troubleshooting' | 'general' | 'other';
    classification: KnowledgeGapClassification;
    occurrenceCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    confidence: number;
    source: ResponseSource;
    sampleQueries: string[];
    status: 'PENDING' | 'REVIEWED' | 'CONVERTED_TO_FAQ' | 'DISMISSED';
}
/**
 * 1. Chuẩn hóa câu hỏi tri thức (Knowledge Question Normalization)
 * Tận dụng normalizeText để đảm bảo an toàn tuyệt đối trước mọi lỗi font/bảng mã NFD/NFC,
 * loại bỏ từ phụ trợ chào hỏi và dấu câu, tạo canonical key cho deduplication.
 */
export declare function normalizeKnowledgeQuestion(rawText: string): string;
/**
 * 2. Phân loại câu hỏi tri thức (Knowledge Gap Classification)
 * Phân tách rõ ràng giữa KNOWLEDGE_GAP, PRODUCT_DEMAND, TRANSACTIONAL, GREETING, SUPPORTED_FAQ, UNSUPPORTED, SECURITY_SENSITIVE.
 */
export declare function classifyKnowledgeGap(rawText: string, intent?: string | null, searchResultsCount?: number, faqResultsCount?: number, hasNegativePolicyMatch?: boolean): KnowledgeGapClassification;
/**
 * 3. Kiểm tra xem câu hỏi có phải là ứng viên Knowledge Gap không
 */
export declare function isKnowledgeGapCandidate(rawText: string, intent?: string | null, searchResultsCount?: number, faqResultsCount?: number): boolean;
/**
 * 4. Trích xuất Category chi tiết của Knowledge Gap
 */
export declare function inferKnowledgeGapCategory(normalizedText: string): 'policy' | 'technical' | 'support' | 'troubleshooting' | 'general' | 'other';
/**
 * 5. Tạo Metadata hoàn chỉnh cho Knowledge Gap
 */
export declare function extractKnowledgeGapMetadata(rawText: string, intent?: string | null, source?: ResponseSource, searchResultsCount?: number, faqResultsCount?: number): KnowledgeGapMetadata | null;
/**
 * 6. Thuật toán Deduplication thuần nhất cho Knowledge Gap
 * Gom nhóm 100 câu hỏi cùng nội dung thành 1 Knowledge Gap record duy nhất
 * với occurrenceCount = 100 và danh sách sampleQueries.
 */
export declare function deduplicateKnowledgeGaps(candidates: KnowledgeGapCandidate[]): DeduplicatedKnowledgeGap[];
