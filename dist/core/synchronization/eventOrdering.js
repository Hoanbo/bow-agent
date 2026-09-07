// src/core/synchronization/eventOrdering.ts
// BOWCON V4.0 — MILESTONE 1.3.18: EVENT ORDERING & SEQUENCE PROGRESSION
//
// EN:
// Authoritative ordering analysis evaluating incoming events against the Brain sequence timeline.
// Classifies events as VALID_NEXT_EVENT, DUPLICATE_EVENT, STALE_EVENT, SEQUENCE_GAP,
// CONFLICTING_EVENT, CROSS_SCOPE_EVENT, or INVALID_EVENT.
//
// VI:
// Phân tích thứ tự có thẩm quyền đánh giá các sự kiện gửi đến so với dòng thời gian của Não bộ.
// Phân loại các sự kiện thành VALID_NEXT_EVENT, DUPLICATE_EVENT, STALE_EVENT, SEQUENCE_GAP,
// CONFLICTING_EVENT, CROSS_SCOPE_EVENT, hoặc INVALID_EVENT.
/**
 * EN: Classifies an incoming BrainEvent against authoritative ordering context.
 * VI: Phân loại một BrainEvent gửi đến so với ngữ cảnh thứ tự có thẩm quyền.
 */
export function classifyEventOrdering(context, incomingEvent) {
    // 1. Check scope binding
    if (incomingEvent.userId !== context.userId ||
        incomingEvent.sessionId !== context.sessionId ||
        incomingEvent.brainId !== context.brainId) {
        return {
            classification: 'CROSS_SCOPE_EVENT',
            expectedSequence: context.lastSequence + 1,
            actualSequence: incomingEvent.sequence,
            reason: `Event scope (${incomingEvent.userId}::${incomingEvent.sessionId}::${incomingEvent.brainId}) does not match authoritative scope (${context.userId}::${context.sessionId}::${context.brainId}).`,
        };
    }
    // 2. Check basic validity
    if (typeof incomingEvent.sequence !== 'number' ||
        isNaN(incomingEvent.sequence) ||
        incomingEvent.sequence <= 0) {
        return {
            classification: 'INVALID_EVENT',
            expectedSequence: context.lastSequence + 1,
            actualSequence: incomingEvent.sequence,
            reason: `Event sequence ${incomingEvent.sequence} is invalid.`,
        };
    }
    const expectedSequence = context.lastSequence + 1;
    // 3. Stale or already known sequence (sequence <= lastSequence)
    if (incomingEvent.sequence <= context.lastSequence) {
        const existing = context.getEventBySequence
            ? context.getEventBySequence(incomingEvent.sequence)
            : undefined;
        if (existing) {
            if (existing.eventId === incomingEvent.eventId && existing.fingerprint === incomingEvent.fingerprint) {
                return {
                    classification: 'DUPLICATE_EVENT',
                    expectedSequence,
                    actualSequence: incomingEvent.sequence,
                    reason: `Event "${incomingEvent.eventId}" at sequence ${incomingEvent.sequence} is an identical duplicate.`,
                };
            }
            return {
                classification: 'CONFLICTING_EVENT',
                expectedSequence,
                actualSequence: incomingEvent.sequence,
                reason: `Event at sequence ${incomingEvent.sequence} conflicts with existing authoritative event "${existing.eventId}".`,
            };
        }
        return {
            classification: 'STALE_EVENT',
            expectedSequence,
            actualSequence: incomingEvent.sequence,
            reason: `Event sequence ${incomingEvent.sequence} is older than authoritative sequence ${context.lastSequence}.`,
        };
    }
    // 4. Exact next valid sequence (sequence === lastSequence + 1)
    if (incomingEvent.sequence === expectedSequence) {
        if (incomingEvent.previousSequence !== context.lastSequence) {
            return {
                classification: 'CONFLICTING_EVENT',
                expectedSequence,
                actualSequence: incomingEvent.sequence,
                reason: `Event previousSequence (${incomingEvent.previousSequence}) does not match authoritative predecessor (${context.lastSequence}).`,
            };
        }
        return {
            classification: 'VALID_NEXT_EVENT',
            expectedSequence,
            actualSequence: incomingEvent.sequence,
            reason: `Event sequence ${incomingEvent.sequence} is the exact expected successor.`,
        };
    }
    // 5. Future sequence with gap (sequence > lastSequence + 1)
    return {
        classification: 'SEQUENCE_GAP',
        expectedSequence,
        actualSequence: incomingEvent.sequence,
        reason: `Sequence gap detected: received sequence ${incomingEvent.sequence}, but expected ${expectedSequence}. Missing events ${expectedSequence} through ${incomingEvent.sequence - 1}.`,
    };
}
