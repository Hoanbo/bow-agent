// src/core/transport/transportReconnect.ts
// BOWCON V4.0 — MILESTONE 1.3.19: RECONNECT & RESUME METADATA MODEL
//
// EN:
// Authoritative reconnect/resume validation and metadata tracking.
// Ensures offline surface continuity: Surface disconnect does NOT shut down the Brain.
// Resume validates 5-tuple scope and sequence preservation. Never silently resets sequence to zero.
//
// VI:
// Xác thực và theo dõi metadata kết nối lại / khôi phục phiên có thẩm quyền.
// Đảm bảo tính liên tục khi bề mặt ngoại tuyến: Surface ngắt kết nối KHÔNG làm tắt Não bộ.
// Quá trình khôi phục xác thực phạm vi bộ 5 và bảo toàn số thứ tự. Không bao giờ reset sequence về 0.
import { validateTransportScope } from './transportValidator.js';
import { computeResumeFingerprint } from './transportFingerprint.js';
import { deepFreeze } from './transportValidator.js';
/**
 * EN: Creates an immutable ResumeRequest.
 * VI: Khởi tạo một ResumeRequest bất biến.
 */
export function createResumeRequest(params) {
    const validScope = validateTransportScope(params.scope);
    if (typeof params.lastAckSequence !== 'number' ||
        isNaN(params.lastAckSequence) ||
        !Number.isInteger(params.lastAckSequence) ||
        params.lastAckSequence < 0) {
        throw new Error(`[TRANSPORT_RESUME_ERROR] Invalid lastAckSequence: ${params.lastAckSequence}. Must be non-negative integer.`);
    }
    const attempt = params.resumeAttempt ?? 1;
    const ts = params.timestamp ?? 0;
    const fp = computeResumeFingerprint({
        connectionId: params.connectionId,
        lastAckSequence: params.lastAckSequence,
        resumeAttempt: attempt,
    });
    const request = {
        requestId: `resreq_${fp}`,
        connectionId: params.connectionId,
        scope: {
            userId: validScope.userId,
            sessionId: validScope.sessionId,
            brainId: validScope.brainId,
            surfaceId: validScope.surfaceId,
            transportId: validScope.transportId,
        },
        lastAckSequence: params.lastAckSequence,
        checkpointReference: params.checkpointReference,
        resumeAttempt: attempt,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(request);
}
/**
 * EN: Validates a resume request against expected session context.
 * Strict check: scope MUST match exactly, sequence MUST NOT rewind.
 *
 * VI: Xác thực yêu cầu khôi phục so với ngữ cảnh phiên dự kiến.
 * Kiểm tra nghiêm ngặt: phạm vi PHẢI khớp chính xác, số thứ tự KHÔNG ĐƯỢC tua lại.
 */
export function validateResumeRequest(request, sessionContext) {
    const reqScopeKey = `${request.scope.userId}::${request.scope.sessionId}::${request.scope.brainId}::${request.scope.surfaceId}::${request.scope.transportId}`;
    // Scope validation
    if (reqScopeKey !== sessionContext.scopeKey) {
        return deepFreeze({
            success: false,
            connectionId: request.connectionId,
            resumedSequence: sessionContext.lastAcknowledgedSequence,
            error: `Scope mismatch during resume: request scope "${reqScopeKey}" != session scope "${sessionContext.scopeKey}".`,
            fingerprint: computeResumeFingerprint({
                connectionId: request.connectionId,
                lastAckSequence: sessionContext.lastAcknowledgedSequence,
                resumeAttempt: request.resumeAttempt,
            }),
        });
    }
    // ConnectionId validation
    if (request.connectionId !== sessionContext.connectionId) {
        return deepFreeze({
            success: false,
            connectionId: request.connectionId,
            resumedSequence: sessionContext.lastAcknowledgedSequence,
            error: `ConnectionId mismatch during resume: request "${request.connectionId}" != session "${sessionContext.connectionId}".`,
            fingerprint: computeResumeFingerprint({
                connectionId: request.connectionId,
                lastAckSequence: sessionContext.lastAcknowledgedSequence,
                resumeAttempt: request.resumeAttempt,
            }),
        });
    }
    // Sequence validation: request.lastAckSequence must not exceed lastAcceptedSequence
    if (request.lastAckSequence > sessionContext.lastAcceptedSequence) {
        return deepFreeze({
            success: false,
            connectionId: request.connectionId,
            resumedSequence: sessionContext.lastAcknowledgedSequence,
            error: `Invalid sequence rewind/forward during resume: requested ack ${request.lastAckSequence} > last accepted ${sessionContext.lastAcceptedSequence}.`,
            fingerprint: computeResumeFingerprint({
                connectionId: request.connectionId,
                lastAckSequence: sessionContext.lastAcknowledgedSequence,
                resumeAttempt: request.resumeAttempt,
            }),
        });
    }
    return deepFreeze({
        success: true,
        connectionId: request.connectionId,
        resumedSequence: request.lastAckSequence,
        fingerprint: request.fingerprint,
    });
}
