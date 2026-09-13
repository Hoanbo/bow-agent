import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type AgentTask, type ProvenanceCalculationInput, type RehydrationResult } from './agentTaskTypes.js';
export interface AgentTaskStoreOptions {
    readonly baseDir?: string;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class AgentTaskStore {
    private readonly baseDir;
    private readonly sanitizer;
    constructor(options?: AgentTaskStoreOptions);
    /**
     * EN: Resolves the tenant partition directory and ensures tasks subdirectory exists.
     * VI: Phân giải thư mục phân vùng tenant và đảm bảo thư mục con tasks tồn tại.
     */
    getTenantTasksDir(tenantId: string): string;
    /**
     * EN: Returns the file path for a task within its tenant partition.
     * VI: Trả về đường dẫn file cho một nhiệm vụ trong phân vùng tenant của nó.
     */
    getTaskFilePath(tenantId: string, taskId: string): string;
    /**
     * EN: Calculates canonical SHA-256 cryptographic provenance hash for a state transition.
     * VI: Tính toán mã băm provenance mật mã SHA-256 chuẩn mực cho việc chuyển đổi trạng thái.
     */
    calculateProvenanceHash(input: ProvenanceCalculationInput): string;
    /**
     * EN: Cryptographically verifies the provenance hash of an AgentTask.
     * VI: Xác minh bằng mật mã mã băm provenance của một AgentTask.
     */
    verifyTaskProvenance(task: AgentTask): boolean;
    /**
     * EN: Saves an AgentTask to disk using atomic temporary-file replacement.
     * VI: Lưu AgentTask vào đĩa sử dụng cơ chế thay thế file tạm nguyên tử.
     */
    saveTask(task: AgentTask): void;
    /**
     * EN: Reads an AgentTask from disk, enforcing tenant isolation and provenance verification.
     * VI: Đọc AgentTask từ đĩa, thực thi cô lập tenant và xác minh tính toàn vẹn provenance.
     */
    getTask(tenantId: string, taskId: string): AgentTask | undefined;
    /**
     * EN: Lists all tasks belonging to a specific tenant partition.
     * VI: Liệt kê tất cả các nhiệm vụ thuộc về phân vùng tenant cụ thể.
     */
    listTasks(tenantId: string): readonly AgentTask[];
    /**
     * EN: Rehydrates tasks from disk and performs crash recovery on interrupted tasks.
     * VI: Tái lập trạng thái nhiệm vụ từ đĩa và thực hiện phục hồi sự cố cho các nhiệm vụ bị gián đoạn.
     */
    rehydrate(tenantId: string, options?: {
        readonly isUserStopActive?: () => boolean;
    }): RehydrationResult;
    /**
     * EN: Deletes a task from disk (restricted to testing/admin purges).
     * VI: Xóa một nhiệm vụ khỏi đĩa (giới hạn cho kiểm thử / dọn dẹp admin).
     */
    deleteTask(tenantId: string, taskId: string): boolean;
}
