import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Scrubs and redacts secrets from any string.
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi ký tự nào.
 */
export declare function redactVerificationSecrets(text: string): string;
/**
 * EN: Checks if a value contains any credential or secret pattern.
 * VI: Kiểm tra xem một giá trị có chứa mẫu chứng thực hoặc bí mật hay không.
 */
export declare function containsVerificationSecret(val: unknown): boolean;
/**
 * EN: Recursively scans an object for prototype pollution vectors.
 * VI: Quét đệ quy một đối tượng để tìm các vector ô nhiễm prototype.
 */
export declare function hasVerificationPrototypePollution(target: unknown): boolean;
/**
 * EN: Validates that a target property path is strictly safe against traversal and injection.
 * VI: Xác thực rằng đường dẫn thuộc tính mục tiêu hoàn toàn an toàn chống traversal và chèn mã.
 */
export declare function validateSafePath(path: string): boolean;
/**
 * EN: Validates and bounds a confidence score into [0.0, 1.0], strictly rejecting NaN or Infinity.
 * VI: Xác thực và giới hạn điểm tin cậy trong khoảng [0.0, 1.0], nghiêm cấm NaN hoặc Infinity.
 */
export declare function validateConfidence(confidence: number): number;
/**
 * EN: Enforces valid tenant identity and multi-tenant session isolation.
 * VI: Thực thi định danh tenant hợp lệ và cô lập phiên làm việc multi-tenant.
 */
export declare function validateVerificationScope(userId: string, sessionId: string): void;
/**
 * EN: Enforces that risk level is never downgraded during verification.
 * VI: Thực thi việc không bao giờ hạ cấp mức độ rủi ro trong quá trình xác minh.
 */
export declare function assertVerificationRiskPreservation(priorRisk: PlanRiskLevel, currentRisk: PlanRiskLevel): void;
