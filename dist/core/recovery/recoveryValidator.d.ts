import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Scrubs and redacts secrets from any string.
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi ký tự nào.
 */
export declare function redactRecoverySecrets(text: string): string;
/**
 * EN: Checks if a value contains any credential or secret pattern.
 * VI: Kiểm tra xem một giá trị có chứa mẫu chứng thực hoặc bí mật hay không.
 */
export declare function containsRecoverySecret(val: unknown): boolean;
/**
 * EN: Recursively scans an object for prototype pollution vectors.
 * VI: Quét đệ quy một đối tượng để tìm các vector ô nhiễm prototype.
 */
export declare function hasRecoveryPrototypePollution(target: unknown): boolean;
/**
 * EN: Enforces valid tenant identity and multi-tenant session isolation for recovery.
 * VI: Thực thi định danh tenant hợp lệ và cô lập phiên làm việc multi-tenant cho phục hồi.
 */
export declare function validateRecoveryScope(userId: string, sessionId: string): void;
/**
 * EN: Enforces that risk level is never downgraded during recovery.
 * VI: Thực thi việc không bao giờ hạ cấp mức độ rủi ro trong quá trình phục hồi.
 */
export declare function assertRecoveryRiskPreservation(priorRisk: PlanRiskLevel, currentRisk: PlanRiskLevel): void;
