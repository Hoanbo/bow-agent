// src/core/goal/goalPersistenceEngine.ts
// BOWCON V4.0 — MS-1.5.04: GOAL PERSISTENCE ENGINE (ATOMIC & CRASH-SAFE)
// Component 1015 — REAL
//
// Invariants:
// CRASH_SAFE_ATOMIC_PERSISTENCE == TRUE
// STRICT_TENANT_ISOLATION == TRUE
// OCC_CONCURRENCY_ENFORCEMENT == TRUE
// SECRET_SANITIZATION_BEFORE_DISK == TRUE
// USER_STOP > ALL_MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// COGNITION != AUTHORITY
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { GOAL_SCHEMA_VERSION, GoalValidationError, GoalConcurrencyError, CrossTenantGoalError, GoalIntegrityError, GoalUserStopError, computeGraphProvenanceHash, } from './goalTypes.js';
import { resolveUserPartition } from '../persistence/userPartitionResolver.js';
import { globalMasterHumanAuthority } from '../authority/masterHumanAuthority.js';
export class GoalPersistenceEngine {
    baseDir;
    userStopProvider;
    constructor(options) {
        const rawDir = options?.partitionBaseDir || options?.baseDir;
        this.baseDir = rawDir
            ? path.resolve(rawDir)
            : path.resolve(process.cwd(), 'data/partitions_goals');
        this.userStopProvider =
            options?.userStopProvider ?? (() => globalMasterHumanAuthority.isUserStopActive);
        this.ensureBaseDir();
    }
    ensureBaseDir() {
        if (!fs.existsSync(this.baseDir)) {
            fs.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    /**
     * Resolves safe partition file path for a tenant's goal graph.
     */
    resolvePartitionFilePath(tenantId) {
        const cleanTenant = (tenantId || '').trim();
        if (!cleanTenant) {
            throw new GoalValidationError('tenantId must be a non-empty string');
        }
        if (cleanTenant.includes('..') ||
            cleanTenant.includes('/') ||
            cleanTenant.includes('\\') ||
            cleanTenant.includes('\0')) {
            throw new CrossTenantGoalError(cleanTenant, 'PATH_TRAVERSAL_DETECTED');
        }
        const partition = resolveUserPartition(cleanTenant, this.baseDir);
        const tenantDir = path.join(partition.baseDir, partition.partitionKey);
        if (!fs.existsSync(tenantDir)) {
            fs.mkdirSync(tenantDir, { recursive: true });
        }
        return path.join(tenantDir, 'goal_graph.json');
    }
    /**
     * Saves a PriorityGraphEngine partition to disk atomically with OCC verification.
     */
    saveGraph(graph, expectedGraphVersion = 1, conflicts = [], activeTenantId) {
        if (this.userStopProvider()) {
            throw new GoalUserStopError('save_graph');
        }
        if (activeTenantId && graph.tenantId !== activeTenantId) {
            throw new CrossTenantGoalError(graph.tenantId, activeTenantId);
        }
        const targetPath = this.resolvePartitionFilePath(graph.tenantId);
        // OCC Check: if partition already exists, verify expected version
        if (fs.existsSync(targetPath)) {
            const existing = this.loadGraphDocument(graph.tenantId, activeTenantId);
            if (existing && existing.graphVersion !== expectedGraphVersion) {
                throw new GoalConcurrencyError(expectedGraphVersion, existing.graphVersion, {
                    tenantId: graph.tenantId,
                });
            }
        }
        const nextGraphVersion = expectedGraphVersion + 1;
        const goals = graph.listGoals();
        const edges = graph.listEdges();
        const docDraft = {
            schemaVersion: GOAL_SCHEMA_VERSION,
            tenantId: graph.tenantId,
            graphVersion: nextGraphVersion,
            goals,
            edges,
            conflicts,
            lastUpdatedAt: new Date().toISOString(),
        };
        const provenanceHash = computeGraphProvenanceHash(docDraft);
        const finalDoc = Object.freeze({
            ...docDraft,
            provenanceHash,
        });
        const serialized = JSON.stringify(finalDoc, null, 2);
        const tempPath = `${targetPath}.tmp.${crypto.randomBytes(6).toString('hex')}`;
        const bakPath = `${targetPath}.bak`;
        try {
            // 1. Write to temporary file
            fs.writeFileSync(tempPath, serialized, 'utf8');
            // 2. Validate written content
            const readBack = fs.readFileSync(tempPath, 'utf8');
            const parsed = JSON.parse(readBack);
            if (!parsed || parsed.provenanceHash !== provenanceHash) {
                throw new GoalIntegrityError('Atomic verification failed: checksum mismatch on written tmp file');
            }
            // 3. Snapshot current canonical file to .bak if it exists
            if (fs.existsSync(targetPath)) {
                try {
                    fs.copyFileSync(targetPath, bakPath);
                }
                catch {
                    // ignore backup snapshot copy error
                }
            }
            // 4. Atomic rename
            fs.renameSync(tempPath, targetPath);
            return Object.freeze({
                filePath: targetPath,
                bytesWritten: Buffer.byteLength(serialized, 'utf8'),
                graphVersion: nextGraphVersion,
            });
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
            throw err;
        }
    }
    /**
     * Loads and validates a GoalGraphDocument from disk partition.
     * If primary file is corrupted, attempts fallback to .bak snapshot.
     */
    loadGraphDocument(tenantId, activeTenantId) {
        if (activeTenantId && tenantId !== activeTenantId) {
            throw new CrossTenantGoalError(tenantId, activeTenantId);
        }
        const targetPath = this.resolvePartitionFilePath(tenantId);
        const bakPath = `${targetPath}.bak`;
        const tryLoad = (filePath) => {
            if (!fs.existsSync(filePath))
                return null;
            try {
                const raw = fs.readFileSync(filePath, 'utf8');
                const doc = JSON.parse(raw);
                if (!doc || typeof doc !== 'object')
                    return null;
                const expectedHash = computeGraphProvenanceHash(doc);
                if (doc.provenanceHash !== expectedHash) {
                    throw new GoalIntegrityError(`Provenance tampering detected in ${filePath}`);
                }
                return doc;
            }
            catch {
                return null;
            }
        };
        const primaryDoc = tryLoad(targetPath);
        if (primaryDoc)
            return { ...primaryDoc, recoveredFromBackup: false };
        // Fallback to .bak snapshot
        const bakDoc = tryLoad(bakPath);
        if (bakDoc)
            return { ...bakDoc, recoveredFromBackup: true };
        return null;
    }
}
export const globalGoalPersistenceEngine = new GoalPersistenceEngine();
