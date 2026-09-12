import { type SandboxDescriptor, type SandboxManifest, type SandboxChange, type SandboxDiff } from './sandboxTypes.js';
import type { FileOperationContext } from './sandboxFilesystemEngine.js';
export declare class SandboxDiffEngine {
    /**
     * Calculates deterministic SHA-256 hash across sorted changes.
     * Tính toán mã băm SHA-256 tất định trên các thay đổi đã được sắp xếp.
     */
    static calculateDiffHash(changes: readonly SandboxChange[]): string;
    /**
     * Compares a base manifest against a target manifest to produce a deterministic SandboxDiff.
     * So sánh bản kê khai gốc với bản kê khai mục tiêu để tạo SandboxDiff tất định.
     */
    generateDiff(sandbox: SandboxDescriptor, baseManifest: SandboxManifest, targetManifest: SandboxManifest, context: FileOperationContext): SandboxDiff;
    /**
     * Verifies mathematical integrity of a generated diff.
     * Xác minh tính toàn vẹn toán học của một bản diff đã tạo.
     */
    verifyDiffIntegrity(diff: SandboxDiff): boolean;
}
