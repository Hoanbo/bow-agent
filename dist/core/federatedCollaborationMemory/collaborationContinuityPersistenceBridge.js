// src/core/federatedCollaborationMemory/collaborationContinuityPersistenceBridge.ts
// BOWCON V4.0 — MS-1.5.15: NATIVE GOVERNED FEDERATED COLLABORATION MEMORY, SHARED CONTEXT & CONSENSUS GOVERNANCE ENGINE
// Component 1126 — REAL
//
// EN: Cryptographic audit chaining, drift-detecting continuity snapshots, and crash-safe atomic persistence
//     bridge with OCC version CAS validation and backup recovery.
// VI: Cầu nối chuỗi băm kiểm toán mật mã, ảnh chụp tính liên tục phát hiện trôi dạt, và lưu trữ nguyên tử
//     chống sự cố với xác thực OCC CAS và khôi phục từ bản sao lưu.
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { FederatedCollaborationMemoryPersistenceError, FederatedCollaborationMemoryConcurrencyError, computeCollaborationAuditHash, computeCollaborationSnapshotHash, } from './federatedCollaborationMemoryTypes.js';
import { CollaborationMemorySecurityBoundary } from './collaborationMemorySecurityBoundary.js';
export class CollaborationContinuityPersistenceBridge {
    securityBoundary;
    baseStorageDir;
    auditRecords = [];
    snapshots = new Map();
    lastAuditHash = '0000000000000000000000000000000000000000000000000000000000000000';
    constructor(options) {
        this.securityBoundary = options?.securityBoundary ?? new CollaborationMemorySecurityBoundary();
        this.baseStorageDir = options?.baseStorageDir ?? path.resolve('data/partitions_federated_collaboration_memory');
    }
    /**
     * EN: Emits a cryptographically hash-chained structured audit event.
     * VI: Phát ra sự kiện kiểm toán có cấu trúc được nối chuỗi băm mật mã.
     */
    emitAudit(eventType, tenantId, sessionId, missionId, objectiveId, federationId, generation, payload, agentId) {
        const now = Date.now();
        const eventId = `audit_collab_${now}_${randomUUID().slice(0, 8)}`;
        const sanitizedPayload = {};
        for (const [k, v] of Object.entries(payload)) {
            if (k !== '__proto__' && k !== 'constructor' && k !== 'prototype') {
                sanitizedPayload[k] = v;
            }
        }
        const base = {
            eventId,
            eventType,
            timestamp: now,
            tenantId,
            sessionId,
            missionId,
            objectiveId,
            federationId,
            agentId,
            generation,
            previousHash: this.lastAuditHash,
            payload: sanitizedPayload,
        };
        const eventHash = computeCollaborationAuditHash(base);
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
     * EN: Records a cryptographically sealed collaboration continuity snapshot.
     * VI: Ghi lại một ảnh chụp tính liên tục hợp tác được niêm phong mật mã.
     */
    recordSnapshot(params) {
        this.securityBoundary.assertStopInactive('PRE_CONTINUITY_COMMIT', params.tenantId, params.contextId);
        const now = Date.now();
        const snapshotId = `snap_${params.contextId}_${now}`;
        // Get previous snapshot hash for this context
        const existingSnaps = Array.from(this.snapshots.values()).filter((s) => s.contextId === params.contextId);
        const previousSnapshotHash = existingSnaps.length > 0 ? existingSnaps[existingSnaps.length - 1].snapshotHash : undefined;
        const base = {
            snapshotId,
            tenantId: params.tenantId,
            sessionId: params.sessionId,
            federationId: params.federationId,
            contextId: params.contextId,
            contextVersion: params.contextVersion,
            activeAgentIds: [...params.activeAgentIds],
            memoryCount: params.memoryCount,
            consensusCount: params.consensusCount,
            generation: params.generation,
            timestamp: now,
            previousSnapshotHash,
        };
        const snapshotHash = computeCollaborationSnapshotHash(base);
        const snapshot = {
            ...base,
            snapshotHash,
        };
        this.snapshots.set(snapshotId, snapshot);
        return snapshot;
    }
    /**
     * EN: Detects drift between an expected snapshot and current state.
     * VI: Phát hiện trôi dạt giữa ảnh chụp kỳ vọng và trạng thái hiện tại.
     */
    detectDrift(lastSnapshot, currentContext, currentMemoryCount) {
        if (lastSnapshot.tenantId !== currentContext.tenantId)
            return 'AUTHORIZATION_DRIFT';
        if (lastSnapshot.sessionId !== currentContext.sessionId)
            return 'AUTHORIZATION_DRIFT';
        if (lastSnapshot.federationId !== currentContext.federationId)
            return 'FEDERATION_DRIFT';
        if (lastSnapshot.generation > currentContext.generation)
            return 'GENERATION_DRIFT';
        if (lastSnapshot.contextVersion > currentContext.version)
            return 'CONTEXT_DRIFT';
        if (lastSnapshot.memoryCount > currentMemoryCount)
            return 'MEMORY_DRIFT';
        return undefined;
    }
    /**
     * EN: Saves collaboration context using atomic `.tmp` -> `.bak` -> rename pattern with OCC.
     * VI: Lưu ngữ cảnh hợp tác bằng mẫu nguyên tử `.tmp` -> `.bak` -> đổi tên với OCC.
     */
    saveContext(context, expectedVersion) {
        this.securityBoundary.assertStopInactive('PRE_PERSISTENCE', context.tenantId, context.contextId);
        this.securityBoundary.assertTenantSafe(context.tenantId);
        const partitionDir = path.join(this.baseStorageDir, context.tenantId, 'contexts');
        if (!fs.existsSync(partitionDir)) {
            fs.mkdirSync(partitionDir, { recursive: true });
        }
        const canonicalPath = path.join(partitionDir, `${context.contextId}.json`);
        const backupPath = path.join(partitionDir, `${context.contextId}.json.bak`);
        const tempPath = path.join(partitionDir, `${context.contextId}.json.tmp.${randomUUID()}`);
        // OCC verification if file exists
        if (fs.existsSync(canonicalPath)) {
            try {
                const existingData = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
                if (expectedVersion !== undefined && existingData.version !== expectedVersion) {
                    throw new FederatedCollaborationMemoryConcurrencyError(`OCC version mismatch: expected ${expectedVersion}, found ${existingData.version}`, context.tenantId, context.contextId);
                }
            }
            catch (err) {
                if (err instanceof FederatedCollaborationMemoryConcurrencyError)
                    throw err;
            }
        }
        const content = JSON.stringify(context, null, 2);
        // 1. Write to temporary file
        fs.writeFileSync(tempPath, content, 'utf8');
        // 2. Validate checksum
        const writtenContent = fs.readFileSync(tempPath, 'utf8');
        if (writtenContent !== content) {
            fs.unlinkSync(tempPath);
            throw new FederatedCollaborationMemoryPersistenceError('Temporary file checksum verification failed');
        }
        // 3. Create backup of canonical file if it exists
        if (fs.existsSync(canonicalPath)) {
            fs.copyFileSync(canonicalPath, backupPath);
        }
        // 4. Atomic rename
        fs.renameSync(tempPath, canonicalPath);
        this.securityBoundary.assertStopInactive('POST_PERSISTENCE', context.tenantId, context.contextId);
    }
    /**
     * EN: Recovers context from backup if canonical is corrupted.
     * VI: Khôi phục ngữ cảnh từ bản sao lưu nếu tệp chính tắc bị hỏng.
     */
    recoverContext(tenantId, contextId) {
        this.securityBoundary.assertTenantSafe(tenantId);
        const partitionDir = path.join(this.baseStorageDir, tenantId, 'contexts');
        const canonicalPath = path.join(partitionDir, `${contextId}.json`);
        const backupPath = path.join(partitionDir, `${contextId}.json.bak`);
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
        // Attempt backup recovery
        if (fs.existsSync(backupPath)) {
            try {
                const backupObj = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
                // Restore backup to canonical
                fs.copyFileSync(backupPath, canonicalPath);
                this.emitAudit('COLLABORATION_RECOVERED', tenantId, backupObj.sessionId, backupObj.missionId, backupObj.objectiveId, backupObj.federationId, backupObj.generation, { recoveredFrom: 'backup', contextId });
                return backupObj;
            }
            catch {
                // Both corrupted
            }
        }
        throw new FederatedCollaborationMemoryPersistenceError(`Context '${contextId}' could not be recovered: both canonical and backup corrupted or missing`);
    }
}
