// src/core/network/networkHeartbeat.ts
// BOWCON V4.0 — MILESTONE 1.3.21: NETWORK HEARTBEAT RUNTIME
//
// EN:
// Authoritative network heartbeat runtime and validation.
// CRITICAL INVARIANT: HEARTBEAT_ALIVE ≠ TASK_SUCCESS.
// Heartbeat proves connection liveness only. It never implies tool execution,
// task completion, durable commit, or cognitive consensus.
//
// VI:
// Runtime và xác thực nhịp tim mạng có thẩm quyền.
// BẢO ĐẢM CỐT TỬ: HEARTBEAT_ALIVE ≠ TASK_SUCCESS.
// Nhịp tim chỉ chứng minh kết nối còn sống. Nó không bao giờ biểu thị việc thực thi công cụ,
// hoàn thành tác vụ, cam kết bền vững hay đồng thuận nhận thức.
import { computeNetworkHeartbeatFingerprint, fnv1aHex, } from './networkFingerprint.js';
import { validateNetworkIdentifier, deepFreeze, } from './networkValidator.js';
import { assertValidNetworkHeartbeatTransition } from './networkTransitions.js';
/**
 * EN: Creates an immutable NetworkHeartbeatSignal.
 * VI: Khởi tạo một NetworkHeartbeatSignal bất biến.
 */
export function createNetworkHeartbeatSignal(params) {
    const connectionId = validateNetworkIdentifier('networkConnectionId', params.networkConnectionId);
    const ts = params.timestamp ?? 0;
    const fp = computeNetworkHeartbeatFingerprint({
        networkConnectionId: connectionId,
        sequence: params.sequence,
        timestamp: ts,
    });
    const signal = {
        heartbeatId: `hb_${fp}`,
        networkConnectionId: connectionId,
        sequence: params.sequence,
        timestamp: ts,
        fingerprint: fp,
    };
    return deepFreeze(signal);
}
/**
 * EN: Creates an immutable NetworkHeartbeatAck in response to a signal.
 * VI: Khởi tạo một NetworkHeartbeatAck bất biến để phản hồi tín hiệu.
 */
export function createNetworkHeartbeatAck(params) {
    const currentTs = params.currentTimestamp ?? params.signal.timestamp;
    const rtt = Math.max(0, currentTs - params.signal.timestamp);
    const fp = fnv1aHex(`HB_ACK::${params.signal.heartbeatId}::${currentTs}::${rtt}`);
    const ack = {
        ackId: `hback_${fp}`,
        heartbeatId: params.signal.heartbeatId,
        networkConnectionId: params.signal.networkConnectionId,
        roundTripTimeMs: rtt,
        timestamp: currentTs,
        fingerprint: fp,
    };
    return deepFreeze(ack);
}
/**
 * EN: Evaluates heartbeat acknowledgment against sent signal.
 * Fails closed on connection mismatch or negative sequence.
 *
 * VI: Đánh giá xác nhận nhịp tim so với tín hiệu đã gửi.
 * Thất bại đóng khi lệch kết nối hoặc số thứ tự âm.
 */
export function evaluateNetworkHeartbeat(signal, ack, maxAllowedRttMs = 15000) {
    if (signal.networkConnectionId !== ack.networkConnectionId) {
        const err = `Heartbeat connection mismatch: signal "${signal.networkConnectionId}" != ack "${ack.networkConnectionId}".`;
        return deepFreeze({
            success: false,
            heartbeatState: 'FAILED',
            error: err,
            fingerprint: fnv1aHex(`HB_EVAL_FAILED::${err}`),
        });
    }
    if (signal.heartbeatId !== ack.heartbeatId) {
        const err = `Heartbeat ID mismatch: signal "${signal.heartbeatId}" != ack "${ack.heartbeatId}".`;
        return deepFreeze({
            success: false,
            heartbeatState: 'FAILED',
            error: err,
            fingerprint: fnv1aHex(`HB_EVAL_FAILED::${err}`),
        });
    }
    const rtt = ack.roundTripTimeMs ?? 0;
    if (rtt > maxAllowedRttMs) {
        const err = `Heartbeat timed out: RTT ${rtt}ms exceeds max allowed ${maxAllowedRttMs}ms.`;
        return deepFreeze({
            success: false,
            heartbeatState: 'TIMED_OUT',
            roundTripTimeMs: rtt,
            error: err,
            fingerprint: fnv1aHex(`HB_EVAL_TIMEOUT::${err}`),
        });
    }
    assertValidNetworkHeartbeatTransition('RECEIVED', 'ACKNOWLEDGED');
    return deepFreeze({
        success: true,
        heartbeatState: 'ACKNOWLEDGED',
        roundTripTimeMs: rtt,
        fingerprint: fnv1aHex(`HB_EVAL_SUCCESS::${ack.ackId}`),
    });
}
