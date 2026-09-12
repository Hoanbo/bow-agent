// src/core/releaseExecution/releaseExecutionTypes.ts
// BOWCON V4.0 — MS-1.3.51: GOVERNED RELEASE EXECUTION & AUTHORIZED DEPLOYMENT BOUNDARY
//
// Canonical types, branded identifiers, lifecycle state machines, and contracts
// for governed release execution and authorized deployment.
// Các kiểu dữ liệu chuẩn tắc, định danh có thương hiệu, máy trạng thái vòng đời, và hợp đồng
// cho thực thi phát hành có quản trị và triển khai được ủy quyền.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - MASTER_OWNER_AUTHORITY > BOW > BOWCON > PROJECTS
// - RELEASE_VERIFICATION != OWNER_APPROVAL
// - OWNER_APPROVAL != EXECUTION_TOKEN
// - EXECUTION_TOKEN != RELEASE_RESULT
// - VERIFIED_READY_FOR_OWNER != AUTO_RELEASE
// - ZERO SHELL EXECUTION (No eval, new Function, execSync, child_process, SSH).
// - C:\BOW\shopofbow: READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0 (Fail closed with SECURITY_VIOLATION).
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
export const RELEASE_EXECUTION_SCHEMA_VERSION = '4.0.0';
/**
 * Factory helper to construct a branded ReleaseExecutionId.
 * Hàm hỗ trợ tạo ReleaseExecutionId có thương hiệu.
 */
export function createReleaseExecutionId(id) {
    return id;
}
export class ReleaseExecutionError extends Error {
    code;
    constructor(code, message) {
        super(`[ReleaseExecution:${code}] ${message}`);
        this.name = 'ReleaseExecutionError';
        this.code = code;
        Object.setPrototypeOf(this, ReleaseExecutionError.prototype);
    }
}
