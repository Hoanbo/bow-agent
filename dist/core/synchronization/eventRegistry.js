// src/core/synchronization/eventRegistry.ts
// BOWCON V4.0 — MILESTONE 1.3.18: AUTHORITATIVE EVENT REGISTRY
//
// EN:
// Authoritative in-memory scoped Brain event store. Tracks strictly monotonic ordered events,
// rejects stale mutations, detects conflicts and gaps, and ensures replay protection.
//
// VI:
// Kho lưu trữ sự kiện Não bộ có thẩm quyền trong bộ nhớ theo phạm vi. Theo dõi các sự kiện
// có thứ tự tăng đơn điệu nghiêm ngặt, từ chối đột biến cũ, phát hiện xung đột và lỗ hổng thứ tự, bảo vệ chống phát lại.
import { classifyEventOrdering } from './eventOrdering.js';
import { evaluateEventReplay } from './eventReplay.js';
export class EventRegistry {
    brainId;
    userId;
    sessionId;
    events = [];
    eventsById = new Map();
    eventsBySequence = new Map();
    lastSequence = 0;
    constructor(brainId, userId, sessionId) {
        this.brainId = brainId;
        this.userId = userId;
        this.sessionId = sessionId;
    }
    /**
     * EN: Returns the latest authoritative sequence recorded.
     * VI: Trả về số thứ tự có thẩm quyền mới nhất được ghi nhận.
     */
    getLastSequence() {
        return this.lastSequence;
    }
    /**
     * EN: Returns the latest authoritative BrainEvent recorded.
     * VI: Trả về BrainEvent có thẩm quyền mới nhất được ghi nhận.
     */
    getLastEvent() {
        return this.events.length > 0 ? this.events[this.events.length - 1] : undefined;
    }
    /**
     * EN: Retrieves an event by its sequence number.
     * VI: Truy xuất sự kiện theo số thứ tự của nó.
     */
    getEventBySequence(sequence) {
        return this.eventsBySequence.get(sequence);
    }
    /**
     * EN: Retrieves an event by its unique eventId.
     * VI: Truy xuất sự kiện theo eventId duy nhất của nó.
     */
    getEventById(eventId) {
        return this.eventsById.get(eventId);
    }
    /**
     * EN: Checks if an eventId has already been recorded.
     * VI: Kiểm tra xem một eventId đã được ghi nhận hay chưa.
     */
    hasEvent(eventId) {
        return this.eventsById.has(eventId);
    }
    /**
     * EN: Checks if a sequence number has already been recorded.
     * VI: Kiểm tra xem một số thứ tự đã được ghi nhận hay chưa.
     */
    hasSequence(sequence) {
        return this.eventsBySequence.has(sequence);
    }
    /**
     * EN: Returns all recorded events in chronological sequence order.
     * VI: Trả về tất cả các sự kiện đã ghi nhận theo đúng thứ tự thời gian.
     */
    getAllEvents() {
        return Object.freeze([...this.events]);
    }
    /**
     * EN: Returns events with sequence strictly greater than the specified sequence.
     * VI: Trả về các sự kiện có số thứ tự lớn hơn số thứ tự được chỉ định.
     */
    getEventsSince(sequence) {
        return Object.freeze(this.events.filter(e => e.sequence > sequence));
    }
    /**
     * EN: Appends an incoming BrainEvent to the authoritative registry after ordering and replay checks.
     * VI: Thêm một BrainEvent gửi đến vào kho có thẩm quyền sau khi kiểm tra thứ tự và chống phát lại.
     */
    appendEvent(event) {
        // 1. Evaluate ordering
        const orderingContext = {
            brainId: this.brainId,
            userId: this.userId,
            sessionId: this.sessionId,
            lastSequence: this.lastSequence,
            getEventBySequence: (seq) => this.getEventBySequence(seq),
            getEventById: (id) => this.getEventById(id),
        };
        const ordering = classifyEventOrdering(orderingContext, event);
        switch (ordering.classification) {
            case 'DUPLICATE_EVENT': {
                const existing = this.eventsBySequence.get(event.sequence);
                if (existing) {
                    const replay = evaluateEventReplay(existing, event);
                    if (replay.isHarmlessDuplicate) {
                        return {
                            accepted: false,
                            duplicate: true,
                            reason: replay.reason,
                            event: existing,
                        };
                    }
                    return {
                        accepted: false,
                        failureCode: 'EVENT_CONFLICT',
                        reason: replay.reason,
                    };
                }
                return {
                    accepted: false,
                    duplicate: true,
                    reason: ordering.reason,
                };
            }
            case 'STALE_EVENT':
                return {
                    accepted: false,
                    failureCode: 'STALE_EVENT',
                    reason: ordering.reason,
                };
            case 'CONFLICTING_EVENT':
                return {
                    accepted: false,
                    failureCode: 'EVENT_CONFLICT',
                    reason: ordering.reason,
                };
            case 'SEQUENCE_GAP':
                return {
                    accepted: false,
                    failureCode: 'SEQUENCE_GAP',
                    reason: ordering.reason,
                };
            case 'CROSS_SCOPE_EVENT':
                return {
                    accepted: false,
                    failureCode: 'INVALID_SCOPE',
                    reason: ordering.reason,
                };
            case 'INVALID_EVENT':
                return {
                    accepted: false,
                    failureCode: 'INVALID_EVENT',
                    reason: ordering.reason,
                };
            case 'VALID_NEXT_EVENT':
            default:
                // Accept and register
                this.events.push(event);
                this.eventsById.set(event.eventId, event);
                this.eventsBySequence.set(event.sequence, event);
                this.lastSequence = event.sequence;
                return {
                    accepted: true,
                    event,
                };
        }
    }
}
