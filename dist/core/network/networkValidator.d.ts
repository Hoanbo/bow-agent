import type { ScopedNetworkIdentity } from './networkTypes.js';
export declare const MAX_NETWORK_IDENTIFIER_LENGTH = 128;
export declare const MAX_NETWORK_PAYLOAD_SIZE_BYTES: number;
export declare const MAX_NETWORK_NESTING_DEPTH = 8;
export declare const WINDOWS_RESERVED_DEVICE_NAMES: ReadonlySet<string>;
export declare const PROTOTYPE_POLLUTION_KEYS: ReadonlySet<string>;
/**
 * EN: Validates an identifier string against length, null bytes, prototype keys,
 * path traversal, and Windows reserved device names.
 *
 * VI: Xác thực chuỗi định danh chống lại độ dài quá mức, ký tự null, khóa prototype,
 * duyệt đường dẫn và tên thiết bị dành riêng của Windows.
 */
export declare function validateNetworkIdentifier(name: string, value: string): string;
/**
 * EN: Validates and freezes 7-tuple ScopedNetworkIdentity.
 * VI: Xác thực và đóng băng ScopedNetworkIdentity bộ 7.
 */
export declare function validateScopedNetworkIdentity(scope: ScopedNetworkIdentity): Readonly<ScopedNetworkIdentity & {
    scopeKey: string;
}>;
/**
 * EN: Validates payload resource boundaries (max size and nesting depth).
 * VI: Xác thực giới hạn tài nguyên của payload (kích thước tối đa và độ sâu lồng nhau).
 */
export declare function validateNetworkPayloadBounds(payload: unknown, currentDepth?: number): void;
/**
 * EN: Redacts sensitive secrets, credentials, and tokens from strings.
 * VI: Khử các bí mật nhạy cảm, thông tin xác thực và token khỏi chuỗi.
 */
export declare function redactNetworkSecrets(text: string): string;
/**
 * EN: Recursively freezes an object and all nested properties.
 * VI: Đóng băng đệ quy một đối tượng và toàn bộ thuộc tính lồng nhau.
 */
export declare function deepFreeze<T>(obj: T): Readonly<T>;
