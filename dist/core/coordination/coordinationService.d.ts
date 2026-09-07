import type { BrainIdentity, SurfaceIdentity, SurfaceType, SurfaceStatus, SurfaceCapabilities, ActiveSurface, SurfaceAttachment, SurfaceDetachment, ContinuityContext, HandoffRequest, HandoffResult, CoordinationCheckpoint, CoordinationRecord } from './coordinationTypes.js';
/**
 * EN: Central Brain Coordination Service.
 * VI: Dịch vụ Điều phối Não bộ Trung tâm.
 */
export declare class CoordinationService {
    private defaultBrain?;
    private readonly brains;
    private readonly surfaces;
    private readonly activeSurfaces;
    private readonly sequences;
    private readonly contexts;
    private readonly checkpoints;
    private readonly history;
    private readonly surfaceOwnership;
    private getPartitionKey;
    private getNextSequence;
    private getCurrentSequence;
    private recordAction;
    /**
     * EN: Registers or retrieves the deterministic Brain identity for a user.
     * VI: Đăng ký hoặc lấy định danh Não bộ tất định cho một người dùng.
     */
    registerBrain(ownerUserId: string, name?: string, seed?: string): BrainIdentity;
    /**
     * EN: Retrieves a registered Brain identity by ID, or the default registered Brain.
     * VI: Lấy định danh Não bộ đã đăng ký theo ID, hoặc Não bộ mặc định đã đăng ký.
     */
    getBrainIdentity(brainId?: string): BrainIdentity | undefined;
    /**
     * EN: Registers an abstract presentation or embodiment surface.
     * VI: Đăng ký một bề mặt trình bày hoặc hiện thân trừu tượng.
     */
    registerSurface(surfaceType: SurfaceType, name: string, capabilities?: Partial<SurfaceCapabilities>): SurfaceIdentity;
    /**
     * EN: Retrieves a registered surface by its surfaceId.
     * VI: Lấy bề mặt đã đăng ký theo surfaceId.
     */
    getSurface(surfaceId: string): SurfaceIdentity | undefined;
    /**
     * EN: Attaches a surface to an active user/session cognitive context.
     * VI: Gắn một bề mặt vào ngữ cảnh nhận thức phiên/người dùng tích cực.
     */
    attachSurface(surfaceId: string, userId: string, sessionId: string, brainId?: string, initialStatus?: SurfaceStatus): SurfaceAttachment;
    /**
     * EN: Updates the status of an attached surface following the authoritative transition matrix.
     * VI: Cập nhật trạng thái của bề mặt được gắn theo ma trận chuyển đổi có thẩm quyền.
     */
    updateSurfaceStatus(surfaceId: string, newStatus: SurfaceStatus, userId: string, sessionId: string): void;
    /**
     * EN: Detaches a surface from active session coordination.
     * VI: Tách rời một bề mặt khỏi điều phối phiên tích cực.
     */
    detachSurface(surfaceId: string, userId: string, sessionId: string, reason?: string): SurfaceDetachment;
    /**
     * EN: Returns an immutable array of active surfaces attached to a user session.
     * VI: Trả về một mảng bất biến các bề mặt tích cực được gắn với một phiên người dùng.
     */
    getActiveSurfaces(userId: string, sessionId: string): readonly ActiveSurface[];
    /**
     * EN: Retrieves or constructs the current ContinuityContext for a session.
     * VI: Lấy hoặc khởi tạo ContinuityContext hiện tại cho một phiên.
     */
    getContinuityContext(userId: string, sessionId: string): ContinuityContext;
    /**
     * EN: Executes a data-only handoff request from one surface to another.
     * VI: Thực thi một yêu cầu bàn giao thuần dữ liệu từ bề mặt này sang bề mặt khác.
     */
    requestHandoff(request: HandoffRequest): HandoffResult;
    /**
     * EN: Creates an immutable coordination checkpoint for auditing and recovery.
     * VI: Tạo một checkpoint điều phối bất biến cho kiểm toán và phục hồi.
     */
    createCheckpoint(userId: string, sessionId: string, metadata?: Record<string, unknown>): CoordinationCheckpoint;
    /**
     * EN: Detects if an incoming continuity context creates a split-brain condition.
     * VI: Phát hiện xem một ngữ cảnh liên tục gửi đến có tạo ra tình trạng split-brain hay không.
     */
    detectConflict(incomingContext: ContinuityContext): {
        conflict: boolean;
        reason?: string;
    };
    /**
     * EN: Detects if an incoming update is stale.
     * VI: Phát hiện xem một cập nhật gửi đến có bị cũ hay không.
     */
    detectStaleUpdate(userId: string, sessionId: string, incomingSequence: number): boolean;
    /**
     * EN: Returns the immutable coordination record history for a session.
     * VI: Trả về lịch sử bản ghi điều phối bất biến cho một phiên.
     */
    getHistory(userId: string, sessionId: string): readonly CoordinationRecord[];
    /**
     * EN: Resets session coordination state.
     * VI: Đặt lại trạng thái điều phối phiên.
     */
    resetSession(userId: string, sessionId: string): void;
}
