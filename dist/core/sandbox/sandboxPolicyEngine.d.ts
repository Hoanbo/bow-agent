import { type SandboxDescriptor, type SandboxOperationType, type SandboxViolation } from './sandboxTypes.js';
import type { CapabilityLeaseManager } from '../delegation/capabilityLeaseManager.js';
import type { DelegationGovernanceRuntime } from '../delegation/delegationGovernanceRuntime.js';
export interface EvaluateOperationInput {
    readonly sandbox: SandboxDescriptor;
    readonly operationType: SandboxOperationType;
    readonly relativePath: string;
    readonly targetPath?: string;
    readonly sessionId: string;
    readonly taskId: string;
    readonly agentId: string;
    readonly deviceId: string;
    readonly currentFileCount?: number;
    readonly currentSizeBytes?: number;
    readonly incomingPayloadSizeBytes?: number;
}
export declare class SandboxPolicyEngine {
    private readonly delegationRuntime?;
    private readonly leaseManager?;
    private _isUserStopped;
    private _userStopReason;
    private violations;
    constructor(delegationRuntime?: DelegationGovernanceRuntime | undefined, leaseManager?: CapabilityLeaseManager | undefined);
    /**
     * Activates emergency USER_STOP, halting all sandbox policy permissions immediately.
     * Kích hoạt USER_STOP khẩn cấp, dừng ngay lập tức mọi quyền hạn chính sách sandbox.
     */
    requestUserStop(reason: string): void;
    /**
     * Resets USER_STOP only under authoritative Master Owner reset.
     * Đặt lại USER_STOP chỉ dưới sự thiết lập lại có thẩm quyền của Master Owner.
     */
    resetUserStop(): void;
    /**
     * Returns whether emergency USER_STOP is active.
     * Trả về trạng thái liệu lệnh dừng khẩn cấp USER_STOP có đang hoạt động hay không.
     */
    isUserStopped(): boolean;
    /**
     * Returns all recorded policy and security violations.
     * Trả về tất cả các vi phạm chính sách và an ninh đã ghi nhận.
     */
    getViolations(): readonly SandboxViolation[];
    /**
     * Records an explicit security or policy violation.
     * Ghi lại một vi phạm an ninh hoặc chính sách rõ ràng.
     */
    private recordViolation;
    /**
     * Validates whether a file operation is permitted within a governed sandbox.
     * Fails closed if any governance, session, capability, path, or policy boundary is breached.
     *
     * Xác thực xem thao tác tệp có được phép trong sandbox được quản trị hay không.
     * Đóng thất bại nếu bất kỳ ranh giới quản trị, phiên, năng lực, đường dẫn hoặc chính sách nào bị vi phạm.
     */
    validateOperation(input: EvaluateOperationInput): void;
    /**
     * Clears violation history.
     * Xóa lịch sử vi phạm.
     */
    clear(): void;
}
