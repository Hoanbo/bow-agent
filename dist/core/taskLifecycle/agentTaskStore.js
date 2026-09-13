// src/core/taskLifecycle/agentTaskStore.ts
// BOWCON V4.0 — MS-1.4.01: AGENT TASK LIFECYCLE & STATE ENGINE STORE
//
// EN:
// Durable, tenant-partitioned, crash-safe store for Agent Tasks.
// Enforces atomic file replacement, SHA-256 provenance calculation and verification,
// fail-closed tamper detection, and crash recovery rehydration.
//
// VI:
// Kho lưu trữ phân vùng theo tenant, chống đổ vỡ cho Nhiệm vụ Agent.
// Thực thi ghi đè file nguyên tử, tính toán và xác minh provenance SHA-256,
// phát hiện can thiệp fail-closed và tái lập phục hồi sau sự cố.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { CrossTenantAccessViolationError, ProvenanceTamperError, TaskValidationError, } from './agentTaskTypes.js';
export class AgentTaskStore {
    baseDir;
    sanitizer;
    constructor(options) {
        this.baseDir = options?.baseDir ?? path.resolve(process.cwd(), 'data/partitions_agent_tasks');
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * EN: Resolves the tenant partition directory and ensures tasks subdirectory exists.
     * VI: Phân giải thư mục phân vùng tenant và đảm bảo thư mục con tasks tồn tại.
     */
    getTenantTasksDir(tenantId) {
        if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
            throw new TaskValidationError('Tenant ID must be a non-empty string');
        }
        const resolved = resolveUserPartition(tenantId.trim(), this.baseDir);
        const tasksDir = path.join(resolved.baseDir, resolved.partitionKey, 'tasks');
        if (!fs.existsSync(tasksDir)) {
            fs.mkdirSync(tasksDir, { recursive: true });
        }
        return tasksDir;
    }
    /**
     * EN: Returns the file path for a task within its tenant partition.
     * VI: Trả về đường dẫn file cho một nhiệm vụ trong phân vùng tenant của nó.
     */
    getTaskFilePath(tenantId, taskId) {
        if (!taskId || typeof taskId !== 'string' || !taskId.trim()) {
            throw new TaskValidationError('Task ID must be a non-empty string');
        }
        // Prevent filename path traversal on taskId
        const sanitizedTaskId = path.basename(taskId.trim());
        if (sanitizedTaskId !== taskId.trim() || taskId.includes('..') || taskId.includes('/') || taskId.includes('\\')) {
            throw new TaskValidationError(`Invalid task ID '${taskId}': path traversal sequence detected`);
        }
        const tasksDir = this.getTenantTasksDir(tenantId);
        return path.join(tasksDir, `${sanitizedTaskId}.json`);
    }
    /**
     * EN: Calculates canonical SHA-256 cryptographic provenance hash for a state transition.
     * VI: Tính toán mã băm provenance mật mã SHA-256 chuẩn mực cho việc chuyển đổi trạng thái.
     */
    calculateProvenanceHash(input) {
        const canonicalStr = [
            input.taskId,
            input.tenantId,
            input.state,
            String(input.version),
            input.timestamp,
            input.previousHash,
        ].join(':');
        return crypto.createHash('sha256').update(canonicalStr, 'utf8').digest('hex');
    }
    /**
     * EN: Cryptographically verifies the provenance hash of an AgentTask.
     * VI: Xác minh bằng mật mã mã băm provenance của một AgentTask.
     */
    verifyTaskProvenance(task) {
        if (!task || !task.provenanceHash || typeof task.provenanceHash !== 'string' || task.provenanceHash.length !== 64) {
            return false;
        }
        const previousHash = task.previousProvenanceHash ?? '0000000000000000000000000000000000000000000000000000000000000000';
        const expected = this.calculateProvenanceHash({
            taskId: task.taskId,
            tenantId: task.tenantId,
            state: task.state,
            version: task.version,
            timestamp: task.updatedAt,
            previousHash,
        });
        return task.provenanceHash === expected;
    }
    /**
     * EN: Saves an AgentTask to disk using atomic temporary-file replacement.
     * VI: Lưu AgentTask vào đĩa sử dụng cơ chế thay thế file tạm nguyên tử.
     */
    saveTask(task) {
        if (!task || !task.taskId || !task.tenantId) {
            throw new TaskValidationError('Cannot save invalid or uninitialized task record');
        }
        const targetFile = this.getTaskFilePath(task.tenantId, task.taskId);
        const sanitized = this.sanitizer.sanitize(task);
        const payload = JSON.stringify(sanitized, null, 2);
        const tempFile = `${targetFile}.${crypto.randomBytes(6).toString('hex')}.tmp`;
        try {
            fs.writeFileSync(tempFile, payload, 'utf8');
            fs.renameSync(tempFile, targetFile);
        }
        catch (err) {
            if (fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                }
                catch { }
            }
            throw err;
        }
    }
    /**
     * EN: Reads an AgentTask from disk, enforcing tenant isolation and provenance verification.
     * VI: Đọc AgentTask từ đĩa, thực thi cô lập tenant và xác minh tính toàn vẹn provenance.
     */
    getTask(tenantId, taskId) {
        const targetFile = this.getTaskFilePath(tenantId, taskId);
        if (!fs.existsSync(targetFile)) {
            return undefined;
        }
        const raw = fs.readFileSync(targetFile, 'utf8');
        const task = JSON.parse(raw);
        if (task.tenantId !== tenantId) {
            throw new CrossTenantAccessViolationError(tenantId, task.tenantId, taskId);
        }
        if (!this.verifyTaskProvenance(task)) {
            throw new ProvenanceTamperError(task.taskId, 'valid_sha256_provenance', task.provenanceHash);
        }
        return task;
    }
    /**
     * EN: Lists all tasks belonging to a specific tenant partition.
     * VI: Liệt kê tất cả các nhiệm vụ thuộc về phân vùng tenant cụ thể.
     */
    listTasks(tenantId) {
        const tasksDir = this.getTenantTasksDir(tenantId);
        if (!fs.existsSync(tasksDir)) {
            return [];
        }
        const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.json') && !f.includes('.tmp'));
        const results = [];
        for (const file of files) {
            const filePath = path.join(tasksDir, file);
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                const task = JSON.parse(raw);
                if (task.tenantId === tenantId) {
                    results.push(task);
                }
            }
            catch {
                // Skip corrupted or unreadable files in listing
            }
        }
        return Object.freeze(results.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    }
    /**
     * EN: Rehydrates tasks from disk and performs crash recovery on interrupted tasks.
     * VI: Tái lập trạng thái nhiệm vụ từ đĩa và thực hiện phục hồi sự cố cho các nhiệm vụ bị gián đoạn.
     */
    rehydrate(tenantId, options) {
        const tasksDir = this.getTenantTasksDir(tenantId);
        const files = fs.readdirSync(tasksDir).filter((f) => f.endsWith('.json') && !f.includes('.tmp'));
        const rehydrated = [];
        const recovered = [];
        const errors = [];
        const isUserStop = options?.isUserStopActive?.() ?? false;
        for (const file of files) {
            const filePath = path.join(tasksDir, file);
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                const task = JSON.parse(raw);
                if (task.tenantId !== tenantId) {
                    throw new CrossTenantAccessViolationError(tenantId, task.tenantId, task.taskId);
                }
                // Cryptographically verify that provenance hash is unbroken and untampered
                if (!this.verifyTaskProvenance(task)) {
                    throw new ProvenanceTamperError(task.taskId, 'valid_sha256_provenance', task.provenanceHash ?? 'none');
                }
                // Crash recovery logic:
                // If a task was interrupted in PLANNING or EXECUTING
                if (task.state === 'PLANNING' || task.state === 'EXECUTING') {
                    if (isUserStop) {
                        // USER_STOP is active: Do NOT perform autonomous recovery mutation
                        rehydrated.push(task);
                    }
                    else {
                        // Recover interrupted task into PAUSED
                        const recoveredVersion = task.version + 1;
                        const nowIso = new Date().toISOString();
                        const newProvenance = this.calculateProvenanceHash({
                            taskId: task.taskId,
                            tenantId: task.tenantId,
                            state: 'PAUSED',
                            version: recoveredVersion,
                            timestamp: nowIso,
                            previousHash: task.provenanceHash,
                        });
                        const recoveredTask = {
                            ...task,
                            state: 'PAUSED',
                            version: recoveredVersion,
                            updatedAt: nowIso,
                            recoveryReason: 'UNEXPECTED_PROCESS_RESTART_RECOVERED',
                            previousProvenanceHash: task.provenanceHash,
                            provenanceHash: newProvenance,
                        };
                        this.saveTask(recoveredTask);
                        recovered.push(recoveredTask);
                        rehydrated.push(recoveredTask);
                    }
                }
                else {
                    rehydrated.push(task);
                }
            }
            catch (err) {
                errors.push(`[REHYDRATION_ERROR] File '${file}': ${err?.message ?? String(err)}`);
                if (err instanceof ProvenanceTamperError || err instanceof CrossTenantAccessViolationError) {
                    throw err; // Fail closed on security/provenance violations
                }
            }
        }
        return {
            rehydrated: Object.freeze(rehydrated),
            recovered: Object.freeze(recovered),
            errors: Object.freeze(errors),
        };
    }
    /**
     * EN: Deletes a task from disk (restricted to testing/admin purges).
     * VI: Xóa một nhiệm vụ khỏi đĩa (giới hạn cho kiểm thử / dọn dẹp admin).
     */
    deleteTask(tenantId, taskId) {
        const targetFile = this.getTaskFilePath(tenantId, taskId);
        if (fs.existsSync(targetFile)) {
            fs.unlinkSync(targetFile);
            return true;
        }
        return false;
    }
}
