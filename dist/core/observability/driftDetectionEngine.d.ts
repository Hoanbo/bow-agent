import { type ObservabilitySessionId, type DriftDetectionId, type DriftEvent, type DriftType, type DriftClassification } from './observabilityTypes.js';
export interface DriftEvaluationInput {
    readonly detectionId?: DriftDetectionId;
    readonly sessionId: ObservabilitySessionId;
    readonly targetId: string;
    readonly driftType: DriftType;
    readonly expectedState: string;
    readonly observedState: string;
    readonly isExpectedMutation?: boolean;
    readonly contextDetails?: Readonly<Record<string, unknown>>;
}
export interface FilesystemManifestEntry {
    readonly relativePath: string;
    readonly sha256: string;
    readonly sizeBytes?: number;
}
export declare class DriftDetectionEngine {
    private events;
    /**
     * Classifies drift based on severity, type, and whether mutation was pre-declared.
     * Phân loại sai lệch dựa trên mức độ nghiêm trọng, loại và liệu đột biến đã được khai báo trước hay chưa.
     */
    classifyDrift(driftType: DriftType, expectedState: string, observedState: string, isExpectedMutation?: boolean): DriftClassification;
    /**
     * Detects and records drift between expected and observed state.
     * Phát hiện và ghi lại sai lệch giữa trạng thái mong đợi và quan sát được.
     */
    detectDrift(input: DriftEvaluationInput): DriftEvent;
    /**
     * Analyzes filesystem manifest drift by comparing expected entries against observed entries.
     * Phân tích sai lệch tệp kê khai hệ thống tệp bằng cách so sánh các mục mong đợi với các mục quan sát được.
     */
    detectFilesystemManifestDrift(sessionId: ObservabilitySessionId, targetId: string, expectedManifest: readonly FilesystemManifestEntry[], observedManifest: readonly FilesystemManifestEntry[]): readonly DriftEvent[];
    /**
     * Retrieves all drift events recorded for a session.
     * Lấy tất cả các sự kiện sai lệch được ghi nhận cho một phiên.
     */
    getEvents(sessionId: ObservabilitySessionId): readonly DriftEvent[];
    /**
     * Clears in-memory drift events.
     * Xóa các sự kiện sai lệch trong bộ nhớ.
     */
    clear(sessionId?: ObservabilitySessionId): void;
}
