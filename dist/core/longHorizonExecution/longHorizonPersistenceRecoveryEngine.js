// src/core/longHorizonExecution/longHorizonPersistenceRecoveryEngine.ts
// BOWCON V4.0 — MS-1.5.11: LONG-HORIZON PERSISTENCE & RECOVERY ENGINE
// Component 1086 — REAL
//
// EN: Multi-tenant partitioned, crash-safe persistence engine with OCC CAS enforcement,
//     atomic .tmp -> .bak -> rename snapshots, and automatic corrupted state recovery.
// VI: Động cơ lưu trữ phân vùng đa người thuê, an toàn khi sự cố với thực thi OCC CAS,
//     ảnh chụp nguyên tử .tmp -> .bak -> đổi tên và tự động phục hồi trạng thái bị hỏng.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { LongHorizonPersistenceError, LongHorizonConcurrencyError, computeLongHorizonDocumentProvenanceHash, } from './longHorizonExecutionTypes.js';
import { LongHorizonExecutionValidator } from './longHorizonExecutionValidator.js';
import { LongHorizonAutonomySecurityBoundary } from './longHorizonAutonomySecurityBoundary.js';
const DEFAULT_BASE_DIR = 'data/partitions_long_horizon';
export class LongHorizonPersistenceRecoveryEngine {
    baseDirectory;
    securityBoundary;
    constructor(options) {
        this.baseDirectory = options?.baseDirectory ?? DEFAULT_BASE_DIR;
        this.securityBoundary = new LongHorizonAutonomySecurityBoundary({
            userStopProvider: options?.userStopProvider,
        });
    }
    getSessionDir(tenantId, sessionId) {
        const partition = this.securityBoundary.resolveSafePartition(tenantId.trim(), this.baseDirectory);
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
        const canonicalPath = path.join(sessionDir, 'long_horizon_session.json');
        const backupPath = path.join(sessionDir, 'long_horizon_session.json.bak');
        const legacyCanonical = path.join(sessionDir, 'session.json');
        const legacyBackup = path.join(sessionDir, 'session.json.bak');
        // 1. Attempt canonical load
        if (fs.existsSync(canonicalPath)) {
            try {
                const raw = fs.readFileSync(canonicalPath, 'utf8');
                const doc = JSON.parse(raw);
                LongHorizonExecutionValidator.validateSessionDocument(doc);
                this.securityBoundary.assertIsolation(tenantId, sessionId, doc.session.tenantId, doc.session.sessionId);
                return Object.assign(doc, {
                    version: doc.sessionVersion ?? doc.session.sessionVersion ?? doc.session.version ?? 1,
                    sessionId: doc.sessionId ?? doc.session.sessionId,
                    tenantId: doc.tenantId ?? doc.session.tenantId,
                });
            }
            catch {
                // Canonical corrupt; fall through directly to backup recovery
            }
        }
        else if (fs.existsSync(legacyCanonical)) {
            try {
                const raw = fs.readFileSync(legacyCanonical, 'utf8');
                const doc = JSON.parse(raw);
                LongHorizonExecutionValidator.validateSessionDocument(doc);
                this.securityBoundary.assertIsolation(tenantId, sessionId, doc.session.tenantId, doc.session.sessionId);
                return Object.assign(doc, {
                    version: doc.sessionVersion ?? doc.session.sessionVersion ?? doc.session.version ?? 1,
                    sessionId: doc.sessionId ?? doc.session.sessionId,
                    tenantId: doc.tenantId ?? doc.session.tenantId,
                });
            }
            catch {
                // Fall through to backup
            }
        }
        // 2. Attempt backup recovery
        const backupCandidates = [backupPath, legacyBackup];
        for (const bPath of backupCandidates) {
            if (fs.existsSync(bPath)) {
                try {
                    const raw = fs.readFileSync(bPath, 'utf8');
                    const doc = JSON.parse(raw);
                    LongHorizonExecutionValidator.validateSessionDocument(doc);
                    this.securityBoundary.assertIsolation(tenantId, sessionId, doc.session.tenantId, doc.session.sessionId);
                    // Restore canonical file from backup
                    fs.copyFileSync(bPath, canonicalPath);
                    return Object.assign(doc, {
                        version: doc.sessionVersion ?? doc.session.sessionVersion ?? doc.session.version ?? 1,
                        sessionId: doc.sessionId ?? doc.session.sessionId,
                        tenantId: doc.tenantId ?? doc.session.tenantId,
                    });
                }
                catch {
                    // Continue or fail closed
                }
            }
        }
        // If neither exists or both corrupted, fail closed
        throw new LongHorizonPersistenceError(`No valid session document found for tenant "${tenantId}" and session "${sessionId}" (both canonical and backup corrupted or absent)`);
    }
    /**
     * EN: Checks if a session document exists on disk.
     * VI: Kiểm tra xem tài liệu phiên có tồn tại trên đĩa không.
     */
    hasSessionDocument(tenantId, sessionId) {
        try {
            const sessionDir = this.getSessionDir(tenantId, sessionId);
            return (fs.existsSync(path.join(sessionDir, 'long_horizon_session.json')) ||
                fs.existsSync(path.join(sessionDir, 'session.json')) ||
                fs.existsSync(path.join(sessionDir, 'long_horizon_session.json.bak')) ||
                fs.existsSync(path.join(sessionDir, 'session.json.bak')));
        }
        catch {
            return false;
        }
    }
    /**
     * EN: Saves session document atomically with OCC CAS enforcement (.tmp -> .bak -> rename).
     * VI: Lưu tài liệu phiên nguyên tử với thực thi OCC CAS (.tmp -> .bak -> đổi tên).
     */
    saveSessionDocument(doc, expectedVersion) {
        // 1. Synchronous Checkpoint: pre_persistence USER_STOP
        this.securityBoundary.assertUserStop('pre_persistence');
        const session = doc.session;
        const sessionDir = this.getSessionDir(session.tenantId, session.sessionId);
        const primaryCanonical = path.join(sessionDir, 'long_horizon_session.json');
        const primaryBackup = path.join(sessionDir, 'long_horizon_session.json.bak');
        const legacyCanonical = path.join(sessionDir, 'session.json');
        const legacyBackup = path.join(sessionDir, 'session.json.bak');
        // 2. OCC / CAS check against current on-disk document
        const checkOCC = (filePath) => {
            if (fs.existsSync(filePath)) {
                try {
                    const existingRaw = fs.readFileSync(filePath, 'utf8');
                    const existingDoc = JSON.parse(existingRaw);
                    const existingVersion = existingDoc.sessionVersion ?? existingDoc.session?.sessionVersion ?? existingDoc.session?.version ?? 1;
                    const incomingVersion = doc.sessionVersion ?? session.sessionVersion ?? session.version ?? 1;
                    if (expectedVersion !== undefined && existingVersion !== expectedVersion) {
                        throw new LongHorizonConcurrencyError(`OCC CAS conflict saving session "${session.sessionId}": expected version ${expectedVersion}, but found ${existingVersion}`);
                    }
                    if (incomingVersion < existingVersion && expectedVersion === undefined) {
                        throw new LongHorizonConcurrencyError(`OCC CAS conflict saving session "${session.sessionId}": incoming version ${incomingVersion} is less than existing version ${existingVersion}`);
                    }
                }
                catch (err) {
                    if (err instanceof LongHorizonConcurrencyError) {
                        throw err;
                    }
                }
            }
        };
        checkOCC(primaryCanonical);
        checkOCC(legacyCanonical);
        // 3. Validate document before persistence
        LongHorizonExecutionValidator.sanitizeAndValidateData(doc, 'sessionDocument');
        LongHorizonExecutionValidator.validateSessionDocument(doc);
        const serialized = JSON.stringify(doc, null, 2);
        const tmpFile = path.join(sessionDir, `session.json.tmp.${crypto.randomUUID()}`);
        try {
            // 4. Write to temp file
            fs.writeFileSync(tmpFile, serialized, 'utf8');
            // 5. Verify written file integrity
            const readBack = fs.readFileSync(tmpFile, 'utf8');
            if (readBack !== serialized) {
                throw new LongHorizonPersistenceError('Temp file verification checksum mismatch');
            }
            // 6. Snapshot current canonical to backup
            if (fs.existsSync(primaryCanonical)) {
                try {
                    fs.copyFileSync(primaryCanonical, primaryBackup);
                }
                catch {
                    // Non-fatal
                }
            }
            // 7. Atomic rename to primary canonical
            fs.renameSync(tmpFile, primaryCanonical);
        }
        finally {
            if (fs.existsSync(tmpFile)) {
                try {
                    fs.unlinkSync(tmpFile);
                }
                catch {
                    // Ignore
                }
            }
        }
    }
    /**
     * EN: Persists session or document directly with full OCC support.
     * VI: Lưu trực tiếp phiên hoặc tài liệu với hỗ trợ OCC đầy đủ.
     */
    persistSessionDocument(sessionOrDoc, expectedVersion) {
        // 1. Synchronous Checkpoint: pre_persistence USER_STOP
        this.securityBoundary.assertUserStop('pre_persistence');
        if (!sessionOrDoc || typeof sessionOrDoc !== 'object') {
            throw new LongHorizonPersistenceError('Cannot persist null or non-object session');
        }
        const tenantId = sessionOrDoc.tenantId ?? sessionOrDoc.session?.tenantId;
        const sessionId = sessionOrDoc.sessionId ?? sessionOrDoc.session?.sessionId;
        // Validate path traversal immediately
        this.securityBoundary.resolveSafePartition(tenantId, this.baseDirectory);
        if (sessionOrDoc.session && sessionOrDoc.sessionVersion !== undefined) {
            this.saveSessionDocument(sessionOrDoc, expectedVersion);
        }
        else {
            const session = sessionOrDoc;
            const incomingVer = session.version !== undefined
                ? session.version
                : session.sessionVersion ?? 1;
            const timestamp = new Date().toISOString();
            const rawDoc = {
                schemaVersion: '4.0.0',
                session: { ...session, sessionVersion: incomingVer },
                sessionVersion: incomingVer,
                updatedAt: timestamp,
            };
            const documentHash = computeLongHorizonDocumentProvenanceHash(rawDoc);
            const doc = Object.freeze({
                ...rawDoc,
                documentHash,
            });
            this.saveSessionDocument(doc, expectedVersion);
        }
    }
    /**
     * EN: Initializes a brand new session document on disk.
     * VI: Khởi tạo một tài liệu phiên hoàn toàn mới trên đĩa.
     */
    initializeSession(session) {
        this.securityBoundary.assertUserStop('pre_persistence');
        LongHorizonExecutionValidator.validateSession(session);
        const timestamp = new Date().toISOString();
        const rawDoc = {
            schemaVersion: '4.0.0',
            session,
            sessionVersion: session.sessionVersion,
            updatedAt: timestamp,
        };
        const documentHash = computeLongHorizonDocumentProvenanceHash(rawDoc);
        const doc = Object.freeze({
            ...rawDoc,
            documentHash,
        });
        this.saveSessionDocument(doc, undefined);
        return doc;
    }
}
