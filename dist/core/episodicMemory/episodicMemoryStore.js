// src/core/episodicMemory/episodicMemoryStore.ts
// BOWCON V4.0 — MS-1.4.09: EPISODIC MEMORY STORE
//
// EN:
// Crash-safe, tenant-partitioned, atomic persistence store for episodic memory records.
// Uses atomic temporary-file replacement, deterministic memory ID hashing, replay defense,
// and tenant isolation.
//
// VI:
// Kho lưu trữ bộ nhớ episodic bền vững, chống đổ vỡ, phân vùng theo tenant, nguyên tử.
// Sử dụng cơ chế thay thế file tạm nguyên tử, băm mã định danh bộ nhớ tất định, chống replay
// và cô lập tenant nghiêm ngặt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { DuplicateMemoryError, CrossTenantMemoryError, MemoryPersistenceError, MemorySecurityViolationError, MemoryValidationError, } from './episodicMemoryTypes.js';
export class EpisodicMemoryStore {
    baseDir;
    sanitizer;
    constructor(options) {
        this.baseDir = options?.baseDir ?? path.resolve(process.cwd(), 'data/partitions_episodic_memory');
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * EN: Computes a deterministic memory ID from the authoritative identity tuple.
     */
    computeMemoryId(input) {
        const raw = [
            input.tenantId.trim(),
            input.taskId.trim(),
            input.stepId.trim(),
            input.executionId.trim(),
            input.commitId.trim(),
            String(input.taskVersion),
        ].join(':');
        const digest = crypto.createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 32);
        return `mem_${digest}`;
    }
    /**
     * EN: Resolves the tenant memory directory, ensuring it exists.
     */
    getTenantMemoryDir(tenantId) {
        if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
            throw new MemoryValidationError('Tenant ID must be a non-empty string');
        }
        const trimmed = tenantId.trim();
        if (trimmed.includes('..') ||
            trimmed.includes('/') ||
            trimmed.includes('\\') ||
            trimmed.includes('\0') ||
            trimmed.includes('shopofbow')) {
            throw new MemorySecurityViolationError(`Invalid tenantId '${tenantId}': forbidden sequences detected`);
        }
        const resolved = resolveUserPartition(trimmed, this.baseDir);
        const memoryDir = path.join(resolved.baseDir, resolved.partitionKey, 'events');
        if (!fs.existsSync(memoryDir)) {
            fs.mkdirSync(memoryDir, { recursive: true });
        }
        return memoryDir;
    }
    /**
     * EN: Returns the file path for an episodic memory record.
     */
    getMemoryFilePath(tenantId, memoryId) {
        if (!memoryId || typeof memoryId !== 'string' || !memoryId.trim()) {
            throw new MemoryValidationError('Memory ID must be a non-empty string');
        }
        const trimmed = memoryId.trim();
        const sanitizedMemoryId = path.basename(trimmed);
        if (sanitizedMemoryId !== trimmed ||
            trimmed.includes('..') ||
            trimmed.includes('/') ||
            trimmed.includes('\\') ||
            trimmed.includes('\0')) {
            throw new MemorySecurityViolationError(`Invalid memory ID '${memoryId}': path traversal sequence detected`);
        }
        const memoryDir = this.getTenantMemoryDir(tenantId);
        return path.join(memoryDir, `${sanitizedMemoryId}.json`);
    }
    /**
     * EN: Checks whether a memory record already exists for a tenant.
     */
    hasMemory(tenantId, memoryId) {
        const targetFile = this.getMemoryFilePath(tenantId, memoryId);
        return fs.existsSync(targetFile);
    }
    /**
     * EN: Saves an EpisodicMemoryRecord to disk using atomic temporary file replacement.
     * Fails closed if the record already exists (DuplicateMemoryError).
     */
    saveMemory(record) {
        if (!record || !record.memoryId || !record.tenantId || !record.taskId || !record.commitId) {
            throw new MemoryValidationError('Cannot save invalid or uninitialized memory record');
        }
        const targetFile = this.getMemoryFilePath(record.tenantId, record.memoryId);
        // Replay / Duplicate Prevention
        if (fs.existsSync(targetFile)) {
            throw new DuplicateMemoryError(`Memory record '${record.memoryId}' has already been persisted for tenant '${record.tenantId}'. Replay rejected.`);
        }
        const sanitized = this.sanitizer.sanitize(record);
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
            throw new MemoryPersistenceError(`Atomic write failed for memory '${record.memoryId}': ${err.message}`);
        }
    }
    /**
     * EN: Retrieves an EpisodicMemoryRecord from disk, enforcing tenant isolation.
     */
    getMemory(tenantId, memoryId) {
        const targetFile = this.getMemoryFilePath(tenantId, memoryId);
        if (!fs.existsSync(targetFile)) {
            return undefined;
        }
        try {
            const raw = fs.readFileSync(targetFile, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed.tenantId !== tenantId) {
                throw new CrossTenantMemoryError(`Tenant isolation violation: record belongs to '${parsed.tenantId}' but requested by '${tenantId}'`);
            }
            return parsed;
        }
        catch (err) {
            if (err instanceof CrossTenantMemoryError) {
                throw err;
            }
            throw new MemoryPersistenceError(`Failed reading memory record '${memoryId}': ${err.message}`);
        }
    }
    /**
     * EN: Lists all episodic memory records for a tenant, optionally filtered by taskId.
     */
    listMemories(tenantId, taskId) {
        const memoryDir = this.getTenantMemoryDir(tenantId);
        if (!fs.existsSync(memoryDir)) {
            return [];
        }
        const files = fs.readdirSync(memoryDir).filter((f) => f.endsWith('.json'));
        const results = [];
        for (const file of files) {
            const fullPath = path.join(memoryDir, file);
            try {
                const raw = fs.readFileSync(fullPath, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed.tenantId !== tenantId) {
                    continue; // skip mismatched
                }
                if (!taskId || parsed.taskId === taskId) {
                    results.push(parsed);
                }
            }
            catch {
                // Skip unreadable files
            }
        }
        return results.sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
    }
}
export const globalEpisodicMemoryStore = new EpisodicMemoryStore();
