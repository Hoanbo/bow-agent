import type { BrainEvent, EventOrderingClassification } from './eventTypes.js';
export interface OrderingContext {
    readonly brainId: string;
    readonly userId: string;
    readonly sessionId: string;
    readonly lastSequence: number;
    readonly getEventBySequence?: (sequence: number) => BrainEvent | undefined;
    readonly getEventById?: (eventId: string) => BrainEvent | undefined;
}
export interface OrderingEvaluation {
    readonly classification: EventOrderingClassification;
    readonly expectedSequence: number;
    readonly actualSequence: number;
    readonly reason: string;
}
/**
 * EN: Classifies an incoming BrainEvent against authoritative ordering context.
 * VI: Phân loại một BrainEvent gửi đến so với ngữ cảnh thứ tự có thẩm quyền.
 */
export declare function classifyEventOrdering(context: OrderingContext, incomingEvent: BrainEvent): OrderingEvaluation;
