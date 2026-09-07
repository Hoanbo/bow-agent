// src/core/transport/transportIdentity.ts
// BOWCON V4.0 — MILESTONE 1.3.19: DETERMINISTIC TRANSPORT IDENTITY & SCOPE
//
// EN:
// Deterministic identity generation and scope isolation for Brain, Surface, Transport,
// Connection, and Session. Zero randomness.
//
// VI:
// Tạo định danh tất định và cô lập phạm vi cho Não bộ, Bề mặt, Truyền tải,
// Kết nối và Phiên làm việc. Không ngẫu nhiên.
import { computeConnectionFingerprint, computeSessionFingerprint, } from './transportFingerprint.js';
import { validateTransportScope, validateTransportIdentifier, } from './transportValidator.js';
/**
 * EN: Computes a deterministic ConnectionIdentityRecord from a 5-tuple scope.
 * VI: Tính toán một ConnectionIdentityRecord tất định từ phạm vi bộ 5.
 */
export function createConnectionIdentity(params) {
    const scope = validateTransportScope(params);
    const fingerprint = computeConnectionFingerprint(scope);
    const connectionId = `conn_${fingerprint}`;
    return Object.freeze({
        connectionId,
        scopeKey: scope.scopeKey,
        userId: scope.userId,
        sessionId: scope.sessionId,
        brainId: scope.brainId,
        surfaceId: scope.surfaceId,
        transportId: scope.transportId,
        fingerprint,
    });
}
/**
 * EN: Computes a deterministic transport session ID.
 * VI: Tính toán định danh phiên truyền tải tất định.
 */
export function computeTransportSessionId(connectionId, scopeKey, initialSequence = 1) {
    const validConnId = validateTransportIdentifier('connectionId', connectionId);
    const fp = computeSessionFingerprint({
        connectionId: validConnId,
        scopeKey,
        initialSequence,
    });
    return `tsess_${fp}`;
}
/**
 * EN: Asserts that a transport message belongs strictly to the expected connection scope.
 * VI: Khẳng định rằng thông điệp truyền tải hoàn toàn thuộc về phạm vi kết nối dự kiến.
 */
export function assertScopeMatches(expectedScopeKey, message) {
    const actualScopeKey = `${message.userId}::${message.sessionId}::${message.brainId}::${message.surfaceId}::${message.transportId}`;
    if (expectedScopeKey !== actualScopeKey) {
        throw new Error(`[TRANSPORT_SCOPE_ERROR] Scope mismatch! Expected "${expectedScopeKey}", but message has "${actualScopeKey}".`);
    }
}
