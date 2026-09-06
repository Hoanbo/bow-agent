// src/core/execution/executionTypes.ts
// BOWCON V4.0 — MILESTONE 1.3.12: GOVERNED TOOL EXECUTION TYPES
//
// EN:
// Authoritative type definitions for the Governed Tool Execution Runtime.
// Provides strong contracts for execution authorization, requests, outcomes, and records.
//
// VI:
// Các định nghĩa kiểu dữ liệu có thẩm quyền cho Runtime Thực thi Công cụ có Quản trị.
// Cung cấp các hợp đồng chặt chẽ cho ủy quyền thực thi, yêu cầu, kết quả và bản ghi thực thi.
/**
 * EN: Sanitized error thrown or returned during execution lifecycle.
 * VI: Lỗi đã được khử trùng được ném ra hoặc trả về trong vòng đời thực thi.
 */
export class ExecutionError extends Error {
    code;
    sanitized;
    constructor(code, message, sanitized = true) {
        super(message);
        this.name = 'ExecutionError';
        this.code = code;
        this.sanitized = sanitized;
        Object.setPrototypeOf(this, ExecutionError.prototype);
    }
}
