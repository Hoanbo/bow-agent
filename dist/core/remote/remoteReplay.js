// src/core/remote/remoteReplay.ts
// BOWCON V4.0 — MILESTONE 1.3.20: REMOTE REPLAY DEFENSE
//
// EN:
// Authoritative remote message replay defense.
// Distinguishes valid new requests, idempotent duplicates, mutated replay conflicts,
// and cross-scope attacks. Fails closed.
//
// VI:
// Phòng thủ chống phát lại thông điệp từ xa có thẩm quyền.
// Phân biệt yêu cầu mới hợp lệ, trùng lặp bình ổn (idempotent), xung đột phát lại do biến đổi nội dung,
// và các cuộc tấn công xuyên phạm vi. Thất bại đóng an toàn.
import { deepFreeze } from './remoteValidator.js';
/**
 * EN: Analyzes an incoming remote request against session history.
 * VI: Phân tích một yêu cầu từ xa đến so với lịch sử phiên.
 */
export function analyzeRemoteReplay(historyBySeq, historyById, incoming, expectedSessionId) {
    // 1. Session boundary check
    if (incoming.remoteSessionId !== expectedSessionId) {
        return deepFreeze({
            classification: 'CROSS_SCOPE_REJECTED',
            requestId: incoming.requestId,
            reason: `Remote session mismatch: incoming "${incoming.remoteSessionId}" != expected "${expectedSessionId}".`,
        });
    }
    // 2. Check by requestId
    const existingById = historyById.get(incoming.requestId);
    if (existingById) {
        if (existingById.fingerprint === incoming.fingerprint) {
            return deepFreeze({
                classification: 'IDEMPOTENT_DUPLICATE',
                requestId: incoming.requestId,
                originalRequestId: existingById.requestId,
                reason: 'Identical request received again; classified as idempotent duplicate.',
            });
        }
        else {
            return deepFreeze({
                classification: 'REPLAY_CONFLICT',
                requestId: incoming.requestId,
                originalRequestId: existingById.requestId,
                reason: 'Replay conflict: request with same ID has mutated content.',
            });
        }
    }
    // 3. Check by sequence within this session
    const existingBySeq = historyBySeq.get(incoming.sequence);
    if (existingBySeq) {
        if (existingBySeq.fingerprint === incoming.fingerprint) {
            return deepFreeze({
                classification: 'IDEMPOTENT_DUPLICATE',
                requestId: incoming.requestId,
                originalRequestId: existingBySeq.requestId,
                reason: `Identical request already processed at sequence ${incoming.sequence}.`,
            });
        }
        else {
            return deepFreeze({
                classification: 'REPLAY_CONFLICT',
                requestId: incoming.requestId,
                originalRequestId: existingBySeq.requestId,
                reason: `Replay conflict: sequence ${incoming.sequence} already used with different payload.`,
            });
        }
    }
    return deepFreeze({
        classification: 'ACCEPTED_NEW',
        requestId: incoming.requestId,
        reason: 'Request is valid, unique, and accepted.',
    });
}
