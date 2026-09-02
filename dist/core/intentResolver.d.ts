/**
 * @deprecated ARCHIVE/ROLLBACK-ONLY — PHASE 7.1 STEP 7
 * Standalone equivalent: @bow/agent/src/core/intentResolver.ts
 * Do NOT import directly from production UI code.
 */
import type { AgentIntent, MultiIntentResult, DeferredContext, PlanItemResult, AgentContext } from './types.js';
/**
 * Trích xuất thời hạn (duration) bằng Regex toàn diện: 6 tháng, 12 tháng, 1 năm, 3 tháng, 1 tháng, token, v.v.
 * BUG-001 Hotfix: Hỗ trợ tiếng Việt có dấu, không dấu, NFD/NFC Unicode normalization và viết tắt (6t, 6 t, nửa năm, 180 ngày)
 */
export declare function normalizeText(str: string): string;
export declare function extractDuration(text: string): string | undefined;
export declare function matchPlanByDuration(plans: PlanItemResult[], durationOrText: string, fullQuery?: string): PlanItemResult | undefined;
/**
 * Trích xuất ngữ cảnh mua hàng (Deferred BUY Context) khi phát hiện multi-intent hoặc buy intent
 */
export declare function extractDeferredBuyContext(text: string): DeferredContext;
/**
 * Nhận diện ý định Quản trị viên (Admin Copilot)
 */
export declare function detectAdminIntent(text: string): AgentIntent | null;
/**
 * Phân loại đa ý định từ câu nói của người dùng, phân bổ Primary Intent và Deferred Context
 */
export declare function resolveMultiIntent(text: string, agentContext?: AgentContext): MultiIntentResult;
/**
 * Phân loại ý định từ câu nói của người dùng (tương thích ngược)
 */
export declare function resolveIntent(text: string, agentContext?: AgentContext): AgentIntent;
/**
 * BOW Agent V3.3 Phase 4.2 — Plural Discovery Intent Detector
 *
 * Phân biệt:
 *   PLURAL DISCOVERY — user muốn danh sách nhiều sản phẩm/app
 *     VD: "xem phim thì có những app gì", "có app nào để nghe nhạc"
 *   SINGLE-PRODUCT PLAN DISCOVERY — user hỏi về các gói của 1 sản phẩm cụ thể
 *     VD: "Netflix có những gói gì", "YouTube có bao nhiêu gói"
 *
 * Nguyên tắc:
 *   - Chỉ trả TRUE nếu câu hỏi mang semantic "liệt kê nhiều sản phẩm"
 *   - Câu như "Netflix có những gói gì" → FALSE (single product plan discovery)
 *   - Hỗ trợ cả tiếng Việt có dấu và không dấu sau normalize
 */
export declare function detectPluralDiscoveryIntent(rawText: string): boolean;
/**
 * BOW Agent V3.3 Phase 4.5 — Robust Ambiguity Detection (P1)
 *
 * Nhận diện các câu hỏi nhu cầu mơ hồ (AMBIGUOUS Demand State):
 * - Người dùng yêu cầu gợi ý/tư vấn nhưng không nói rõ lĩnh vực, tính năng, hoặc đối tượng cụ thể
 *   (vd: "tôi muốn một app tốt", "cho tôi một app tốt", "tìm cái gì hay hay", "có gì tốt", "gợi ý giúp tôi")
 * - Hỗ trợ cả tiếng Việt có dấu và không dấu, viết hoa/viết thường
 * - BẢO TOÀN TUYỆT ĐỐI các câu hỏi có đối tượng cụ thể (xem phim, nghe nhạc, Netflix, tàu vũ trụ, bảo hành, v.v.)
 */
export declare function isAmbiguousDemandQuery(rawText: string): boolean;
export declare const resolveAgentIntent: typeof resolveMultiIntent;
