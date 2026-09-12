// src/core/promotion/promotionTypes.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Canonical type contracts, schemas, and state machine for governed change promotion.
// Hợp đồng định kiểu chuẩn tắc, lược đồ và máy trạng thái cho việc xúc tiến thay đổi có quản trị.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - TASK != AUTHORITY
// - SANDBOX != AUTHORITY
// - WORKTREE != AUTHORITY
// - DIFF != AUTHORIZATION
// - VALIDATION != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - VERIFICATION != AUTHORIZATION
// - PROMOTION_PROPOSAL != PROMOTION_AUTHORIZATION
// - PROMOTION != OWNER_APPROVAL
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - AGENT_COUNT != AUTHORITY_COUNT
// - CAPABILITY != AUTHORIZATION
// - DELEGATION != EXECUTION
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export const PROMOTION_SCHEMA_VERSION = '4.0.0';
/**
 * Factory helper to create a branded PromotionId.
 * Hàm trợ giúp tạo một PromotionId có thương hiệu.
 */
export function createPromotionId(id) {
    return id;
}
/**
 * Structured error class for the promotion subsystem.
 * Lớp lỗi có cấu trúc cho phân hệ xúc tiến.
 */
export class PromotionError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'PromotionError';
    }
}
