import type { BrainTransportMessage } from './transportTypes.js';
export type ReplayClassification = 'ACCEPTED_NEW' | 'IDEMPOTENT_DUPLICATE' | 'REPLAY_CONFLICT' | 'CROSS_SCOPE_REJECTED';
export interface ReplayAnalysisResult {
    readonly classification: ReplayClassification;
    readonly messageId: string;
    readonly originalMessageId?: string;
    readonly reason: string;
}
/**
 * EN: Analyzes an incoming message against message history and current connection scope.
 * VI: Phân tích thông điệp đến so với lịch sử thông điệp và phạm vi kết nối hiện tại.
 */
export declare function analyzeReplay(historyBySeq: ReadonlyMap<number, Readonly<BrainTransportMessage>>, historyById: ReadonlyMap<string, Readonly<BrainTransportMessage>>, incoming: Readonly<BrainTransportMessage>, expectedScopeKey: string): Readonly<ReplayAnalysisResult>;
