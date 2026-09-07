// src/core/synchronization/eventReplay.ts
// BOWCON V4.0 — MILESTONE 1.3.18: EVENT REPLAY PROTECTION & CONFLICT ANALYSIS
//
// EN:
// Authoritative replay protection: classifies repeated events into harmless duplicate
// vs conflicting mutation, preventing silent state overwriting and split-brain pollution.
//
// VI:
// Phòng thủ phát lại có thẩm quyền: phân loại các sự kiện lặp lại thành bản sao vô hại
// hoặc đột biến xung đột, ngăn ngừa việc ghi đè trạng thái trong âm thầm và ô nhiễm chia cắt não bộ.
/**
 * EN: Evaluates a candidate replayed event against an authoritative existing event.
 * VI: Đánh giá một sự kiện phát lại ứng viên so với sự kiện có thẩm quyền hiện có.
 */
export function evaluateEventReplay(existingEvent, candidateEvent) {
    // 1. Identical event ID and identical cryptographic fingerprint
    if (existingEvent.eventId === candidateEvent.eventId &&
        existingEvent.fingerprint === candidateEvent.fingerprint &&
        existingEvent.sequence === candidateEvent.sequence) {
        return {
            isHarmlessDuplicate: true,
            isConflict: false,
            reason: `Event "${candidateEvent.eventId}" at sequence ${candidateEvent.sequence} is an identical idempotent duplicate.`,
        };
    }
    // 2. Same sequence number but different event identity or fingerprint
    if (existingEvent.sequence === candidateEvent.sequence) {
        return {
            isHarmlessDuplicate: false,
            isConflict: true,
            reason: `Conflict detected at sequence ${candidateEvent.sequence}: existing event "${existingEvent.eventId}" (fp: ${existingEvent.fingerprint}) does not match incoming candidate "${candidateEvent.eventId}" (fp: ${candidateEvent.fingerprint}).`,
        };
    }
    // 3. Same event ID but conflicting sequence or payload
    if (existingEvent.eventId === candidateEvent.eventId) {
        return {
            isHarmlessDuplicate: false,
            isConflict: true,
            reason: `Conflict detected for event ID "${candidateEvent.eventId}": attempted re-registration at sequence ${candidateEvent.sequence} differing from authoritative sequence ${existingEvent.sequence}.`,
        };
    }
    return {
        isHarmlessDuplicate: false,
        isConflict: false,
        reason: 'Events are distinct and non-conflicting.',
    };
}
