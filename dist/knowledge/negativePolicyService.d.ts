import type { NegativePolicy, PolicyScopeType, PolicyStatus } from '../monitoring/analyticsTypes.js';
/**
 * Xóa cache Negative Policies (Cache Invalidation Hook)
 */
export declare function clearNegativePolicyCache(): void;
/**
 * 1. Lấy danh sách toàn bộ Negative Policies (kết hợp audit events & in-memory cache)
 */
export declare function getNegativePolicies(filters?: {
    status?: PolicyStatus | 'ALL';
    search?: string;
}): Promise<NegativePolicy[]>;
/**
 * 2. Quyết định từ chối & ghi nhớ (Reject & Remember Decision)
 */
export declare function rejectAndRememberDecision(params: {
    gapId?: string;
    originalQuestion: string;
    scopeType: PolicyScopeType;
    scopeValue: string;
    answer: string;
    reason?: string;
    adminUserId: string;
}): Promise<{
    success: boolean;
    policy?: NegativePolicy;
    error?: string;
    conflictWarning?: string;
}>;
/**
 * 3. Khớp truy vấn người dùng với Negative Policy (Negative Policy Runtime Resolver)
 * Khớp semantic variations, Unicode NFC/NFD, unaccented, prefixes, typos
 */
export declare function matchNegativePolicy(query: string, providedPolicies?: NegativePolicy[]): Promise<{
    policy: NegativePolicy;
    confidence: number;
    matchReason: string;
} | null>;
/**
 * 4. Chỉnh sửa Negative Policy (Update with version diff)
 */
export declare function updateNegativePolicy(policyId: string, patch: {
    answer?: string;
    reason?: string;
    scopeValue?: string;
}, adminUserId: string): Promise<{
    success: boolean;
    error?: string;
}>;
/**
 * 5. Kích hoạt lại Negative Policy (Reactivate)
 */
export declare function activateNegativePolicy(policyId: string, adminUserId: string): Promise<boolean>;
/**
 * 6. Vô hiệu hóa Negative Policy (Deactivate)
 */
export declare function deactivateNegativePolicy(policyId: string, adminUserId: string): Promise<boolean>;
/**
 * 7. Phát hiện xung đột giữa Positive FAQ và Negative Policy (Conflict Detection)
 */
export declare function detectPolicyConflict(questionOrScope: string, providedFaqs?: Array<{
    question: string;
}>): Promise<{
    hasConflict: boolean;
    conflictingFaq?: string;
}>;
/**
 * 8. Thống kê Analytics Negative Policy & Số lượng câu hỏi đã ngăn chặn thành công
 */
export declare function getNegativePolicyAnalytics(): Promise<{
    totalPolicies: number;
    activeCount: number;
    inactiveCount: number;
    totalQueriesPrevented: number;
    mostUsed: NegativePolicy[];
}>;
