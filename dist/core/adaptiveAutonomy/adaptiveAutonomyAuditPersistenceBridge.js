// src/core/adaptiveAutonomy/adaptiveAutonomyAuditPersistenceBridge.ts
// BOWCON V4.0 — MS-1.5.12: NATIVE GOVERNED ADAPTIVE AUTONOMY, RECOVERY & SUPERVISED CONTINUOUS OPERATION ENGINE
// Component 1097 — REAL
//
// EN: Unified cryptographic audit chaining and crash-safe multi-tenant persistence bridge.
//     Sanitizes PII/secrets, enforces atomic writes (.tmp -> .bak -> .json), OCC version CAS,
//     and automatic corruption recovery.
// VI: Cầu nối nhật ký kiểm toán mật mã thống nhất và lưu trữ đa bên thuê an toàn khi sự cố.
//     Khử độc PII/bí mật, thực thi ghi nguyên tử (.tmp -> .bak -> .json), kiểm tra phiên bản OCC CAS,
//     và tự động phục hồi khi tệp hỏng.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AdaptiveAutonomyPersistenceError, AdaptiveAutonomyConcurrencyError, computeSha256, deterministicJsonStringify, } from './adaptiveAutonomyTypes.js';
import { AdaptiveAutonomySecurityBoundary } from './adaptiveAutonomySecurityBoundary.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
const DEFAULT_BASE_DIR = 'data/partitions_adaptive_autonomy';
export class AdaptiveAutonomyAuditPersistenceBridge {
    baseDirectory;
    securityBoundary;
    auditLog = [];
    lastAuditHash = 'GENESIS_AUDIT_HASH';
    constructor(options) {
        this.baseDirectory = options?.baseDirectory ?? DEFAULT_BASE_DIR;
        this.securityBoundary = options?.securityBoundary ?? new AdaptiveAutonomySecurityBoundary();
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    getLastAuditHash() {
        return this.lastAuditHash;
    }
    /**
     * EN: Emits and cryptographically chains a sanitized audit record.
     * VI: Phát ra và liên kết chuỗi mật mã một bản ghi kiểm toán đã khử độc.
     */
    emitAudit(eventType, tenantId, sessionId, payload) {
        // Synchronously assert security boundary at audit checkpoint
        this.securityBoundary.assertStopInactive('post_persistence', tenantId, sessionId);
        // Deep sanitize secrets and PII via globalDiagnosisSanitizer
        let sanitizedPayload = {};
        try {
            sanitizedPayload = globalDiagnosisSanitizer.sanitize(payload);
        }
        catch {
            sanitizedPayload = { sanitized: true, details: 'sanitization_applied' };
        }
        const timestamp = Date.now();
        const recordId = `audit_${sessionId}_${this.auditLog.length + 1}_${timestamp}`;
        const previousHash = this.lastAuditHash;
        const recordData = {
            recordId,
            eventType,
            tenantId,
            sessionId,
            timestamp,
            payload: sanitizedPayload,
            previousHash,
        };
        const currentHash = computeSha256(deterministicJsonStringify(recordData));
        const sealedRecord = {
            ...recordData,
            currentHash,
        };
        this.auditLog.push(sealedRecord);
        this.lastAuditHash = currentHash;
        return sealedRecord;
    }
    /**
     * EN: Verifies audit log cryptographic hash chain integrity.
     * VI: Xác minh tính toàn vẹn chuỗi băm mật mã của nhật ký kiểm toán.
     */
    verifyAuditChain() {
        let prev = 'GENESIS_AUDIT_HASH';
        for (let i = 0; i < this.auditLog.length; i++) {
            const rec = this.auditLog[i];
            if (rec.previousHash !== prev) {
                return false;
            }
            const { currentHash, ...data } = rec;
            const computed = computeSha256(deterministicJsonStringify(data));
            if (currentHash !== computed) {
                return false;
            }
            prev = currentHash;
        }
        return true;
    }
    getSessionDir(tenantId, sessionId) {
        const partition = this.securityBoundary.resolveSafePartition(tenantId.trim(), this.baseDirectory);
        const safeSessionId = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        const sessionDir = path.resolve(this.baseDirectory, partition.partitionKey, 'sessions', safeSessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        return sessionDir;
    }
    /**
     * EN: Atomically saves session document using .tmp -> verification -> .bak -> rename.
     *     Enforces strict Optimistic Concurrency Control (OCC / CAS).
     * VI: Lưu tài liệu phiên nguyên tử sử dụng .tmp -> xác minh -> .bak -> đổi tên.
     *     Thực thi Kiểm soát đồng thời lạc quan (OCC / CAS) nghiêm ngặt.
     */
    saveSession(session) {
        this.securityBoundary.assertStopInactive('pre_persistence', session.tenantId, session.sessionId);
        const sessionDir = this.getSessionDir(session.tenantId, session.sessionId);
        const primaryPath = path.resolve(sessionDir, 'adaptive_session.json');
        const backupPath = path.resolve(sessionDir, 'adaptive_session.json.bak');
        const tempPath = path.resolve(sessionDir, `.tmp.${randomUUID()}`);
        // OCC Check: if existing file exists, verify version
        if (fs.existsSync(primaryPath)) {
            try {
                const rawExisting = fs.readFileSync(primaryPath, 'utf8');
                const existing = JSON.parse(rawExisting);
                if (typeof existing.version === 'number' && session.version < existing.version) {
                    throw new AdaptiveAutonomyConcurrencyError(`OCC version conflict: incoming version ${session.version} is stale compared to stored version ${existing.version}`, session.tenantId, session.sessionId);
                }
            }
            catch (err) {
                if (err instanceof AdaptiveAutonomyConcurrencyError) {
                    throw err;
                }
                // If file was corrupt, proceed to overwrite with fresh atomic write
            }
        }
        // Sanitize session contents before persistence
        const sanitizedSession = globalDiagnosisSanitizer.sanitize(session);
        const jsonContent = deterministicJsonStringify(sanitizedSession);
        try {
            // 1. Write to temp file
            fs.writeFileSync(tempPath, jsonContent, 'utf8');
            // 2. Verify temp file checksum
            const writtenContent = fs.readFileSync(tempPath, 'utf8');
            if (writtenContent !== jsonContent) {
                throw new AdaptiveAutonomyPersistenceError('Checksum verification failed for temp session file', session.tenantId, session.sessionId);
            }
            // 3. Update backup snapshot from primary if primary exists
            if (fs.existsSync(primaryPath)) {
                try {
                    fs.copyFileSync(primaryPath, backupPath);
                }
                catch {
                    // Backup copy failure is non-fatal to atomic swap
                }
            }
            // 4. Atomic rename temp -> primary
            fs.renameSync(tempPath, primaryPath);
        }
        catch (err) {
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                }
                catch {
                    // ignore cleanup error
                }
            }
            if (err instanceof AdaptiveAutonomyConcurrencyError || err instanceof AdaptiveAutonomyPersistenceError) {
                throw err;
            }
            throw new AdaptiveAutonomyPersistenceError(`Failed to save session atomically: ${err instanceof Error ? err.message : String(err)}`, session.tenantId, session.sessionId);
        }
        this.securityBoundary.assertStopInactive('post_persistence', session.tenantId, session.sessionId);
    }
    /**
     * EN: Loads session from primary file, automatically recovering from .bak if primary is corrupted.
     * VI: Tải phiên từ tệp chính, tự động phục hồi từ .bak nếu tệp chính bị hỏng.
     */
    loadSession(tenantId, sessionId) {
        const sessionDir = this.getSessionDir(tenantId, sessionId);
        const primaryPath = path.resolve(sessionDir, 'adaptive_session.json');
        const backupPath = path.resolve(sessionDir, 'adaptive_session.json.bak');
        if (!fs.existsSync(primaryPath) && !fs.existsSync(backupPath)) {
            throw new AdaptiveAutonomyPersistenceError(`Session file not found for session ${sessionId}`, tenantId, sessionId);
        }
        // Try primary
        if (fs.existsSync(primaryPath)) {
            try {
                const content = fs.readFileSync(primaryPath, 'utf8');
                const parsed = JSON.parse(content);
                if (parsed && parsed.sessionId === sessionId && parsed.tenantId === tenantId) {
                    return parsed;
                }
                throw new Error('Corrupt or tenant-mismatched content');
            }
            catch {
                // Fallback to backup
            }
        }
        // Try backup
        if (fs.existsSync(backupPath)) {
            try {
                const backupContent = fs.readFileSync(backupPath, 'utf8');
                const parsedBackup = JSON.parse(backupContent);
                if (parsedBackup && parsedBackup.sessionId === sessionId && parsedBackup.tenantId === tenantId) {
                    // Restore primary from valid backup
                    try {
                        fs.copyFileSync(backupPath, primaryPath);
                    }
                    catch {
                        // Restore failure is non-fatal
                    }
                    return parsedBackup;
                }
            }
            catch {
                // Both primary and backup corrupted
            }
        }
        throw new AdaptiveAutonomyPersistenceError(`Double corruption detected: both primary and backup files are corrupt or missing for session ${sessionId}`, tenantId, sessionId);
    }
}
