// src/core/network/networkTimeout.ts
// BOWCON V4.0 — MILESTONE 1.3.21: NETWORK TIMEOUT HANDLER
//
// EN:
// Authoritative network timeout evaluation and classification model.
// Distinguishes connect, frame, heartbeat, response, and reconnect timeouts.
// Fails closed with typed failures; zero silent re-execution of dangerous actions.
//
// VI:
// Mô hình phân loại và đánh giá timeout mạng có thẩm quyền.
// Phân biệt timeout kết nối, khung, nhịp tim, phản hồi và kết nối lại.
// Thất bại đóng với lỗi định kiểu; không âm thầm chạy lại các thao tác nguy hiểm.
import { fnv1aHex } from './networkFingerprint.js';
import { deepFreeze } from './networkValidator.js';
export const DEFAULT_NETWORK_TIMEOUT_CONFIG = Object.freeze({
    connectTimeoutMs: 5000,
    frameTimeoutMs: 10000,
    heartbeatTimeoutMs: 15000,
    responseTimeoutMs: 10000,
    reconnectTimeoutMs: 30000,
});
/**
 * EN: Evaluates elapsed duration against timeout thresholds.
 * VI: Đánh giá khoảng thời gian đã trôi qua so với ngưỡng timeout.
 */
export function evaluateNetworkTimeout(params) {
    const cfg = {
        ...DEFAULT_NETWORK_TIMEOUT_CONFIG,
        ...params.config,
    };
    let allowedMs = cfg.frameTimeoutMs;
    let failureCode = 'FRAME_TIMEOUT';
    switch (params.timeoutType) {
        case 'CONNECT_TIMEOUT':
            allowedMs = cfg.connectTimeoutMs;
            failureCode = 'CONNECTION_TIMEOUT';
            break;
        case 'FRAME_TIMEOUT':
            allowedMs = cfg.frameTimeoutMs;
            failureCode = 'FRAME_TIMEOUT';
            break;
        case 'HEARTBEAT_TIMEOUT':
            allowedMs = cfg.heartbeatTimeoutMs;
            failureCode = 'HEARTBEAT_TIMEOUT';
            break;
        case 'RESPONSE_TIMEOUT':
            allowedMs = cfg.responseTimeoutMs;
            failureCode = 'RESPONSE_TIMEOUT';
            break;
        case 'RECONNECT_TIMEOUT':
            allowedMs = cfg.reconnectTimeoutMs;
            failureCode = 'RECONNECT_TIMEOUT';
            break;
    }
    const elapsedMs = Math.max(0, params.currentTimestamp - params.startTimestamp);
    const timedOut = elapsedMs > allowedMs;
    const fp = fnv1aHex(`${params.timeoutType}::${elapsedMs}::${allowedMs}::${timedOut}`);
    if (timedOut) {
        return deepFreeze({
            timedOut: true,
            timeoutType: params.timeoutType,
            failureCode,
            elapsedMs,
            allowedMs,
            reason: `Operation timed out: elapsed ${elapsedMs}ms exceeds limit of ${allowedMs}ms (${params.timeoutType}).`,
            fingerprint: fp,
        });
    }
    return deepFreeze({
        timedOut: false,
        timeoutType: params.timeoutType,
        elapsedMs,
        allowedMs,
        fingerprint: fp,
    });
}
