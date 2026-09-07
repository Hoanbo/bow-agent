// src/core/remote/remoteProtocol.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE PROTOCOL CONTRACT & VERSION NEGOTIATION
//
// EN:
// Authoritative remote protocol definition, version compatibility validation,
// and strict version negotiation. Fails closed on mismatch; zero silent downgrade.
//
// VI:
// Định nghĩa giao thức từ xa có thẩm quyền, kiểm tra tương thích phiên bản,
// và đàm phán phiên bản nghiêm ngặt. Thất bại đóng an toàn khi không khớp; không hạ cấp ngầm.
import { CURRENT_REMOTE_PROTOCOL_VERSION, SUPPORTED_REMOTE_PROTOCOL_VERSIONS, } from './remoteTypes.js';
import { deepFreeze } from './remoteValidator.js';
export const REMOTE_PROTOCOL_NAME = 'BOW_REMOTE_PROTOCOL';
export const CANONICAL_REMOTE_PROTOCOL = deepFreeze({
    protocolName: REMOTE_PROTOCOL_NAME,
    currentVersion: CURRENT_REMOTE_PROTOCOL_VERSION,
    supportedVersions: Array.from(SUPPORTED_REMOTE_PROTOCOL_VERSIONS),
});
/**
 * EN: Checks if a requested protocol version is supported.
 * VI: Kiểm tra xem phiên bản giao thức được yêu cầu có được hỗ trợ hay không.
 */
export function isProtocolVersionSupported(version) {
    return SUPPORTED_REMOTE_PROTOCOL_VERSIONS.has(version);
}
/**
 * EN: Negotiates protocol version with a remote peer. Fails closed on mismatch.
 * VI: Đàm phán phiên bản giao thức với máy khách từ xa. Thất bại đóng an toàn khi không khớp.
 */
export function negotiateProtocolVersion(requestedVersion) {
    if (!isProtocolVersionSupported(requestedVersion)) {
        throw new Error(`[REMOTE_PROTOCOL_MISMATCH] Unsupported protocol version "${requestedVersion}". Supported versions: ${Array.from(SUPPORTED_REMOTE_PROTOCOL_VERSIONS).join(', ')}.`);
    }
    return requestedVersion;
}
