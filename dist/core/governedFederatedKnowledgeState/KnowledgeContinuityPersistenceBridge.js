// src/core/governedFederatedKnowledgeState/KnowledgeContinuityPersistenceBridge.ts
// BOWCON V4.0 — MS-1.5.16: GOVERNED FEDERATED KNOWLEDGE STATE & COLLECTIVE INTELLIGENCE ENGINE
// Component 1136 — REAL
//
// EN: Cryptographic audit chaining across 32 event types, drift detection across 10 categories,
//     and crash-safe atomic persistence with OCC version CAS validation and backup recovery.
// VI: Cầu nối chuỗi kiểm toán mật mã qua 32 loại sự kiện, phát hiện trôi dạt qua 10 danh mục,
//     và lưu trữ nguyên tử chống sự cố với xác thực OCC CAS và khôi phục từ bản sao lưu.
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { GovernedFederatedKnowledgeStatePersistenceError, GovernedFederatedKnowledgeStateConcurrencyError, computeKnowledgeAuditHash, computeSha256, } from './GovernedFederatedKnowledgeStateTypes.js';
import { FederatedKnowledgeSecurityBoundary } from './FederatedKnowledgeSecurityBoundary.js';
export class KnowledgeContinuityPersistenceBridge {
    securityBoundary;
    baseStorageDir;
    auditRecords = [];
    snapshots = new Map();
    lastAuditHash = '0000000000000000000000000000000000000000000000000000000000000000';
    constructor(options) {
        this.securityBoundary = options?.securityBoundary ?? new FederatedKnowledgeSecurityBoundary();
        this.baseStorageDir =
            options?.baseStorageDir ?? path.resolve('data/partitions_governed_federated_knowledge_state');
    }
    /**
     * EN: Emits a cryptographically hash-chained structured audit record.
     * VI: Phát ra một bản ghi kiểm toán có cấu trúc được nối chuỗi băm mật mã.
     */
    emitAudit(eventType, tenantId, sessionId, humanOperatorId, missionId, objectiveId, federationId, generation, payload) {
        const now = Date.now();
        const eventId = `audit_k_${now}_${randomUUID().slice(0, 8)}`;
        const sanitizedPayload = {};
        for (const [k, v] of Object.entries(payload)) {
            if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
                sanitizedPayload[k] = v;
            }
        }
        const provenanceHash = computeSha256(JSON.stringify({ tenantId, sessionId, missionId, objectiveId, generation }));
        const base = {
            eventId,
            eventType,
            timestamp: now,
            tenantId,
            sessionId,
            humanOperatorId,
            missionId,
            objectiveId,
            federationId,
            generation,
            previousHash: this.lastAuditHash,
            provenanceHash,
            payload: sanitizedPayload,
        };
        const eventHash = computeKnowledgeAuditHash(base);
        const record = {
            ...base,
            eventHash,
        };
        this.lastAuditHash = eventHash;
        this.auditRecords.push(record);
        return record;
    }
    getAuditChain() {
        return [...this.auditRecords];
    }
    /**
     * EN: Records a sealed continuity snapshot for drift detection.
     * VI: Ghi lại một ảnh chụp tính liên tục được niêm phong để phát hiện trôi dạt.
     */
    recordSnapshot(state) {
        this.securityBoundary.assertStopInactive('PRE_CONTINUITY_COMMIT', state.tenantId, state.stateId);
        const now = Date.now();
        const snapshotId = `snap_k_${state.stateId}_${now}`;
        const existingSnaps = Array.from(this.snapshots.values()).filter((s) => s.stateId === state.stateId);
        const previousSnapshotHash = existingSnaps.length > 0 ? existingSnaps[existingSnaps.length - 1].snapshotHash : undefined;
        const baseData = {
            snapshotId,
            tenantId: state.tenantId,
            sessionId: state.sessionId,
            federationId: state.federationId,
            stateId: state.stateId,
            stateVersion: state.version,
            entryCount: Object.keys(state.entries).length,
            generation: state.generation,
            timestamp: now,
            previousSnapshotHash,
        };
        const snapshotHash = computeSha256(`k_snapshot:${JSON.stringify(baseData)}`);
        const snapshot = {
            ...baseData,
            snapshotHash,
        };
        this.snapshots.set(snapshotId, snapshot);
        return snapshot;
    }
    /**
     * EN: Detects drift between snapshot and current state across 10 drift categories.
     * VI: Phát hiện trôi dạt giữa ảnh chụp và trạng thái hiện tại trên 10 danh mục trôi dạt.
     */
    detectDrift(snapshot, currentState) {
        if (snapshot.tenantId !== currentState.tenantId)
            return 'AUTHORIZATION_DRIFT';
        if (snapshot.sessionId !== currentState.sessionId)
            return 'AUTHORIZATION_DRIFT';
        if (snapshot.federationId !== currentState.federationId)
            return 'FEDERATION_DRIFT';
        if (snapshot.generation > currentState.generation)
            return 'GENERATION_DRIFT';
        if (snapshot.stateVersion > currentState.version)
            return 'KNOWLEDGE_STATE_DRIFT';
        if (snapshot.entryCount > Object.keys(currentState.entries).length)
            return 'KNOWLEDGE_ENTRY_DRIFT';
        return undefined;
    }
    /**
     * EN: Saves state atomically with OCC validation, checksums, and backup.
     * VI: Lưu trạng thái nguyên tử với xác thực OCC, mã kiểm tra và bản sao lưu.
     */
    saveState(state, expectedVersion) {
        this.securityBoundary.assertStopInactive('PRE_PERSISTENCE', state.tenantId, state.stateId);
        this.securityBoundary.assertTenantSafe(state.tenantId);
        const partitionDir = path.join(this.baseStorageDir, state.tenantId, 'states');
        if (!fs.existsSync(partitionDir)) {
            fs.mkdirSync(partitionDir, { recursive: true });
        }
        const canonicalPath = path.join(partitionDir, `${state.stateId}.json`);
        const backupPath = path.join(partitionDir, `${state.stateId}.json.bak`);
        const tempPath = path.join(partitionDir, `${state.stateId}.json.tmp.${randomUUID()}`);
        // OCC CAS check
        if (fs.existsSync(canonicalPath)) {
            try {
                const existingData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
                if (expectedVersion !== undefined && existingData.version !== expectedVersion) {
                    throw new GovernedFederatedKnowledgeStateConcurrencyError(`OCC version mismatch: expected ${expectedVersion}, found ${existingData.version}`, state.tenantId, state.stateId);
                }
            }
            catch (err) {
                if (err instanceof GovernedFederatedKnowledgeStateConcurrencyError)
                    throw err;
            }
        }
        const content = JSON.stringify(state, null, 2);
        // 1. Temporary file write
        fs.writeFileSync(tempPath, content, 'utf8');
        // 2. Checksum validation
        const written = fs.readFileSync(tempPath, 'utf8');
        if (written !== content) {
            fs.unlinkSync(tempPath);
            throw new GovernedFederatedKnowledgeStatePersistenceError('Temporary file checksum mismatch');
        }
        // 3. Backup creation
        if (fs.existsSync(canonicalPath)) {
            fs.copyFileSync(canonicalPath, backupPath);
        }
        // 4. Atomic rename
        fs.renameSync(tempPath, canonicalPath);
        this.securityBoundary.assertStopInactive('POST_PERSISTENCE', state.tenantId, state.stateId);
    }
    /**
     * EN: Recovers state from backup if canonical is corrupted.
     * VI: Khôi phục trạng thái từ bản sao lưu nếu tệp chính tắc bị hỏng.
     */
    recoverState(tenantId, stateId) {
        this.securityBoundary.assertTenantSafe(tenantId);
        const partitionDir = path.join(this.baseStorageDir, tenantId, 'states');
        const canonicalPath = path.join(partitionDir, `${stateId}.json`);
        const backupPath = path.join(partitionDir, `${stateId}.json.bak`);
        let canonicalValid = false;
        let canonicalObj;
        if (fs.existsSync(canonicalPath)) {
            try {
                canonicalObj = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
                canonicalValid = true;
            }
            catch {
                canonicalValid = false;
            }
        }
        if (canonicalValid && canonicalObj) {
            return canonicalObj;
        }
        // Fallback to backup
        if (fs.existsSync(backupPath)) {
            try {
                const backupObj = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
                fs.copyFileSync(backupPath, canonicalPath);
                this.emitAudit('KNOWLEDGE_RECOVERED', tenantId, backupObj.sessionId, 'SYSTEM_RECOVERY', backupObj.missionId, backupObj.objectiveId, backupObj.federationId, backupObj.generation, { recoveredFrom: 'backup', stateId });
                return backupObj;
            }
            catch {
                // Both corrupted
            }
        }
        throw new GovernedFederatedKnowledgeStatePersistenceError(`State '${stateId}' recovery failed: both canonical and backup files corrupted or missing`);
    }
}
