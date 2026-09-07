import type { BrainEvent, CreateBrainEventParams } from './eventTypes.js';
import type { SynchronizationState, SyncObservation, SyncAcknowledgement, SyncCheckpoint, ReconciliationResult, SyncRecord } from './syncTypes.js';
import { ScopedSynchronizationState } from './syncState.js';
import { type SyncFailureDescriptor } from './syncResult.js';
export interface PublishEventResult {
    readonly success: boolean;
    readonly event?: BrainEvent;
    readonly duplicate?: boolean;
    readonly failure?: SyncFailureDescriptor;
}
export interface RecordObservationResult {
    readonly success: boolean;
    readonly observation?: SyncObservation;
    readonly failure?: SyncFailureDescriptor;
}
export interface RecordAcknowledgementResult {
    readonly success: boolean;
    readonly acknowledgement?: SyncAcknowledgement;
    readonly failure?: SyncFailureDescriptor;
}
export declare class SynchronizationService {
    private readonly scopes;
    private readonly auditRecords;
    /**
     * EN: Computes authoritative composite key: ${userId}::${sessionId}::${brainId}.
     * VI: Tính toán khóa phức hợp có thẩm quyền: ${userId}::${sessionId}::${brainId}.
     */
    buildScopeKey(userId: string, sessionId: string, brainId: string): string;
    /**
     * EN: Gets or creates the scoped synchronization state.
     * VI: Lấy hoặc khởi tạo trạng thái đồng bộ hóa theo phạm vi.
     */
    getOrCreateScope(userId: string, sessionId: string, brainId: string): ScopedSynchronizationState;
    /**
     * EN: Publishes an authoritative event onto the Brain sequence timeline.
     * VI: Công bố một sự kiện có thẩm quyền lên dòng thời gian chuỗi của Não bộ.
     */
    publishEvent(params: CreateBrainEventParams): PublishEventResult;
    /**
     * EN: Retrieves synchronization state snapshot for a scope.
     * VI: Lấy ảnh chụp trạng thái đồng bộ hóa cho một phạm vi.
     */
    getSynchronizationState(userId: string, sessionId: string, brainId: string): SynchronizationState;
    /**
     * EN: Retrieves events chronologically, optionally starting after a given sequence.
     * VI: Truy xuất các sự kiện theo trình tự thời gian, tùy chọn bắt đầu sau một số thứ tự nhất định.
     */
    getEvents(userId: string, sessionId: string, brainId: string, sinceSequence?: number): readonly BrainEvent[];
    /**
     * EN: Retrieves a single event by sequence or event ID.
     * VI: Truy xuất một sự kiện đơn lẻ theo số thứ tự hoặc event ID.
     */
    getEvent(userId: string, sessionId: string, brainId: string, sequenceOrId: number | string): BrainEvent | undefined;
    /**
     * EN: Registers an active surface for observation.
     * VI: Đăng ký một bề mặt hoạt động để theo dõi quan sát.
     */
    registerActiveSurface(userId: string, sessionId: string, brainId: string, surfaceId: string): void;
    /**
     * EN: Removes an active surface (e.g., surface disconnects or goes idle).
     * Note: Disconnection does NOT destroy Brain state or session.
     * VI: Xóa một bề mặt hoạt động (ví dụ: bề mặt ngắt kết nối hoặc chuyển sang nghỉ).
     * Lưu ý: Việc ngắt kết nối KHÔNG hủy hoại trạng thái Não bộ hay phiên làm việc.
     */
    removeActiveSurface(userId: string, sessionId: string, brainId: string, surfaceId: string): void;
    /**
     * EN: Records that a surface observed a Brain event.
     * Invariant: EVENT OBSERVED != EVENT EXECUTED.
     * VI: Ghi nhận một bề mặt đã quan sát một sự kiện Não bộ.
     * Bất biến: SỰ KIỆN ĐƯỢC QUAN SÁT != SỰ KIỆN ĐƯỢC THỰC THI.
     */
    recordSurfaceObservation(params: {
        readonly userId: string;
        readonly sessionId: string;
        readonly brainId: string;
        readonly surfaceId: string;
        readonly eventId: string;
        readonly sequence: number;
        readonly timestamp?: number;
    }): RecordObservationResult;
    /**
     * EN: Records that a surface acknowledged processing of a Brain event.
     * Invariant: EVENT ACKNOWLEDGED != TASK SUCCESS, and DOES NOT imply tool execution.
     * VI: Ghi nhận một bề mặt đã xác nhận đã xử lý sự kiện Não bộ.
     * Bất biến: SỰ KIỆN ĐÃ ĐƯỢC XÁC NHẬN != TÁC VỤ THÀNH CÔNG, và KHÔNG hàm ý thực thi công cụ.
     */
    recordSurfaceAcknowledgement(params: {
        readonly userId: string;
        readonly sessionId: string;
        readonly brainId: string;
        readonly surfaceId: string;
        readonly eventId: string;
        readonly sequence: number;
        readonly timestamp?: number;
    }): RecordAcknowledgementResult;
    /**
     * EN: Creates an immutable synchronization checkpoint representing the state at sequence N.
     * VI: Tạo một checkpoint đồng bộ hóa bất biến biểu diễn trạng thái tại số thứ tự N.
     */
    createCheckpoint(params: {
        readonly userId: string;
        readonly sessionId: string;
        readonly brainId: string;
        readonly continuityId?: string;
        readonly metadata?: Readonly<Record<string, unknown>>;
        readonly timestamp?: number;
    }): SyncCheckpoint;
    /**
     * EN: Reconciles an incoming surface synchronization state against authoritative Brain state.
     * VI: Hòa giải trạng thái đồng bộ hóa bề mặt gửi đến so với trạng thái Não bộ có thẩm quyền.
     */
    reconcile(params: {
        readonly userId: string;
        readonly sessionId: string;
        readonly brainId: string;
        readonly incomingState: {
            readonly sequence: number;
            readonly latestEventId: string;
            readonly latestEventFingerprint: string;
        };
    }): ReconciliationResult;
    /**
     * EN: Returns immutable audit records.
     * VI: Trả về các bản ghi kiểm toán bất biến.
     */
    getAuditRecords(): readonly SyncRecord[];
}
