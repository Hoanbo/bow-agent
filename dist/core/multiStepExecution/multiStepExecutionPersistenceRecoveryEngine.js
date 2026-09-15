// src/core/multiStepExecution/multiStepExecutionPersistenceRecoveryEngine.ts
// BOWCON V4.0 — MS-1.5.10: MULTI-STEP EXECUTION PERSISTENCE & RECOVERY ENGINE
// Component 1076 — REAL
//
// EN: Multi-tenant, crash-safe persistence and recovery engine for multi-step execution sessions.
//     Enforces atomic write sequences (.tmp -> .bak -> rename), OCC CAS versioning,
//     and automatic corruption recovery. Never uses last-write-wins; fails closed on double corruption.
// VI: Động cơ lưu trữ và phục hồi đa bên thuê, an toàn khi gặp sự cố cho các phiên thực thi nhiều bước.
//     Thực thi chuỗi ghi nguyên tử (.tmp -> .bak -> đổi tên), phiên bản OCC CAS,
//     và tự động phục hồi khi hỏng dữ liệu. Không bao giờ dùng last-write-wins; đóng lỗi khi hỏng kép.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { MultiStepExecutionPersistenceError, MultiStepExecutionConcurrencyError, computeSessionDocumentProvenanceHash, MULTI_STEP_EXECUTION_SCHEMA_VERSION, } from './multiStepExecutionTypes.js';
import { MultiStepExecutionValidator } from './multiStepExecutionValidator.js';
import { MultiStepExecutionSecurityBoundary } from './multiStepExecutionSecurityBoundary.js';
export class MultiStepExecutionPersistenceRecoveryEngine {
    baseDirectory;
    userStopProvider;
    securityBoundary;
    constructor(options) {
        this.baseDirectory = options?.baseDirectory ?? 'data/partitions_multi_step_execution';
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this.securityBoundary = new MultiStepExecutionSecurityBoundary({ userStopProvider: this.userStopProvider });
    }
    /**
     * EN: Resolves safe session directory under tenant partition.
     * VI: Giải quyết thư mục phiên an toàn dưới phân vùng bên thuê.
     */
    getSessionDir(tenantId, sessionId) {
        const partition = resolveUserPartition(tenantId.trim(), this.baseDirectory);
        const safeSessionId = this.sanitizeSessionId(sessionId);
        const sessionDir = path.resolve(this.baseDirectory, partition.partitionKey, 'sessions', safeSessionId);
        if (!fs.existsSync(sessionDir)) {
            fs.mkdirSync(sessionDir, { recursive: true });
        }
        return sessionDir;
    }
    sanitizeSessionId(sessionId) {
        return sessionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
    }
    /**
     * EN: Loads session document from disk, recovering from .bak if canonical is corrupt.
     * VI: Tải tài liệu phiên từ đĩa, phục hồi từ .bak nếu tệp chính tắc bị hỏng.
     */
    loadSessionDocument(tenantId, sessionId) {
        const sessionDir = this.getSessionDir(tenantId, sessionId);
        const canonicalPath = path.join(sessionDir, 'session.json');
        const backupPath = path.join(sessionDir, 'session.json.bak');
        // 1. Attempt canonical load
        if (fs.existsSync(canonicalPath)) {
            try {
                const raw = fs.readFileSync(canonicalPath, 'utf8');
                const doc = JSON.parse(raw);
                MultiStepExecutionValidator.validateSessionDocument(doc);
                this.securityBoundary.assertIsolation(tenantId, sessionId, doc.session.tenantId, doc.session.sessionId);
                return doc;
            }
            catch {
                // Canonical corrupt; fall through to backup recovery
            }
        }
        // 2. Attempt backup recovery
        if (fs.existsSync(backupPath)) {
            try {
                const raw = fs.readFileSync(backupPath, 'utf8');
                const doc = JSON.parse(raw);
                MultiStepExecutionValidator.validateSessionDocument(doc);
                this.securityBoundary.assertIsolation(tenantId, sessionId, doc.session.tenantId, doc.session.sessionId);
                // Restore canonical from backup
                fs.copyFileSync(backupPath, canonicalPath);
                return doc;
            }
            catch {
                // Both corrupt; fail closed
            }
        }
        // If neither exists, throw or initialize empty
        throw new MultiStepExecutionPersistenceError(`No valid session document found for tenant "${tenantId}" and session "${sessionId}"`);
    }
    /**
     * EN: Checks if a session document exists on disk.
     * VI: Kiểm tra xem tài liệu phiên có tồn tại trên đĩa không.
     */
    hasSessionDocument(tenantId, sessionId) {
        const sessionDir = this.getSessionDir(tenantId, sessionId);
        const canonicalPath = path.join(sessionDir, 'session.json');
        const backupPath = path.join(sessionDir, 'session.json.bak');
        return fs.existsSync(canonicalPath) || fs.existsSync(backupPath);
    }
    /**
     * EN: Saves session document atomically with OCC CAS enforcement (.tmp -> .bak -> rename).
     * VI: Lưu tài liệu phiên nguyên tử với thực thi OCC CAS (.tmp -> .bak -> đổi tên).
     */
    saveSessionDocument(doc, expectedVersion) {
        // 1. Synchronous Checkpoint: pre_persistence USER_STOP
        this.securityBoundary.assertUserStop('pre_persistence');
        const { session } = doc;
        const sessionDir = this.getSessionDir(session.tenantId, session.sessionId);
        const canonicalPath = path.join(sessionDir, 'session.json');
        const backupPath = path.join(sessionDir, 'session.json.bak');
        // 2. OCC / CAS check against current on-disk document
        if (fs.existsSync(canonicalPath)) {
            try {
                const existingRaw = fs.readFileSync(canonicalPath, 'utf8');
                const existingDoc = JSON.parse(existingRaw);
                if (expectedVersion !== undefined && existingDoc.sessionVersion !== expectedVersion) {
                    throw new MultiStepExecutionConcurrencyError(`OCC CAS conflict saving session "${session.sessionId}": expected version ${expectedVersion}, but found ${existingDoc.sessionVersion}`);
                }
            }
            catch (err) {
                if (err instanceof MultiStepExecutionConcurrencyError) {
                    throw err;
                }
                // If file read/parse failed, proceed with backup snapshot
            }
        }
        // 3. Validate against prototype pollution, injection, and CoT leakage before persistence
        MultiStepExecutionValidator.sanitizeAndValidateData(doc, 'sessionDocument');
        MultiStepExecutionValidator.validateSessionDocument(doc);
        const serialized = JSON.stringify(doc, null, 2);
        const tmpFile = path.join(sessionDir, `session.json.tmp.${crypto.randomUUID()}`);
        try {
            // 4. Write to temp file
            fs.writeFileSync(tmpFile, serialized, 'utf8');
            // 5. Verify written file integrity
            const readBack = fs.readFileSync(tmpFile, 'utf8');
            if (readBack !== serialized) {
                throw new MultiStepExecutionPersistenceError('Temp file verification checksum mismatch');
            }
            // 6. Snapshot current canonical to .bak if exists
            if (fs.existsSync(canonicalPath)) {
                fs.copyFileSync(canonicalPath, backupPath);
            }
            // 7. Atomic replace
            fs.renameSync(tmpFile, canonicalPath);
        }
        catch (err) {
            if (fs.existsSync(tmpFile)) {
                try {
                    fs.unlinkSync(tmpFile);
                }
                catch {
                    // ignore cleanup error
                }
            }
            throw new MultiStepExecutionPersistenceError(`Failed atomic persistence for session: ${err.message}`);
        }
    }
    /**
     * EN: Creates and atomically persists an initial session document.
     * VI: Tạo và lưu trữ nguyên tử tài liệu phiên ban đầu.
     */
    initializeSession(session) {
        this.securityBoundary.assertUserStop('pre_persistence');
        MultiStepExecutionValidator.validateSession(session);
        const timestamp = new Date().toISOString();
        const rawDoc = {
            schemaVersion: MULTI_STEP_EXECUTION_SCHEMA_VERSION,
            session,
            activeGeneration: session.generations[0],
            replanningRequests: [],
            environmentSnapshots: [],
            executionResults: [],
            sessionVersion: session.sessionVersion,
            updatedAt: timestamp,
        };
        const provenanceHash = computeSessionDocumentProvenanceHash(rawDoc);
        const sealedDoc = Object.freeze({
            ...rawDoc,
            provenanceHash,
        });
        this.saveSessionDocument(sealedDoc);
        return sealedDoc;
    }
}
