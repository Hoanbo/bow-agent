import { type SandboxDescriptor, type SandboxManifest, type SandboxDiff, type SandboxExport } from './sandboxTypes.js';
import type { SandboxReviewRecord } from './sandboxReviewEngine.js';
import { AuditLedger } from '../auditLedger.js';
export interface ExecuteExportInput {
    readonly sandbox: SandboxDescriptor;
    readonly review: SandboxReviewRecord;
    readonly manifest: SandboxManifest;
    readonly diff: SandboxDiff;
    readonly targetProjectRoot: string;
    readonly exportedBy: string;
}
export declare class SandboxExportEngine {
    private readonly auditLedger;
    private exports;
    constructor(auditLedger?: AuditLedger);
    /**
     * Governed export of validated sandbox changes to an authorized project destination.
     * Xuất các thay đổi sandbox đã được xác thực sang đích dự án được ủy quyền dưới sự quản trị.
     */
    exportChanges(input: ExecuteExportInput): SandboxExport;
    /**
     * Retrieves an export record by id.
     * Lấy bản ghi xuất theo định danh.
     */
    getExport(exportId: string): SandboxExport | undefined;
    /**
     * Clears recorded exports.
     * Xóa danh sách bản ghi xuất.
     */
    clear(): void;
}
