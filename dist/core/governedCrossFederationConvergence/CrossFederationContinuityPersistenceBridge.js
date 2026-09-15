// src/core/governedCrossFederationConvergence/CrossFederationContinuityPersistenceBridge.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1146 — REAL
//
// EN: Cryptographic audit chaining, drift snapshots, and crash-safe partitioned persistence bridge.
// VI: Cầu nối chuỗi kiểm toán mật mã, ảnh chụp trôi dạt và lưu trữ phân vùng an toàn khi sự cố.
import * as fs from 'fs';
import * as path from 'path';
import { MAX_AUDIT_LOG_RECORDS_PER_SESSION, GovernedCrossFederationPersistenceError, GovernedCrossFederationConcurrencyError, GovernedCrossFederationContinuityError, GovernedCrossFederationBudgetError, computeConvergenceAuditHash, computeSha256, deterministicJsonStringify, } from './GovernedCrossFederationTypes.js';
export class CrossFederationContinuityPersistenceBridge {
    storageRoot;
    auditRecords = new Map(); // Keyed by session
    snapshots = new Map(); // Keyed by session
    lastEventHashBySession = new Map();
    lastSnapshotHashBySession = new Map();
    constructor(storageRoot = 'data/partitions_governed_cross_federation_convergence') {
        this.storageRoot = storageRoot;
    }
    // EN: Validate filesystem path against path traversal and Windows reserved device names
    // VI: Xác thực đường dẫn hệ thống tệp chống lại tấn công duyệt đường dẫn và tên thiết bị dành riêng của Windows
    validateSafePath(tenantId, sessionId) {
        const reservedWindows = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;
        for (const segment of [tenantId, sessionId]) {
            if (!segment || segment.includes('\0') || segment.includes('..') || segment.includes('/') || segment.includes('\\')) {
                throw new GovernedCrossFederationPersistenceError(`Security violation: Illegal character or path traversal detected in segment: "${segment}"`, tenantId, sessionId);
            }
            if (reservedWindows.test(segment)) {
                throw new GovernedCrossFederationPersistenceError(`Security violation: Windows reserved device name rejected: "${segment}"`, tenantId, sessionId);
            }
        }
    }
    // EN: Emit a cryptographically hash-chained audit event
    // VI: Phát sự kiện kiểm toán được liên kết chuỗi băm mật mã
    emitAudit(params) {
        this.validateSafePath(params.tenantId, params.sessionId);
        const sessionKey = `${params.tenantId}:${params.sessionId}`;
        if (!this.auditRecords.has(sessionKey)) {
            this.auditRecords.set(sessionKey, []);
        }
        const sessionLogs = this.auditRecords.get(sessionKey);
        if (sessionLogs.length >= MAX_AUDIT_LOG_RECORDS_PER_SESSION) {
            throw new GovernedCrossFederationBudgetError(`Audit budget exceeded (${MAX_AUDIT_LOG_RECORDS_PER_SESSION} records) for session ${params.sessionId}`, params.tenantId, params.sessionId);
        }
        const previousHash = this.lastEventHashBySession.get(sessionKey) ||
            '0000000000000000000000000000000000000000000000000000000000000000';
        const timestamp = Date.now();
        const eventId = `audit_${params.eventType}_${timestamp}_${Math.random().toString(16).slice(2, 8)}`;
        const cleanRecord = {
            eventId,
            eventType: params.eventType,
            timestamp,
            tenantId: params.tenantId,
            sessionId: params.sessionId,
            humanOperatorId: params.humanOperatorId,
            missionId: params.missionId,
            participatingFederationIds: Object.freeze([...params.participatingFederationIds]),
            generation: params.generation,
            previousHash,
            provenanceHash: computeSha256(`audit_payload:${deterministicJsonStringify(params.payload)}`),
            payload: Object.freeze({ ...params.payload }),
        };
        const eventHash = computeConvergenceAuditHash(cleanRecord);
        const record = Object.freeze({
            ...cleanRecord,
            eventHash,
        });
        sessionLogs.push(record);
        this.lastEventHashBySession.set(sessionKey, eventHash);
        return record;
    }
    // EN: Generate and record continuity snapshot with hash chaining
    // VI: Tạo và ghi lại ảnh chụp liên tục với liên kết băm chuỗi
    captureSnapshot(state) {
        this.validateSafePath(state.tenantId, state.sessionId);
        const sessionKey = `${state.tenantId}:${state.sessionId}`;
        if (!this.snapshots.has(sessionKey)) {
            this.snapshots.set(sessionKey, []);
        }
        const sessionSnapshots = this.snapshots.get(sessionKey);
        const previousSnapshotHash = this.lastSnapshotHashBySession.get(sessionKey) ||
            '0000000000000000000000000000000000000000000000000000000000000000';
        const timestamp = Date.now();
        const snapshotId = `snap_${state.stateId}_${timestamp}`;
        const cleanSnapshot = {
            snapshotId,
            tenantId: state.tenantId,
            sessionId: state.sessionId,
            convergenceStateId: state.stateId,
            generation: state.generation,
            version: state.version,
            activeFederationIds: Object.freeze([...state.participatingFederationIds]),
            convergedStrategyHash: state.convergedStrategyHash || 'UNCONVERGED',
            dependencyGraphHash: computeSha256(`dep_graph:${deterministicJsonStringify(state.dependencyGraph)}`),
            previousSnapshotHash,
            timestamp,
        };
        const snapshotHash = computeSha256(`continuity_snap:${deterministicJsonStringify(cleanSnapshot)}`);
        const snapshot = Object.freeze({
            ...cleanSnapshot,
            snapshotHash,
        });
        sessionSnapshots.push(snapshot);
        this.lastSnapshotHashBySession.set(sessionKey, snapshotHash);
        return snapshot;
    }
    // EN: Detect continuity drift against canonical drift categories
    // VI: Phát hiện trôi dạt liên tục đối chiếu với các danh mục trôi dạt chuẩn
    detectDrift(state, expectedCategory) {
        if (expectedCategory) {
            throw new GovernedCrossFederationContinuityError(`Continuity drift detected: ${expectedCategory}`, expectedCategory, state.tenantId, state.sessionId);
        }
    }
    // EN: Persist convergence state atomically with OCC version CAS
    // VI: Lưu trữ trạng thái hội tụ nguyên tử với kiểm soát đồng thời lạc quan (OCC CAS)
    persistState(state, expectedVersion) {
        this.validateSafePath(state.tenantId, state.sessionId);
        if (expectedVersion !== state.version) {
            throw new GovernedCrossFederationConcurrencyError(`OCC Version CAS conflict: Expected version ${expectedVersion} != state version ${state.version}`, state.tenantId, state.sessionId);
        }
        const updatedState = Object.freeze({
            ...state,
            version: state.version + 1,
            updatedAt: Date.now(),
        });
        const sessionDir = path.join(this.storageRoot, state.tenantId, 'sessions', state.sessionId);
        fs.mkdirSync(sessionDir, { recursive: true });
        const canonicalPath = path.join(sessionDir, 'convergence_state.json');
        const backupPath = path.join(sessionDir, 'convergence_state.json.bak');
        const tempPath = path.join(sessionDir, `convergence_state.json.tmp.${Date.now()}`);
        const serialized = deterministicJsonStringify(updatedState);
        const checksum = computeSha256(serialized);
        try {
            // 1. Write to temporary file
            fs.writeFileSync(tempPath, serialized, 'utf8');
            // 2. Readback checksum verification
            const readback = fs.readFileSync(tempPath, 'utf8');
            const readbackChecksum = computeSha256(readback);
            if (readbackChecksum !== checksum) {
                throw new GovernedCrossFederationPersistenceError('Persistence integrity error: Checksum mismatch on readback', state.tenantId, state.sessionId);
            }
            // 3. Backup existing canonical file
            if (fs.existsSync(canonicalPath)) {
                fs.copyFileSync(canonicalPath, backupPath);
            }
            // 4. Atomic rename temporary to canonical
            fs.renameSync(tempPath, canonicalPath);
        }
        catch (err) {
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                }
                catch {
                    // ignore
                }
            }
            throw new GovernedCrossFederationPersistenceError(`Persistence failed: ${err?.message || err}`, state.tenantId, state.sessionId);
        }
        return updatedState;
    }
    // EN: Load persisted state with fallback to .bak upon canonical corruption
    // VI: Tải trạng thái đã lưu với cơ chế dự phòng tệp .bak khi tệp chính tắc bị hỏng
    loadState(tenantId, sessionId) {
        this.validateSafePath(tenantId, sessionId);
        const sessionDir = path.join(this.storageRoot, tenantId, 'sessions', sessionId);
        const canonicalPath = path.join(sessionDir, 'convergence_state.json');
        const backupPath = path.join(sessionDir, 'convergence_state.json.bak');
        if (!fs.existsSync(canonicalPath) && !fs.existsSync(backupPath)) {
            throw new GovernedCrossFederationPersistenceError(`No persisted state found for tenant ${tenantId} session ${sessionId}`, tenantId, sessionId);
        }
        // Try canonical first
        if (fs.existsSync(canonicalPath)) {
            try {
                const data = fs.readFileSync(canonicalPath, 'utf8');
                return JSON.parse(data);
            }
            catch {
                // Canonical corrupted, try backup
            }
        }
        // Fallback to backup
        if (fs.existsSync(backupPath)) {
            try {
                const data = fs.readFileSync(backupPath, 'utf8');
                return JSON.parse(data);
            }
            catch {
                // Both corrupted, fail closed
                throw new GovernedCrossFederationPersistenceError(`Unrecoverable persistence corruption: Both canonical and backup files are corrupted for session ${sessionId}`, tenantId, sessionId);
            }
        }
        throw new GovernedCrossFederationPersistenceError(`Failed to load persisted state for session ${sessionId}`, tenantId, sessionId);
    }
    getAuditRecords(tenantId, sessionId) {
        return Object.freeze(this.auditRecords.get(`${tenantId}:${sessionId}`) || []);
    }
    getSnapshots(tenantId, sessionId) {
        return Object.freeze(this.snapshots.get(`${tenantId}:${sessionId}`) || []);
    }
    clear() {
        this.auditRecords.clear();
        this.snapshots.clear();
        this.lastEventHashBySession.clear();
        this.lastSnapshotHashBySession.clear();
    }
}
