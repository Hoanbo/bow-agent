import type { FailureCategory } from '../diagnosis/diagnosisTypes.js';
import { type OscillationPattern } from './incidentResilienceTypes.js';
export interface RecordedIncidentEvent {
    readonly incidentId: string;
    readonly targetId: string;
    readonly category: FailureCategory | string;
    readonly primarySubsystem?: string;
    readonly timestamp: number;
}
export interface AntiOscillationOptions {
    readonly slidingWindowMs?: number;
    readonly flappingThreshold?: number;
}
export declare class AntiOscillationDetector {
    private readonly history;
    private readonly slidingWindowMs;
    private readonly flappingThreshold;
    constructor(options?: AntiOscillationOptions);
    /**
     * Derives a deterministic incident fingerprint signature.
     * Tạo chữ ký đặc trưng sự cố xác định.
     */
    computeSignature(targetId: string, category: string, primarySubsystem?: string): string;
    /**
     * Ingests an incident occurrence and evaluates whether the target is experiencing flapping oscillation.
     * Thu nạp một lần xảy ra sự cố và đánh giá xem mục tiêu có đang trải qua hiện tượng dao động flapping hay không.
     */
    recordAndEvaluate(event: RecordedIncidentEvent, now?: number): OscillationPattern;
    /**
     * Clears internal history (used in test setup or session resets).
     * Xóa lịch sử nội bộ (dùng trong thiết lập kiểm thử hoặc đặt lại phiên).
     */
    clearHistory(): void;
}
