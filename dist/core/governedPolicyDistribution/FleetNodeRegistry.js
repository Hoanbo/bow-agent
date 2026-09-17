// src/core/governedPolicyDistribution/FleetNodeRegistry.ts
// Component 1219: FleetNodeRegistry
//
// Tenant-bound node registration, authenticated heartbeat recording, and cohort read model.
import * as fs from 'fs';
import * as path from 'path';
import { assertValidIdentifier, assertValidDomain, assertEmergencyStopInactive, DistributionValidationError, DistributionLockTimeoutError, DistributionPersistenceCorruptionError, asFleetNodeId, canonicalJson, } from './GovernedPolicyDistributionTypes.js';
export class FleetNodeRegistry {
    baseStorageDir;
    emergencyStopProvider;
    auditLedger;
    // In-memory cache for fast read model queries: Map<scopedKey, FleetNodeRecord>
    memoryStore = new Map();
    constructor(baseStorageDirOrOptions, emergencyStopProvider) {
        if (typeof baseStorageDirOrOptions === 'object' && baseStorageDirOrOptions !== null) {
            this.baseStorageDir = baseStorageDirOrOptions.baseStorageDir || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
            this.emergencyStopProvider = baseStorageDirOrOptions.emergencyStopProvider;
            this.auditLedger = baseStorageDirOrOptions.auditLedger;
        }
        else {
            this.baseStorageDir = baseStorageDirOrOptions || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
            this.emergencyStopProvider = emergencyStopProvider;
        }
    }
    getNodeKey(tenantId, federationId, nodeId) {
        return `${tenantId}:${federationId}:${nodeId}`;
    }
    getPartitionDir(tenantId, domain) {
        assertValidIdentifier(tenantId, 'tenantId');
        assertValidDomain(domain);
        return path.join(this.baseStorageDir, tenantId, domain);
    }
    getNodesFilePath(tenantId, domain) {
        return path.join(this.getPartitionDir(tenantId, domain), 'nodes.json');
    }
    async acquireLock(filePath, timeoutMs = 5000) {
        const lockPath = `${filePath}.lock`;
        const start = Date.now();
        const pollInterval = 50;
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        while (Date.now() - start < timeoutMs) {
            try {
                const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR);
                fs.closeSync(fd);
                return () => {
                    try {
                        if (fs.existsSync(lockPath)) {
                            fs.unlinkSync(lockPath);
                        }
                    }
                    catch {
                        // Ignore unlock error
                    }
                };
            }
            catch (err) {
                if (err.code === 'EEXIST') {
                    // Lock contention, wait and poll
                    await new Promise(r => setTimeout(r, pollInterval));
                }
                else {
                    throw new DistributionPersistenceCorruptionError(`Failed to acquire lock: ${err.message}`);
                }
            }
        }
        throw new DistributionLockTimeoutError(`Timeout waiting for lock on ${filePath}`);
    }
    loadNodesUnderLock(filePath) {
        if (!fs.existsSync(filePath)) {
            return {};
        }
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            if (!raw.trim())
                return {};
            const parsed = JSON.parse(raw);
            if (typeof parsed !== 'object' || parsed === null) {
                throw new Error('Invalid nodes file format');
            }
            return parsed;
        }
        catch (err) {
            throw new DistributionPersistenceCorruptionError(`Failed to load nodes file: ${err.message}`);
        }
    }
    saveNodesUnderLock(filePath, nodes) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const tmpPath = `${filePath}.tmp`;
        const serialized = canonicalJson(nodes);
        try {
            const fd = fs.openSync(tmpPath, 'w');
            fs.writeFileSync(fd, serialized, 'utf-8');
            fs.fsyncSync(fd);
            fs.closeSync(fd);
            fs.renameSync(tmpPath, filePath);
        }
        catch (err) {
            try {
                if (fs.existsSync(tmpPath))
                    fs.unlinkSync(tmpPath);
            }
            catch {
                // Ignore tmp cleanup error
            }
            throw new DistributionPersistenceCorruptionError(`Failed to write nodes file atomically: ${err.message}`);
        }
    }
    /**
     * Registers a fleet node.
     * Identity key is (tenantId, federationId, nodeId).
     * Initial status is INITIALIZING.
     */
    async registerNode(record, nowMs) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        assertValidIdentifier(record.tenantId, 'tenantId');
        assertValidIdentifier(record.federationId, 'federationId');
        assertValidIdentifier(record.nodeId, 'nodeId');
        assertValidDomain(record.policyDomain);
        if (record.assignedCanaryRing < 0 || record.assignedCanaryRing > 4) {
            throw new DistributionValidationError(`Invalid canary ring: ${record.assignedCanaryRing}`);
        }
        const filePath = this.getNodesFilePath(record.tenantId, record.policyDomain);
        const unlock = await this.acquireLock(filePath);
        try {
            const nodes = this.loadNodesUnderLock(filePath);
            const key = this.getNodeKey(record.tenantId, record.federationId, record.nodeId);
            // Check if node already exists for this (tenantId, policyDomain) under a DIFFERENT federation
            for (const existingKey of Object.keys(nodes)) {
                const existing = nodes[existingKey];
                if (existing.nodeId === record.nodeId && existing.federationId !== record.federationId) {
                    throw new DistributionValidationError(`Node ${record.nodeId} already registered under federation ${existing.federationId}; explicit deregistration required`);
                }
            }
            if (nodes[key]) {
                const existing = nodes[key];
                // Exact duplicate register returns stored equal record
                if (existing.tenantId === record.tenantId &&
                    existing.federationId === record.federationId &&
                    existing.nodeId === record.nodeId &&
                    existing.policyDomain === record.policyDomain &&
                    existing.assignedCanaryRing === record.assignedCanaryRing) {
                    this.memoryStore.set(key, existing);
                    return existing;
                }
                throw new DistributionValidationError(`Node ${key} already registered with different configuration`);
            }
            const freshRecord = {
                nodeId: asFleetNodeId(record.nodeId),
                tenantId: record.tenantId,
                federationId: record.federationId,
                policyDomain: record.policyDomain,
                assignedCanaryRing: record.assignedCanaryRing,
                currentEpoch: record.currentEpoch ?? 0,
                currentPolicyVersion: record.currentPolicyVersion ?? 0,
                currentPolicyHash: record.currentPolicyHash ?? '',
                syncStatus: 'INITIALIZING',
                quarantined: false,
                lastHeartbeatAt: nowMs,
                registeredAt: nowMs,
            };
            nodes[key] = freshRecord;
            this.saveNodesUnderLock(filePath, nodes);
            this.memoryStore.set(key, freshRecord);
            return freshRecord;
        }
        finally {
            unlock();
        }
    }
    /**
     * Records an authenticated node heartbeat.
      * lastHeartbeatAt is never permitted to decrease.
     */
    async recordHeartbeat(tenantId, federationId, domainOrNodeId, nodeIdOrNowMs, maybeNowMs) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        assertValidIdentifier(tenantId, 'tenantId');
        assertValidIdentifier(federationId, 'federationId');
        let domain;
        let nodeId;
        let nowMs;
        if (typeof nodeIdOrNowMs === 'number') {
            nodeId = domainOrNodeId;
            nowMs = nodeIdOrNowMs;
        }
        else {
            domain = domainOrNodeId;
            nodeId = nodeIdOrNowMs;
            nowMs = maybeNowMs;
        }
        assertValidIdentifier(nodeId, 'nodeId');
        if (domain) {
            assertValidDomain(domain);
        }
        const key = this.getNodeKey(tenantId, federationId, nodeId);
        let cached = this.memoryStore.get(key);
        let foundDomain = domain || cached?.policyDomain;
        if (!foundDomain) {
            const domains = ['LEASE', 'CONVERGENCE', 'FEDERATION', 'SECURITY', 'RESOURCE', 'AUDIT'];
            for (const d of domains) {
                const candidateFile = this.getNodesFilePath(tenantId, d);
                if (fs.existsSync(candidateFile)) {
                    const nodes = this.loadNodesUnderLock(candidateFile);
                    if (nodes[key]) {
                        foundDomain = d;
                        cached = nodes[key];
                        break;
                    }
                }
            }
        }
        if (!foundDomain) {
            throw new DistributionValidationError(`Node not registered: ${key}`);
        }
        const filePath = this.getNodesFilePath(tenantId, foundDomain);
        const unlock = await this.acquireLock(filePath);
        try {
            const nodes = this.loadNodesUnderLock(filePath);
            const existing = nodes[key];
            if (!existing) {
                throw new DistributionValidationError(`Node not found in registry: ${key}`);
            }
            if (nowMs < existing.lastHeartbeatAt) {
                throw new DistributionValidationError('Heartbeat timestamp cannot decrease');
            }
            const updatedRecord = {
                ...existing,
                lastHeartbeatAt: nowMs,
            };
            nodes[key] = updatedRecord;
            this.saveNodesUnderLock(filePath, nodes);
            this.memoryStore.set(key, updatedRecord);
            return updatedRecord;
        }
        finally {
            unlock();
        }
    }
    /**
     * Cohort read model query.
     * Returns de-duplicated registered nodes matching (tenantId, federationId, domain, ring).
     */
    getFleetCohort(tenantId, federationId, domain, ring, _nowMs) {
        assertValidIdentifier(tenantId, 'tenantId');
        assertValidIdentifier(federationId, 'federationId');
        assertValidDomain(domain);
        const filePath = this.getNodesFilePath(tenantId, domain);
        let nodes = {};
        if (fs.existsSync(filePath)) {
            try {
                const raw = fs.readFileSync(filePath, 'utf-8');
                nodes = JSON.parse(raw);
            }
            catch {
                nodes = {};
            }
        }
        const cohort = [];
        for (const key of Object.keys(nodes)) {
            const node = nodes[key];
            if (node.tenantId === tenantId &&
                node.federationId === federationId &&
                node.policyDomain === domain &&
                node.assignedCanaryRing === ring) {
                cohort.push(node);
                this.memoryStore.set(key, node);
            }
        }
        return Object.freeze(cohort);
    }
    async updateNodeSyncStatus(tenantId, federationId, domain, nodeId, status, _nowMs, epoch, policyVersion, policyHash) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        assertValidIdentifier(tenantId, 'tenantId');
        assertValidIdentifier(federationId, 'federationId');
        assertValidIdentifier(nodeId, 'nodeId');
        assertValidDomain(domain);
        const filePath = this.getNodesFilePath(tenantId, domain);
        const unlock = await this.acquireLock(filePath);
        try {
            const nodes = this.loadNodesUnderLock(filePath);
            const key = this.getNodeKey(tenantId, federationId, nodeId);
            const existing = nodes[key];
            if (!existing) {
                throw new DistributionValidationError(`Node not registered: ${key}`);
            }
            const updated = {
                ...existing,
                syncStatus: status,
                currentEpoch: epoch !== undefined ? epoch : existing.currentEpoch,
                currentPolicyVersion: policyVersion !== undefined ? policyVersion : existing.currentPolicyVersion,
                currentPolicyHash: policyHash !== undefined ? policyHash : existing.currentPolicyHash,
            };
            nodes[key] = updated;
            this.saveNodesUnderLock(filePath, nodes);
            this.memoryStore.set(key, updated);
            return updated;
        }
        finally {
            unlock();
        }
    }
    async updateNodeQuarantine(tenantId, federationId, domain, nodeId, quarantined, nowMs) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        assertValidIdentifier(tenantId, 'tenantId');
        assertValidIdentifier(federationId, 'federationId');
        assertValidIdentifier(nodeId, 'nodeId');
        assertValidDomain(domain);
        const filePath = this.getNodesFilePath(tenantId, domain);
        const unlock = await this.acquireLock(filePath);
        try {
            const nodes = this.loadNodesUnderLock(filePath);
            const key = this.getNodeKey(tenantId, federationId, nodeId);
            const existing = nodes[key];
            if (!existing) {
                throw new DistributionValidationError(`Node not registered: ${key}`);
            }
            const updated = {
                ...existing,
                quarantined,
                syncStatus: quarantined ? 'QUARANTINED' : 'INITIALIZING',
                lastHeartbeatAt: Math.max(existing.lastHeartbeatAt, nowMs),
            };
            nodes[key] = updated;
            this.saveNodesUnderLock(filePath, nodes);
            this.memoryStore.set(key, updated);
            return updated;
        }
        finally {
            unlock();
        }
    }
    updateNodeQuarantineStatus = this.updateNodeQuarantine.bind(this);
    getNode(tenantId, federationId, domain, nodeId) {
        assertValidIdentifier(tenantId, 'tenantId');
        assertValidIdentifier(federationId, 'federationId');
        assertValidIdentifier(nodeId, 'nodeId');
        assertValidDomain(domain);
        const key = this.getNodeKey(tenantId, federationId, nodeId);
        const inMem = this.memoryStore.get(key);
        if (inMem)
            return inMem;
        const filePath = this.getNodesFilePath(tenantId, domain);
        if (fs.existsSync(filePath)) {
            try {
                const raw = fs.readFileSync(filePath, 'utf-8');
                const nodes = JSON.parse(raw);
                if (nodes[key]) {
                    this.memoryStore.set(key, nodes[key]);
                    return nodes[key];
                }
            }
            catch {
                // Ignore read error
            }
        }
        return undefined;
    }
}
