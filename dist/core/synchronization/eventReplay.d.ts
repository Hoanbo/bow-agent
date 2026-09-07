import type { BrainEvent } from './eventTypes.js';
export interface ReplayEvaluation {
    readonly isHarmlessDuplicate: boolean;
    readonly isConflict: boolean;
    readonly reason: string;
}
/**
 * EN: Evaluates a candidate replayed event against an authoritative existing event.
 * VI: Đánh giá một sự kiện phát lại ứng viên so với sự kiện có thẩm quyền hiện có.
 */
export declare function evaluateEventReplay(existingEvent: BrainEvent, candidateEvent: BrainEvent): ReplayEvaluation;
