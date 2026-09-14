// src/core/groundedPlanning/groundedPlanPersistenceRecoveryEngine.ts
// BOWCON V4.0 — MS-1.5.07: GROUNDED PLAN PERSISTENCE & RECOVERY ENGINE
// Component 1046 — REAL
//
// EN: Multi-tenant, crash-safe persistence and recovery engine for grounded action plans.
//     Enforces atomic write sequences (.tmp -> .bak -> rename), OCC CAS versioning, and provenance validation.
// VI: Động cơ lưu trữ và phục hồi đa bên thuê, an toàn khi gặp sự cố cho kế hoạch hành động gắn kết.
//     Thực thi chuỗi ghi nguyên tử (.tmp -> .bak -> đổi tên), kiểm soát phiên bản OCC CAS và xác thực nguồn gốc.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { GroundedPlanPersistenceError, GroundedPlanConcurrencyError, GroundedPlanIntegrityError, GroundedPlanUserStopError, computePlanSessionDocumentHash, } from './groundedPlanTypes.js';
import { GroundedPlanValidator } from './groundedPlanValidator.js';
export class GroundedPlanPersistenceRecoveryEngine {
    baseDirectory;
    userStopProvider;
    constructor(options) {
        this.baseDirectory = options?.baseDirectory ?? 'data/partitions_grounded_planning';
        this.userStopProvider = options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
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
    /**
     * EN: Persists a plan session document atomically using crash-safe temporary file and backup snapshot.
     * VI: Lưu tài liệu phiên kế hoạch nguyên tử bằng tệp tạm thời an toàn sự cố và ảnh chụp sao lưu.
     */
    saveSessionDocument(doc, expectedVersion) {
        // 1. Synchronous USER_STOP Preemption
        if (this.userStopProvider()) {
            throw new GroundedPlanUserStopError('save_session_document_entry');
        }
        // 2. Validate Document Schema
        GroundedPlanValidator.assertNoPrototypePollutionOrCoT(doc, 'GroundedPlanSessionDocument');
        for (const plan of doc.plans) {
            GroundedPlanValidator.validatePlan(plan);
        }
        // 3. Resolve Tenant Directory safely
        const sessionDir = this.getSessionDir(doc.tenantId, doc.sessionId);
        const canonicalFile = path.join(sessionDir, 'grounded_plans.json');
        const backupFile = path.join(sessionDir, 'grounded_plans.json.bak');
        const tempFile = path.join(sessionDir, `grounded_plans.json.tmp.${crypto.randomUUID()}`);
        // 4. Check OCC / CAS version if file exists
        if (fs.existsSync(canonicalFile)) {
            try {
                const existingRaw = fs.readFileSync(canonicalFile, 'utf8');
                const existingDoc = JSON.parse(existingRaw);
                if (expectedVersion !== undefined && existingDoc.sessionVersion !== expectedVersion) {
                    throw new GroundedPlanConcurrencyError(expectedVersion, existingDoc.sessionVersion, {
                        tenantId: doc.tenantId,
                        sessionId: doc.sessionId,
                    });
                }
            }
            catch (err) {
                if (err instanceof GroundedPlanConcurrencyError)
                    throw err;
                // Non-concurrency read errors handled in recovery flow
            }
        }
        // 5. Serialize and Write to Temporary File
        const serialized = JSON.stringify(doc, null, 2);
        try {
            fs.writeFileSync(tempFile, serialized, 'utf8');
            // Validate written contents
            const writtenContent = fs.readFileSync(tempFile, 'utf8');
            if (writtenContent !== serialized) {
                throw new GroundedPlanIntegrityError('Temporary file content mismatch after write');
            }
            // Snapshot existing canonical to .bak if exists
            if (fs.existsSync(canonicalFile)) {
                try {
                    fs.copyFileSync(canonicalFile, backupFile);
                }
                catch {
                    // Non-fatal if backup copy fails
                }
            }
            // Atomic rename
            fs.renameSync(tempFile, canonicalFile);
        }
        catch (err) {
            if (fs.existsSync(tempFile)) {
                try {
                    fs.unlinkSync(tempFile);
                }
                catch { /* ignore */ }
            }
            throw new GroundedPlanPersistenceError(`Failed to persist grounded plan session document: ${err instanceof Error ? err.message : String(err)}`);
        }
        return {
            writtenPath: canonicalFile,
            bytesWritten: Buffer.byteLength(serialized, 'utf8'),
        };
    }
    /**
     * EN: Rehydrates a session document, automatically falling back to .bak if canonical is corrupt.
     * VI: Khôi phục tài liệu phiên, tự động chuyển về .bak nếu tệp chính tắc bị hỏng.
     */
    recoverSessionDocument(tenantId, sessionId) {
        // 1. Synchronous USER_STOP Preemption
        if (this.userStopProvider()) {
            throw new GroundedPlanUserStopError('recover_session_document_entry');
        }
        const sessionDir = this.getSessionDir(tenantId, sessionId);
        const canonicalFile = path.join(sessionDir, 'grounded_plans.json');
        const backupFile = path.join(sessionDir, 'grounded_plans.json.bak');
        // Attempt Canonical Rehydration
        if (fs.existsSync(canonicalFile)) {
            try {
                const raw = fs.readFileSync(canonicalFile, 'utf8');
                const doc = JSON.parse(raw);
                this.verifyDocumentIntegrity(doc);
                return { document: doc, recoveredFromBackup: false };
            }
            catch (canonicalErr) {
                // Canonical corrupt; attempt backup fallback
                if (fs.existsSync(backupFile)) {
                    try {
                        const bakRaw = fs.readFileSync(backupFile, 'utf8');
                        const bakDoc = JSON.parse(bakRaw);
                        this.verifyDocumentIntegrity(bakDoc);
                        return { document: bakDoc, recoveredFromBackup: true };
                    }
                    catch (bakErr) {
                        throw new GroundedPlanIntegrityError(`Both canonical and backup files are corrupt for tenant '${tenantId}' session '${sessionId}'`);
                    }
                }
                throw new GroundedPlanIntegrityError(`Canonical plan file corrupt and no valid backup available for session '${sessionId}'`);
            }
        }
        // If only backup exists
        if (fs.existsSync(backupFile)) {
            try {
                const bakRaw = fs.readFileSync(backupFile, 'utf8');
                const bakDoc = JSON.parse(bakRaw);
                this.verifyDocumentIntegrity(bakDoc);
                return { document: bakDoc, recoveredFromBackup: true };
            }
            catch {
                throw new GroundedPlanIntegrityError(`Backup file corrupt for session '${sessionId}'`);
            }
        }
        throw new GroundedPlanPersistenceError(`No persistent session document found for tenant '${tenantId}' session '${sessionId}'`);
    }
    verifyDocumentIntegrity(doc) {
        const expectedHash = computePlanSessionDocumentHash(doc);
        if (doc.provenanceHash !== expectedHash) {
            throw new GroundedPlanIntegrityError(`Session document provenance hash mismatch: stored '${doc.provenanceHash}', computed '${expectedHash}'`);
        }
    }
    sanitizeSessionId(sessionId) {
        const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
        if (!safe.trim()) {
            return `session_${crypto.createHash('sha256').update(sessionId).digest('hex').slice(0, 12)}`;
        }
        return safe;
    }
}
