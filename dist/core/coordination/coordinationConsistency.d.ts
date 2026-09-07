import type { ContinuityContext } from './coordinationTypes.js';
/**
 * EN: Detects if two continuity contexts represent a dangerous split-brain condition.
 * VI: Phát hiện xem hai ngữ cảnh liên tục có đại diện cho tình trạng chia cắt não bộ (split-brain) nguy hiểm hay không.
 */
export declare function detectSplitBrainConflict(current: ContinuityContext, incoming: ContinuityContext): {
    conflict: boolean;
    reason?: string;
};
/**
 * EN: Detects if an incoming update is stale relative to current sequence.
 * VI: Phát hiện xem một cập nhật gửi đến có bị cũ so với sequence hiện tại hay không.
 */
export declare function detectStaleUpdate(currentSequence: number, incomingSequence: number): boolean;
