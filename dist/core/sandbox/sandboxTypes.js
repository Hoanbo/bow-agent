// src/core/sandbox/sandboxTypes.ts
// BOWCON V4.0 — MS-1.3.47: GOVERNED AUTONOMOUS PROJECT SANDBOX & CONTROLLED WORKTREE ISOLATION
//
// Invariants:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - OWNER_DECISION > BOWCON_RECOMMENDATION
// - USER_STOP > EVERYTHING_AUTONOMOUS
// - REVOCATION > AGENT_INTENT
// - SANDBOX != AUTHORITY
// - WORKTREE != AUTHORITY
// - DIFF != AUTHORIZATION
// - VALIDATION != AUTHORIZATION
// - EVIDENCE != AUTHORITY
// - CAPABILITY != AUTHORIZATION
// - DELEGATION != EXECUTION
// - AGENT != MASTER_OWNER
// - DEVICE != MASTER_OWNER
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
/**
 * Helper to construct a branded SandboxId.
 * Hàm hỗ trợ tạo SandboxId có thương hiệu.
 */
export function createSandboxId(raw) {
    return raw;
}
/**
 * Helper to construct a branded WorktreeId.
 * Hàm hỗ trợ tạo WorktreeId có thương hiệu.
 */
export function createWorktreeId(raw) {
    return raw;
}
/**
 * Custom error class for all governed sandbox operations.
 * Lớp lỗi tùy chỉnh cho tất cả các thao tác sandbox được quản trị.
 */
export class SandboxError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[${code}] ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'SandboxError';
    }
}
