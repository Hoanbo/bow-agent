// src/core/durableCommit/durableCommitStore.ts
// BOWCON V4.0 — MS-1.4.08: DURABLE COMMIT STORE
//
// EN:
// Crash-safe, tenant-partitioned, atomic persistence store for durable commit records.
// Uses atomic temporary-file replacement, deterministic commit ID hashing, replay defense,
// and tenant isolation.
//
// VI:
// Kho lưu trữ bền vững, chống đổ vỡ, phân vùng theo tenant, nguyên tử cho các bản ghi commit.
// Sử dụng cơ chế thay thế file tạm nguyên tử, băm mã định danh commit tất định, chống replay
// và cô lập tenant nghiêm ngặt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { DuplicateCommitError, CrossTenantCommitError, CommitPersistenceError, CommitSecurityViolationError, CommitValidationError, } from './durableCommitTypes.js';
export class DurableCommitStore {
    baseDir;
    sanitizer;
    constructor(options) {
        this.baseDir = options?.baseDir ?? path.resolve(process.cwd(), 'data/partitions_durable_commits');
        this.sanitizer = options?.sanitizer ?? globalDiagnosisSanitizer;
    }
    /**
     * EN: Computes a deterministic commit ID from the authoritative identity tuple.
     */
    computeCommitId(input) {
        const raw = [
            input.tenantId.trim(),
            input.taskId.trim(),
            input.stepId.trim(),
            input.executionId.trim(),
            input.verificationId.trim(),
            String(input.taskVersion),
        ].join(':');
        const digest = crypto.createHash('sha256').update(raw, 'utf8').digest('hex').slice(0, 32);
        return `commit_${digest}`;
    }
    /**
     * EN: Resolves the tenant commits directory, ensuring it exists.
     */
    getTenantCommitsDir(tenantId) {
        if (!tenantId || typeof tenantId !== 'string' || !tenantId.trim()) {
            throw new CommitValidationError('Tenant ID must be a non-empty string');
        }
        const trimmed = tenantId.trim();
        if (trimmed.includes('..') || trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('shopofbow')) {
            throw new CommitSecurityViolationError(`Invalid tenantId '${tenantId}': forbidden sequences detected`);
        }
        const resolved = resolveUserPartition(trimmed, this.baseDir);
        const commitsDir = path.join(resolved.baseDir, resolved.partitionKey, 'commits');
        if (!fs.existsSync(commitsDir)) {
            fs.mkdirSync(commitsDir, { recursive: true });
        }
        return commitsDir;
    }
    /**
     * EN: Returns the file path for a commit record.
     */
    getCommitFilePath(tenantId, commitId) {
        if (!commitId || typeof commitId !== 'string' || !commitId.trim()) {
            throw new CommitValidationError('Commit ID must be a non-empty string');
        }
        const sanitizedCommitId = path.basename(commitId.trim());
        if (sanitizedCommitId !== commitId.trim() || commitId.includes('..') || commitId.includes('/') || commitId.includes('\\')) {
            throw new CommitSecurityViolationError(`Invalid commit ID '${commitId}': path traversal sequence detected`);
        }
        const commitsDir = this.getTenantCommitsDir(tenantId);
        return path.join(commitsDir, `${sanitizedCommitId}.json`);
    }
    /**
     * EN: Checks whether a commit already exists for a tenant.
     */
    hasCommit(tenantId, commitId) {
        const targetFile = this.getCommitFilePath(tenantId, commitId);
        return fs.existsSync(targetFile);
    }
    /**
     * EN: Saves a DurableCommitRecord to disk using atomic temporary file replacement.
     * Fails closed if the record already exists (DuplicateCommitError).
     */
    saveCommit(record) {
        if (!record || !record.commitId || !record.tenantId || !record.taskId) {
            throw new CommitValidationError('Cannot save invalid or uninitialized commit record');
        }
        const targetFile = this.getCommitFilePath(record.tenantId, record.commitId);
        // Replay / Duplicate Prevention
        if (fs.existsSync(targetFile)) {
            throw new DuplicateCommitError(`Commit '${record.commitId}' has already been persisted for tenant '${record.tenantId}'. Replay rejected.`);
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
            throw new CommitPersistenceError(`Atomic write failed for commit '${record.commitId}': ${err.message}`);
        }
    }
    /**
     * EN: Retrieves a DurableCommitRecord from disk, enforcing tenant isolation.
     */
    getCommit(tenantId, commitId) {
        const targetFile = this.getCommitFilePath(tenantId, commitId);
        if (!fs.existsSync(targetFile)) {
            return undefined;
        }
        try {
            const raw = fs.readFileSync(targetFile, 'utf8');
            const parsed = JSON.parse(raw);
            if (parsed.tenantId !== tenantId) {
                throw new CrossTenantCommitError(`Cross-tenant read violation: file belongs to tenant '${parsed.tenantId}', requested by '${tenantId}'`);
            }
            return Object.freeze(parsed);
        }
        catch (err) {
            if (err instanceof CrossTenantCommitError)
                throw err;
            throw new CommitPersistenceError(`Cannot read commit file '${targetFile}': ${err.message}`);
        }
    }
    /**
     * EN: Lists all commits for a tenant.
     */
    listCommits(tenantId) {
        const commitsDir = this.getTenantCommitsDir(tenantId);
        if (!fs.existsSync(commitsDir)) {
            return [];
        }
        const files = fs.readdirSync(commitsDir).filter((f) => f.endsWith('.json') && !f.includes('.tmp'));
        const results = [];
        for (const file of files) {
            const filePath = path.join(commitsDir, file);
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed.tenantId === tenantId) {
                    results.push(Object.freeze(parsed));
                }
            }
            catch {
                // Skip corrupted files in listing
            }
        }
        return Object.freeze(results.sort((a, b) => a.committedAt.localeCompare(b.committedAt)));
    }
}
export const globalDurableCommitStore = new DurableCommitStore();
