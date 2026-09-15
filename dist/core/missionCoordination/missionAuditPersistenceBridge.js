// src/core/missionCoordination/missionAuditPersistenceBridge.ts
// BOWCON V4.0 — MS-1.5.13: NATIVE GOVERNED MISSION COORDINATION, MULTI-OBJECTIVE PRIORITIZATION & SUPERVISED CONTINUATION ENGINE
// Component 1106 — REAL
//
// EN: Cryptographic audit chaining and crash-safe multi-tenant persistence bridge for mission coordination.
//     Sanitizes PII/secrets, enforces atomic writes (.tmp -> .bak -> .json), and strict OCC/CAS.
// VI: Cầu nối nhật ký kiểm toán mật mã và lưu trữ đa bên thuê an toàn khi sự cố cho điều phối sứ mệnh.
//     Khử độc PII/bí mật, thực thi ghi nguyên tử (.tmp -> .bak -> .json), và kiểm soát OCC/CAS nghiêm ngặt.
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { MissionCoordinationPersistenceError, MissionCoordinationConcurrencyError, computeSha256, deterministicJsonStringify, } from './missionCoordinationTypes.js';
import { MissionGovernanceSecurityBoundary } from './missionGovernanceSecurityBoundary.js';
import { globalDiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
const DEFAULT_BASE_DIR = 'data/partitions_mission_coordination';
export class MissionAuditPersistenceBridge {
    baseDirectory;
    securityBoundary;
    auditLog = [];
    lastAuditHash = 'GENESIS_MISSION_AUDIT_HASH';
    constructor(options) {
        this.baseDirectory = options?.baseDirectory ?? DEFAULT_BASE_DIR;
        this.securityBoundary = options?.securityBoundary ?? new MissionGovernanceSecurityBoundary();
    }
    getAuditLog() {
        return [...this.auditLog];
    }
    getLastAuditHash() {
        return this.lastAuditHash;
    }
    /**
     * EN: Emits and cryptographically chains a sanitized mission audit record.
     * VI: Phát ra và liên kết chuỗi mật mã một bản ghi kiểm toán sứ mệnh đã khử độc.
     */
    emitAudit(eventType, tenantId, missionId, payload) {
        // Assert stop state
        this.securityBoundary.assertStopInactive('POST_PERSISTENCE', tenantId, missionId);
        // Deep sanitize secrets and PII via globalDiagnosisSanitizer
        let sanitizedPayload = {};
        try {
            sanitizedPayload = globalDiagnosisSanitizer.sanitize(payload);
        }
        catch {
            sanitizedPayload = { sanitized: true, details: 'sanitization_applied' };
        }
        const timestamp = Date.now();
        const recordId = `maudit_${missionId}_${this.auditLog.length + 1}_${timestamp}`;
        const previousHash = this.lastAuditHash;
        const recordData = {
            recordId,
            eventType,
            tenantId,
            missionId,
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
        let prev = 'GENESIS_MISSION_AUDIT_HASH';
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
    getMissionDir(tenantId, missionId) {
        const partition = this.securityBoundary.resolveSafePartition(tenantId.trim(), this.baseDirectory);
        const safeMissionId = missionId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 64);
        const missionDir = path.resolve(this.baseDirectory, partition.partitionKey, 'missions', safeMissionId);
        if (!fs.existsSync(missionDir)) {
            fs.mkdirSync(missionDir, { recursive: true });
        }
        return missionDir;
    }
    /**
     * EN: Atomically saves mission document using .tmp -> verification -> .bak -> rename.
     *     Enforces strict Optimistic Concurrency Control (OCC / CAS).
     * VI: Lưu tài liệu sứ mệnh nguyên tử sử dụng .tmp -> xác minh -> .bak -> đổi tên.
     *     Thực thi Kiểm soát đồng thời lạc quan (OCC / CAS) nghiêm ngặt.
     */
    saveMission(mission) {
        this.securityBoundary.assertStopInactive('PRE_PERSISTENCE', mission.tenantId, mission.missionId);
        const missionDir = this.getMissionDir(mission.tenantId, mission.missionId);
        const primaryPath = path.resolve(missionDir, 'mission.json');
        const backupPath = path.resolve(missionDir, 'mission.json.bak');
        const tempPath = path.resolve(missionDir, `.tmp.${randomUUID()}`);
        // OCC Check: verify stored version vs incoming version
        if (fs.existsSync(primaryPath)) {
            try {
                const rawExisting = fs.readFileSync(primaryPath, 'utf8');
                const existing = JSON.parse(rawExisting);
                if (typeof existing.missionVersion === 'number' && mission.missionVersion < existing.missionVersion) {
                    throw new MissionCoordinationConcurrencyError(`OCC version conflict: incoming version ${mission.missionVersion} is stale compared to stored version ${existing.missionVersion}`, mission.tenantId, mission.missionId);
                }
            }
            catch (err) {
                if (err instanceof MissionCoordinationConcurrencyError) {
                    throw err;
                }
                // If file was corrupt, proceed to overwrite with fresh atomic write
            }
        }
        // Sanitize mission contents before persistence
        const sanitizedMission = globalDiagnosisSanitizer.sanitize(mission);
        const jsonContent = deterministicJsonStringify(sanitizedMission);
        try {
            // 1. Write to temp file
            fs.writeFileSync(tempPath, jsonContent, 'utf8');
            // 2. Verify temp file checksum
            const writtenContent = fs.readFileSync(tempPath, 'utf8');
            if (writtenContent !== jsonContent) {
                throw new MissionCoordinationPersistenceError('Checksum verification failed for temp mission file', mission.tenantId, mission.missionId);
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
            if (err instanceof MissionCoordinationConcurrencyError || err instanceof MissionCoordinationPersistenceError) {
                throw err;
            }
            throw new MissionCoordinationPersistenceError(`Failed to save mission atomically: ${err instanceof Error ? err.message : String(err)}`, mission.tenantId, mission.missionId);
        }
        this.securityBoundary.assertStopInactive('POST_PERSISTENCE', mission.tenantId, mission.missionId);
    }
    /**
     * EN: Loads mission from primary file, automatically recovering from .bak if primary is corrupt.
     * VI: Tải sứ mệnh từ tệp chính, tự động phục hồi từ .bak nếu tệp chính bị hỏng.
     */
    loadMission(tenantId, missionId) {
        const missionDir = this.getMissionDir(tenantId, missionId);
        const primaryPath = path.resolve(missionDir, 'mission.json');
        const backupPath = path.resolve(missionDir, 'mission.json.bak');
        if (!fs.existsSync(primaryPath) && !fs.existsSync(backupPath)) {
            throw new MissionCoordinationPersistenceError(`Mission file not found for mission ${missionId}`, tenantId, missionId);
        }
        // Try primary
        if (fs.existsSync(primaryPath)) {
            try {
                const content = fs.readFileSync(primaryPath, 'utf8');
                const parsed = JSON.parse(content);
                if (parsed && parsed.missionId === missionId && parsed.tenantId === tenantId) {
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
                if (parsedBackup && parsedBackup.missionId === missionId && parsedBackup.tenantId === tenantId) {
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
        throw new MissionCoordinationPersistenceError(`Double corruption detected: both primary and backup files are corrupt or missing for mission ${missionId}`, tenantId, missionId);
    }
}
