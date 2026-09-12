// src/core/promotion/index.ts
// BOWCON V4.0 — MS-1.3.48: CONTROLLED CHANGE PROMOTION & GOVERNED PROJECT INTEGRATION
//
// Public exports for the controlled change promotion and governed project integration subsystem.
// Xuất bản công khai cho phân hệ xúc tiến thay đổi có kiểm soát và tích hợp dự án có quản trị.
//
// STRICT INVARIANTS:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - PROMOTION_PROPOSAL != AUTHORIZATION
// - PROMOTION != OWNER_APPROVAL
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - ZERO SHELL EXECUTION (Zero eval, new Function, execSync, child_process, SSH).
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export * from './promotionTypes.js';
export * from './promotionScopeValidator.js';
export * from './promotionProposalEngine.js';
export * from './promotionValidationEngine.js';
export * from './promotionConflictEngine.js';
export * from './promotionReviewEngine.js';
export * from './promotionAuthorizationEngine.js';
export * from './controlledPromotionEngine.js';
export * from './promotionRollbackEngine.js';
export * from './promotionProvenanceEngine.js';
export * from './promotionRuntime.js';
