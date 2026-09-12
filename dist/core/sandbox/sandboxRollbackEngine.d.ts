import { type SandboxDescriptor, type SandboxRollback } from './sandboxTypes.js';
import { SandboxFilesystemEngine, type FileOperationContext } from './sandboxFilesystemEngine.js';
import { SandboxPolicyEngine } from './sandboxPolicyEngine.js';
export declare class SandboxRollbackEngine {
    private readonly fsEngine;
    private readonly policyEngine;
    constructor(fsEngine: SandboxFilesystemEngine, policyEngine: SandboxPolicyEngine);
    /**
     * Rolls back all modifications in a sandbox to restore state or discard uncommitted changes.
     * Hoàn tác tất cả các sửa đổi trong một sandbox để khôi phục trạng thái hoặc hủy bỏ các thay đổi chưa commit.
     */
    rollbackAll(sandbox: SandboxDescriptor, context: FileOperationContext, reason?: string): SandboxRollback;
    /**
     * Reverts a single file to its previous content.
     * Hoàn tác một tệp đơn lẻ về nội dung trước đó của nó.
     */
    rollbackFile(sandbox: SandboxDescriptor, relativePath: string, originalContent: string | undefined, context: FileOperationContext): void;
}
