// src/core/transport/transportOrdering.ts
// BOWCON V4.0 — MILESTONE 1.3.19: DETERMINISTIC MESSAGE ORDERING & SEQUENCE VALIDATION
//
// EN:
// Deterministic sequence verification, sequence progression tracking, gap detection,
// stale sequence detection, and ordering assertions per connection.
//
// VI:
// Xác minh chuỗi tất định, theo dõi tiến trình số thứ tự, phát hiện khoảng cách số thứ tự (gap),
// phát hiện số thứ tự cũ (stale) và các khẳng định thứ tự theo từng kết nối.
import { deepFreeze } from './transportValidator.js';
/**
 * EN: Analyzes incoming message sequence against the last accepted sequence of the connection.
 * VI: Phân tích số thứ tự thông điệp đến so với số thứ tự được chấp nhận gần nhất của kết nối.
 */
export function analyzeMessageSequence(lastAcceptedSequence, incomingSequence) {
    if (typeof incomingSequence !== 'number' ||
        isNaN(incomingSequence) ||
        !Number.isInteger(incomingSequence) ||
        incomingSequence <= 0) {
        return deepFreeze({
            status: 'INVALID_SEQUENCE',
            expectedSequence: lastAcceptedSequence + 1,
            actualSequence: incomingSequence,
            reason: 'Sequence must be a positive integer.',
        });
    }
    const expectedSequence = lastAcceptedSequence + 1;
    if (incomingSequence === expectedSequence) {
        return deepFreeze({
            status: 'NEXT_IN_ORDER',
            expectedSequence,
            actualSequence: incomingSequence,
        });
    }
    if (incomingSequence === lastAcceptedSequence) {
        return deepFreeze({
            status: 'DUPLICATE_SEQUENCE',
            expectedSequence,
            actualSequence: incomingSequence,
        });
    }
    if (incomingSequence < lastAcceptedSequence) {
        return deepFreeze({
            status: 'STALE_SEQUENCE',
            expectedSequence,
            actualSequence: incomingSequence,
        });
    }
    // incomingSequence > expectedSequence
    const missingCount = incomingSequence - expectedSequence;
    return deepFreeze({
        status: 'SEQUENCE_GAP',
        expectedSequence,
        actualSequence: incomingSequence,
        missingCount,
    });
}
/**
 * EN: Validates that an incoming sequence progresses monotonically.
 * Never silently rewinds sequence or accepts stale sequence as new state.
 *
 * VI: Xác thực rằng số thứ tự đến tiến triển đơn điệu.
 * Không bao giờ âm thầm tua lại số thứ tự hoặc chấp nhận số thứ tự cũ làm trạng thái mới.
 */
export function assertSequenceProgression(lastAcceptedSequence, incomingSequence) {
    const analysis = analyzeMessageSequence(lastAcceptedSequence, incomingSequence);
    if (analysis.status === 'INVALID_SEQUENCE') {
        throw new Error(`[TRANSPORT_SEQUENCE_ERROR] ${analysis.reason}`);
    }
    if (analysis.status === 'STALE_SEQUENCE') {
        throw new Error(`[TRANSPORT_SEQUENCE_ERROR] Stale sequence detected: got ${incomingSequence}, expected ${analysis.expectedSequence}.`);
    }
    if (analysis.status === 'SEQUENCE_GAP') {
        throw new Error(`[TRANSPORT_SEQUENCE_GAP_ERROR] Sequence gap detected: got ${incomingSequence}, expected ${analysis.expectedSequence} (${analysis.missingCount} missing).`);
    }
}
