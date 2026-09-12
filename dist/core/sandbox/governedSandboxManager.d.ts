import { type SandboxId, type SandboxState, type SandboxDescriptor, type CreateSandboxInput } from './sandboxTypes.js';
export declare class GovernedSandboxManager {
    private readonly baseStorageDir;
    private sandboxes;
    private _isUserStopped;
    private _userStopReason;
    constructor(baseStorageDir?: string);
    /**
     * Asserts that emergency USER_STOP is not active.
     * Khẳng định rằng lệnh dừng khẩn cấp USER_STOP không đang kích hoạt.
     */
    private assertNotStopped;
    /**
     * Requests emergency USER_STOP, immediately halting all sandboxes.
     * Yêu cầu dừng khẩn cấp USER_STOP, lập tức dừng mọi sandbox.
     */
    requestUserStop(reason: string): void;
    /**
     * Authoritatively resets USER_STOP and unfreezes interrupted sandboxes.
     * Thiết lập lại USER_STOP một cách có thẩm quyền và giải phóng các sandbox bị gián đoạn.
     */
    resetUserStop(): void;
    /**
     * Creates an isolated, governed sandbox bound to session, task, delegation, and capability lease.
     * Tạo một sandbox cô lập, được quản trị gắn kết với phiên, tác vụ, ủy quyền và hợp đồng thuê năng lực.
     */
    createSandbox(input: CreateSandboxInput): SandboxDescriptor;
    /**
     * Retrieves a sandbox descriptor by id.
     * Lấy bộ mô tả sandbox theo định danh.
     */
    getSandbox(id: SandboxId): SandboxDescriptor | undefined;
    /**
     * Lists sandboxes, optionally filtered by sessionId.
     * Liệt kê các sandbox, tùy chọn lọc theo sessionId.
     */
    listSandboxes(sessionId?: string): readonly SandboxDescriptor[];
    /**
     * Transitions a sandbox to a new lifecycle state.
     * Chuyển đổi một sandbox sang trạng thái vòng đời mới.
     */
    transitionState(sandboxId: SandboxId, nextState: SandboxState, reason?: string): SandboxDescriptor;
    /**
     * Revokes a specific sandbox immediately.
     * Thu hồi một sandbox cụ thể ngay lập tức.
     */
    revokeSandbox(sandboxId: SandboxId, reason: string): SandboxDescriptor;
    /**
     * Revokes all sandboxes bound to a revoked delegation.
     * Thu hồi tất cả các sandbox được liên kết với một ủy quyền đã bị thu hồi.
     */
    revokeByDelegation(delegationId: string, reason: string): number;
    /**
     * Cleans up all in-memory sandboxes and clears storage directory if desired.
     * Dọn dẹp tất cả các sandbox trong bộ nhớ và xóa thư mục lưu trữ nếu muốn.
     */
    clear(): void;
}
