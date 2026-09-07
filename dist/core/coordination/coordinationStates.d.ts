/**
 * EN: Surface presentation and embodiment categories.
 * VI: Các phân loại bề mặt trình bày và hiện thân.
 */
export type SurfaceType = 'MOBILE' | 'ROBOT' | 'DESKTOP' | 'WEB' | 'VOICE' | 'UNKNOWN';
/**
 * EN: Deterministic lifecycle states for a presentation / embodiment surface.
 * VI: Các trạng thái vòng đời tất định cho một bề mặt trình bày / hiện thân.
 */
export type SurfaceStatus = 'REGISTERED' | 'ATTACHED' | 'AVAILABLE' | 'ACTIVE' | 'IDLE' | 'UNAVAILABLE' | 'DETACHING' | 'DETACHED' | 'FAILED' | 'BLOCKED';
/**
 * EN: Overall Brain coordination status across all associated surfaces.
 * VI: Trạng thái điều phối tổng thể của Não bộ trên tất cả các bề mặt liên kết.
 */
export type BrainCoordinationState = 'INITIALIZING' | 'ACTIVE' | 'SUSPENDED' | 'MAINTENANCE' | 'TERMINATED';
/**
 * EN: Surfaces that are actively receiving input or rendering output.
 * VI: Các bề mặt đang tích cực nhận đầu vào hoặc hiển thị đầu ra.
 */
export declare const SURFACE_ACTIVE_STATES: ReadonlySet<SurfaceStatus>;
/**
 * EN: Surfaces that are connected, healthy, and ready to accept activation or handoff.
 * VI: Các bề mặt đã kết nối, lành mạnh và sẵn sàng nhận kích hoạt hoặc handoff.
 */
export declare const SURFACE_AVAILABLE_STATES: ReadonlySet<SurfaceStatus>;
/**
 * EN: Operational surface states representing non-terminal attachments.
 * VI: Các trạng thái bề mặt hoạt động đại diện cho các gắn kết chưa kết thúc.
 */
export declare const SURFACE_OPERATIONAL_STATES: ReadonlySet<SurfaceStatus>;
/**
 * EN: Terminal surface states that cannot transition further without re-registration/re-attachment.
 * VI: Các trạng thái bề mặt kết thúc không thể chuyển đổi tiếp mà không đăng ký/gắn kết lại.
 */
export declare const SURFACE_TERMINAL_STATES: ReadonlySet<SurfaceStatus>;
/**
 * EN: Checks if a surface is actively engaged.
 * VI: Kiểm tra xem bề mặt có đang hoạt động tích cực hay không.
 */
export declare function isSurfaceActive(status: SurfaceStatus): boolean;
/**
 * EN: Checks if a surface is available for interaction or handoff.
 * VI: Kiểm tra xem bề mặt có sẵn sàng để tương tác hoặc nhận bàn giao hay không.
 */
export declare function isSurfaceAvailable(status: SurfaceStatus): boolean;
/**
 * EN: Checks if a surface is in an operational (non-terminal) state.
 * VI: Kiểm tra xem bề mặt có đang ở trạng thái hoạt động (chưa kết thúc) hay không.
 */
export declare function isSurfaceOperational(status: SurfaceStatus): boolean;
/**
 * EN: Checks if a surface status is permanently terminal/blocked.
 * VI: Kiểm tra xem trạng thái bề mặt có phải là trạng thái kết thúc vĩnh viễn/bị khóa hay không.
 */
export declare function isSurfaceTerminal(status: SurfaceStatus): boolean;
