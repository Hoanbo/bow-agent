import type { BrainEvent, SyncFailureCode } from './eventTypes.js';
export interface EventRegistrationResult {
    readonly accepted: boolean;
    readonly duplicate?: boolean;
    readonly failureCode?: SyncFailureCode;
    readonly reason?: string;
    readonly event?: BrainEvent;
}
export declare class EventRegistry {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    private readonly events;
    private readonly eventsById;
    private readonly eventsBySequence;
    private lastSequence;
    constructor(brainId: string, userId: string, sessionId: string);
    /**
     * EN: Returns the latest authoritative sequence recorded.
     * VI: Trả về số thứ tự có thẩm quyền mới nhất được ghi nhận.
     */
    getLastSequence(): number;
    /**
     * EN: Returns the latest authoritative BrainEvent recorded.
     * VI: Trả về BrainEvent có thẩm quyền mới nhất được ghi nhận.
     */
    getLastEvent(): BrainEvent | undefined;
    /**
     * EN: Retrieves an event by its sequence number.
     * VI: Truy xuất sự kiện theo số thứ tự của nó.
     */
    getEventBySequence(sequence: number): BrainEvent | undefined;
    /**
     * EN: Retrieves an event by its unique eventId.
     * VI: Truy xuất sự kiện theo eventId duy nhất của nó.
     */
    getEventById(eventId: string): BrainEvent | undefined;
    /**
     * EN: Checks if an eventId has already been recorded.
     * VI: Kiểm tra xem một eventId đã được ghi nhận hay chưa.
     */
    hasEvent(eventId: string): boolean;
    /**
     * EN: Checks if a sequence number has already been recorded.
     * VI: Kiểm tra xem một số thứ tự đã được ghi nhận hay chưa.
     */
    hasSequence(sequence: number): boolean;
    /**
     * EN: Returns all recorded events in chronological sequence order.
     * VI: Trả về tất cả các sự kiện đã ghi nhận theo đúng thứ tự thời gian.
     */
    getAllEvents(): readonly BrainEvent[];
    /**
     * EN: Returns events with sequence strictly greater than the specified sequence.
     * VI: Trả về các sự kiện có số thứ tự lớn hơn số thứ tự được chỉ định.
     */
    getEventsSince(sequence: number): readonly BrainEvent[];
    /**
     * EN: Appends an incoming BrainEvent to the authoritative registry after ordering and replay checks.
     * VI: Thêm một BrainEvent gửi đến vào kho có thẩm quyền sau khi kiểm tra thứ tự và chống phát lại.
     */
    appendEvent(event: BrainEvent): EventRegistrationResult;
}
