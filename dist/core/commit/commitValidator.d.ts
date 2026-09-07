import type { PlanRiskLevel } from '../planning/planningTypes.js';
/**
 * EN: Scrubs and redacts secrets from any string.
 * VI: Khử trùng và che giấu bí mật khỏi bất kỳ chuỗi ký tự nào.
 */
export declare function redactCommitSecrets(text: string): string;
/**
 * EN: Checks if a value contains any credential or secret pattern.
 * VI: Kiểm tra xem một giá trị có chứa mẫu chứng thực hoặc bí mật hay không.
 */
export declare function containsCommitSecret(val: unknown): boolean;
/**
 * EN: Recursively scans an object for prototype pollution vectors.
 * VI: Quét đệ quy một đối tượng để tìm các vector ô nhiễm prototype.
 */
export declare function hasCommitPrototypePollution(target: unknown): boolean;
/**
 * EN: Enforces valid tenant identity and multi-tenant session isolation.
 * VI: Thực thi định danh tenant hợp lệ và cô lập phiên làm việc multi-tenant.
 */
export declare function validateCommitScope(userId: string, sessionId: string): void;
/**
 * EN: Asserts that a verification outcome is strictly VERIFIED and succeeded before commit preparation.
 * VI: Khẳng định kết quả xác minh bắt buộc phải là VERIFIED và thành công trước khi chuẩn bị commit.
 */
export declare function assertVerifiedForCommit(verification: {
    status: string;
    taskSucceeded: boolean;
}): void;
/**
 * EN: Enforces that risk level is never downgraded during commit.
 * VI: Thực thi việc không bao giờ hạ cấp mức độ rủi ro trong quá trình commit.
 */
export declare function assertCommitRiskPreservation(priorRisk: PlanRiskLevel, currentRisk: PlanRiskLevel): void;
