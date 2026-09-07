import type { PlanRiskLevel } from '../planning/planningTypes.js';
import type { ScopedRemoteIdentity } from './remoteTypes.js';
/**
 * EN: Resource boundary constants.
 * VI: Các hằng số giới hạn tài nguyên.
 */
export declare const MAX_REMOTE_PAYLOAD_BYTES: number;
export declare const MAX_REMOTE_METADATA_DEPTH = 8;
export declare const MAX_REMOTE_CORRELATION_LENGTH = 256;
export declare const MAX_REMOTE_QUEUE_DEPTH = 1000;
/**
 * EN: Validates a generic string identifier against injection, traversal, and reserved names.
 * VI: Kiểm tra một định danh chuỗi tổng quát chống lại tiêm nhiễm, duyệt đường dẫn và tên cấm.
 */
export declare function validateRemoteIdentifier(name: string, value: unknown): string;
/**
 * EN: Validates 6-tuple multi-tenant scoped remote identities.
 * VI: Kiểm tra danh tính kết nối từ xa theo phạm vi đa người dùng bộ 6.
 */
export declare function validateRemoteScope(params: ScopedRemoteIdentity): {
    readonly userId: string;
    readonly sessionId: string;
    readonly brainId: string;
    readonly surfaceId: string;
    readonly transportId: string;
    readonly gatewayId: string;
    readonly scopeKey: string;
};
/**
 * EN: Checks whether a string contains sensitive patterns.
 * VI: Kiểm tra xem chuỗi có chứa mẫu hình nhạy cảm hay không.
 */
export declare function containsRemoteSecret(input: string): boolean;
/**
 * EN: Redacts sensitive secrets from strings, error messages, and logs.
 * VI: Che dấu các bí mật nhạy cảm khỏi chuỗi, thông báo lỗi và nhật ký.
 */
export declare function redactRemoteSecrets(input: string): string;
/**
 * EN: Inspects metadata object depth recursively to enforce resource bounds.
 * VI: Kiểm tra độ sâu của đối tượng metadata đệ quy để thực thi giới hạn tài nguyên.
 */
export declare function validateRemoteMetadataDepth(obj: unknown, currentDepth?: number): void;
/**
 * EN: Validates payload and metadata resource bounds.
 * VI: Kiểm tra các giới hạn tài nguyên của payload và metadata.
 */
export declare function validateRemotePayloadBounds(payload: unknown): void;
/**
 * EN: Asserts risk preservation: remote message must NEVER downgrade risk.
 * VI: Khẳng định bảo toàn rủi ro: thông điệp từ xa KHÔNG BAO GIỜ được hạ cấp rủi ro.
 */
export declare function assertRemoteRiskPreservation(priorRisk: PlanRiskLevel, newRisk: PlanRiskLevel): void;
/**
 * EN: Recursively freezes an object and all nested properties for deep immutability.
 * VI: Đóng băng đệ quy một đối tượng và tất cả các thuộc tính lồng nhau để đảm bảo tính bất biến sâu.
 */
export declare function deepFreeze<T>(obj: T): Readonly<T>;
