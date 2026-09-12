import { type ObservabilitySessionId, type ObservabilityAlert, type ObservabilityAlertSeverity } from './observabilityTypes.js';
export interface AlertTriggerInput {
    readonly sessionId: ObservabilitySessionId;
    readonly severity: ObservabilityAlertSeverity;
    readonly targetId: string;
    readonly reason: string;
    readonly observationRefs?: readonly string[];
    readonly evidenceRefs?: readonly string[];
    readonly provenance?: string;
    readonly recommendedEscalation?: string;
}
export declare class ObservabilityAlertEngine {
    private alerts;
    /**
     * Generates a deterministic SHA-256 fingerprint for deduplicating identical alerts.
     * Tạo mã dấu vân tay SHA-256 xác định để khử trùng lặp các cảnh báo giống hệt nhau.
     */
    computeAlertFingerprint(targetId: string, severity: ObservabilityAlertSeverity, reason: string): string;
    /**
     * Creates and stores an advisory alert.
     * Tạo và lưu trữ một cảnh báo khuyến nghị.
     */
    createAlert(input: AlertTriggerInput): ObservabilityAlert;
    /**
     * Retrieves all alerts recorded for a session.
     * Lấy tất cả các cảnh báo được ghi nhận cho một phiên.
     */
    getAlerts(sessionId: ObservabilitySessionId): readonly ObservabilityAlert[];
    /**
     * Clears in-memory alerts.
     * Xóa các cảnh báo trong bộ nhớ.
     */
    clear(sessionId?: ObservabilitySessionId): void;
}
