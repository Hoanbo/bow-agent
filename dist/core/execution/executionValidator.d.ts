import type { ToolExecutionRequest } from './executionTypes.js';
/**
 * EN: Detects if any value contains secret patterns.
 * VI: Phát hiện nếu bất kỳ giá trị nào chứa mẫu bí mật.
 */
export declare function containsSecret(val: unknown): boolean;
/**
 * EN: Scrubs and redacts secrets from any text (INV-12).
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi văn bản nào (INV-12).
 */
export declare function redactExecutionSecrets(text: string): string;
export declare const redactSecrets: typeof redactExecutionSecrets;
/**
 * EN: Checks for prototype pollution vectors in an object.
 * VI: Kiểm tra các vector ô nhiễm prototype trong object.
 */
export declare function hasExecutionPrototypePollution(target: unknown): boolean;
/**
 * EN: Validates path safety against traversal, null bytes, and reserved device names (INV-15).
 * VI: Xác thực an toàn đường dẫn chống duyệt cây thư mục, null-byte và tên thiết bị dành riêng (INV-15).
 */
export declare function isSafePath(pathStr: string): boolean;
/**
 * EN: Deeply validates execution request arguments and structure.
 * VI: Xác thực sâu các tham số và cấu trúc của yêu cầu thực thi.
 */
export declare function validateExecutionRequest(request: ToolExecutionRequest, parametersSchema?: readonly any[]): {
    valid: boolean;
    errors: readonly string[];
};
/**
 * EN: Class wrapper for execution validator.
 * VI: Lớp bọc cho bộ xác thực thực thi.
 */
export declare class ExecutionValidator {
    validate(request: ToolExecutionRequest, parametersSchema?: readonly any[]): {
        valid: boolean;
        errors: readonly string[];
    };
}
