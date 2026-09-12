import { type SandboxId, type SandboxDescriptor, type CreateSandboxInput, type SandboxFileOperation, type SandboxManifest, type SandboxDiff, type SandboxRollback, type SandboxExport } from './sandboxTypes.js';
import { SandboxPolicyEngine } from './sandboxPolicyEngine.js';
import { GovernedSandboxManager } from './governedSandboxManager.js';
import { SandboxFilesystemEngine, type FileOperationContext } from './sandboxFilesystemEngine.js';
import { WorktreeIsolationEngine, type WorktreeDescriptor, type CreateWorktreeInput } from './worktreeIsolationEngine.js';
import { SandboxManifestEngine } from './sandboxManifestEngine.js';
import { SandboxDiffEngine } from './sandboxDiffEngine.js';
import { SandboxRollbackEngine } from './sandboxRollbackEngine.js';
import { SandboxReviewEngine, type SandboxReviewInput, type SandboxReviewRecord } from './sandboxReviewEngine.js';
import { SandboxExportEngine, type ExecuteExportInput } from './sandboxExportEngine.js';
import { AuditLedger } from '../auditLedger.js';
import type { DelegationGovernanceRuntime } from '../delegation/delegationGovernanceRuntime.js';
import type { CapabilityLeaseManager } from '../delegation/capabilityLeaseManager.js';
export declare class SandboxRuntime {
    private readonly auditLedger;
    readonly policyEngine: SandboxPolicyEngine;
    readonly sandboxManager: GovernedSandboxManager;
    readonly fsEngine: SandboxFilesystemEngine;
    readonly worktreeEngine: WorktreeIsolationEngine;
    readonly manifestEngine: SandboxManifestEngine;
    readonly diffEngine: SandboxDiffEngine;
    readonly rollbackEngine: SandboxRollbackEngine;
    readonly reviewEngine: SandboxReviewEngine;
    readonly exportEngine: SandboxExportEngine;
    private _isStopped;
    private _stopReason;
    constructor(auditLedger?: AuditLedger, delegationRuntime?: DelegationGovernanceRuntime, leaseManager?: CapabilityLeaseManager);
    /**
     * Asserts that emergency USER_STOP is not active.
     * Khẳng định rằng lệnh dừng khẩn cấp USER_STOP không đang kích hoạt.
     */
    private assertNotStopped;
    /**
     * Activates universal USER_STOP across all sandbox operations.
     * Kích hoạt USER_STOP toàn cục trên tất cả các thao tác sandbox.
     */
    requestUserStop(reason: string): void;
    /**
     * Resets USER_STOP under Master Owner authority.
     * Thiết lập lại USER_STOP dưới quyền của Master Owner.
     */
    resetUserStop(): void;
    /**
     * Creates a new governed sandbox.
     * Tạo một sandbox mới được quản trị.
     */
    createSandbox(input: CreateSandboxInput): SandboxDescriptor;
    /**
     * Creates a file in a sandbox.
     * Tạo một tệp trong sandbox.
     */
    createFile(sandboxId: SandboxId, relativePath: string, content: string, context: FileOperationContext): SandboxFileOperation;
    /**
     * Reads a file from a sandbox.
     * Đọc một tệp từ sandbox.
     */
    readFile(sandboxId: SandboxId, relativePath: string, context: FileOperationContext): string;
    /**
     * Updates a file in a sandbox.
     * Cập nhật một tệp trong sandbox.
     */
    updateFile(sandboxId: SandboxId, relativePath: string, content: string, context: FileOperationContext): SandboxFileOperation;
    /**
     * Renames a file in a sandbox.
     * Đổi tên một tệp trong sandbox.
     */
    renameFile(sandboxId: SandboxId, oldPath: string, newPath: string, context: FileOperationContext): SandboxFileOperation;
    /**
     * Deletes a file in a sandbox.
     * Xóa một tệp trong sandbox.
     */
    deleteFile(sandboxId: SandboxId, relativePath: string, context: FileOperationContext): SandboxFileOperation;
    /**
     * Creates an isolated worktree within a sandbox.
     * Tạo một worktree cô lập bên trong sandbox.
     */
    createWorktree(input: CreateWorktreeInput): WorktreeDescriptor;
    /**
     * Generates a deterministic manifest for a sandbox.
     * Tạo bản kê khai tất định cho một sandbox.
     */
    generateManifest(sandboxId: SandboxId, context: FileOperationContext): SandboxManifest;
    /**
     * Generates a deterministic diff between two manifests.
     * Tạo bản diff tất định giữa hai bản kê khai.
     */
    generateDiff(sandboxId: SandboxId, baseManifest: SandboxManifest, targetManifest: SandboxManifest, context: FileOperationContext): SandboxDiff;
    /**
     * Rolls back all modifications in a sandbox.
     * Hoàn tác tất cả các sửa đổi trong một sandbox.
     */
    rollbackAll(sandboxId: SandboxId, context: FileOperationContext, reason?: string): SandboxRollback;
    /**
     * Reviews sandbox state and diff prior to export.
     * Đánh giá trạng thái và bản diff của sandbox trước khi xuất.
     */
    reviewSandbox(input: SandboxReviewInput): SandboxReviewRecord;
    /**
     * Exports approved sandbox changes to an authorized destination.
     * Xuất các thay đổi sandbox đã được phê duyệt sang đích được ủy quyền.
     */
    exportSandbox(input: ExecuteExportInput): SandboxExport;
    /**
     * Helper to retrieve sandbox descriptor or throw SandboxError.
     * Hàm hỗ trợ lấy bộ mô tả sandbox hoặc ném SandboxError.
     */
    private getSandboxOrThrow;
    /**
     * Appends an immutable audit event to the canonical AuditLedger.
     * Nối một sự kiện kiểm toán bất biến vào AuditLedger chuẩn tắc.
     */
    private logAudit;
    /**
     * Clears in-memory runtime components.
     * Xóa sạch các thành phần thời gian chạy trong bộ nhớ.
     */
    clear(): void;
}
export declare const globalSandboxRuntime: SandboxRuntime;
