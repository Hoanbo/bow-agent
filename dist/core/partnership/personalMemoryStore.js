// src/core/partnership/personalMemoryStore.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Persistent Personal Memory Store.
// Preserves durable Owner context with strict provenance tracking and crash-safe persistence.
//
// Invariants:
// INFERENCE != CONFIRMED MEMORY
// OWNER_EXPLICIT > EXECUTION_VERIFIED > SYSTEM_OBSERVED > DERIVED > INFERRED > IMPORTED
// Protected Workspace (C:\BOW\shopofbow) -> READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { MASTER_OWNER_ID, assertMasterOwner, computeMemoryChecksum, compareProvenance, generatePartnershipId, } from './partnershipTypes.js';
export class PersonalMemoryStore {
    _items = new Map();
    _storagePath = path.resolve('data', 'partnership', 'personal_memory.json');
    constructor(customStoragePath) {
        if (customStoragePath) {
            this.setStoragePath(customStoragePath);
        }
    }
    get size() {
        return this._items.size;
    }
    get storagePath() {
        return this._storagePath;
    }
    setStoragePath(newPath) {
        const normalized = path.normalize(newPath).toLowerCase();
        if (normalized.includes('shopofbow')) {
            throw new Error('[PROTECTED_WORKSPACE_VIOLATION] Memory storage path cannot be in shopofbow');
        }
        this._storagePath = path.resolve(newPath);
    }
    /**
     * Records a new personal memory item with strict provenance checking.
     */
    addMemory(opts) {
        const ownerId = opts.ownerId ?? MASTER_OWNER_ID;
        assertMasterOwner(ownerId, 'Recording personal memory');
        const memoryId = generatePartnershipId('mem');
        const now = Date.now();
        const confidence = Math.max(0.0, Math.min(1.0, opts.confidence ?? (opts.provenance === 'OWNER_EXPLICIT' ? 1.0 : 0.8)));
        const itemBase = {
            memoryId,
            ownerId,
            sessionId: opts.sessionId,
            category: opts.category,
            content: opts.content,
            source: opts.source ?? (opts.provenance === 'OWNER_EXPLICIT' ? 'Owner Direct Statement' : 'System'),
            createdAt: now,
            updatedAt: now,
            confidence,
            certainty: opts.certainty ?? (confidence >= 0.95 ? 'HIGH' : confidence >= 0.7 ? 'MEDIUM' : 'LOW'),
            provenance: opts.provenance,
            status: opts.status ?? 'ACTIVE',
            tags: opts.tags ?? [],
            metadata: opts.metadata ?? {},
        };
        const checksum = computeMemoryChecksum(itemBase);
        const item = {
            ...itemBase,
            checksum,
        };
        this._items.set(item.memoryId, item);
        return item;
    }
    /**
     * Alias for addMemory.
     */
    createMemory(opts) {
        return this.addMemory(opts);
    }
    /**
     * Updates status of an existing memory item.
     */
    updateMemoryStatus(memoryId, status, metadataUpdates) {
        return this.updateMemory(memoryId, {
            status,
            metadata: metadataUpdates ? { ...(this.getMemory(memoryId)?.metadata ?? {}), ...metadataUpdates } : undefined,
        });
    }
    /**
     * Retrieves a memory item by ID with integrity verification.
     */
    getMemory(memoryId) {
        const item = this._items.get(memoryId);
        if (!item)
            return undefined;
        // Verify checksum integrity
        if (item.checksum) {
            const { checksum, ...rest } = item;
            const expectedChecksum = computeMemoryChecksum(rest);
            if (checksum !== expectedChecksum) {
                throw new Error(`[MEMORY_CORRUPTION] Memory '${memoryId}' checksum mismatch; possible tampering`);
            }
        }
        return item;
    }
    /**
     * Updates an existing memory item while enforcing provenance rules:
     * Lower provenance cannot overwrite higher provenance (e.g. INFERRED cannot overwrite OWNER_EXPLICIT).
     */
    updateMemory(memoryId, updates, updatingProvenance) {
        const existing = this.getMemory(memoryId);
        if (!existing) {
            throw new Error(`[MEMORY_NOT_FOUND] Memory '${memoryId}' not found`);
        }
        if (updatingProvenance) {
            // Invariant: INFERENCE != CONFIRMED MEMORY
            // If updating provenance is weaker than existing, reject overwrite
            if (compareProvenance(updatingProvenance, existing.provenance) > 0) {
                throw new Error(`[PROVENANCE_VIOLATION] Cannot overwrite memory '${memoryId}' with lower provenance: existing '${existing.provenance}' > incoming '${updatingProvenance}'`);
            }
        }
        const updatedItemBase = {
            ...existing,
            ...updates,
            metadata: updates.metadata ? { ...(existing.metadata ?? {}), ...updates.metadata } : existing.metadata,
            updatedAt: Date.now(),
            provenance: updatingProvenance ?? existing.provenance,
        };
        const checksum = computeMemoryChecksum(updatedItemBase);
        const updatedItem = {
            ...updatedItemBase,
            checksum,
        };
        this._items.set(memoryId, updatedItem);
        return updatedItem;
    }
    getAll() {
        return Array.from(this._items.values());
    }
    /**
     * Alias for getAll.
     */
    getAllMemories() {
        return this.getAll();
    }
    /**
     * Filtered query for memory items.
     */
    query(filter) {
        return Array.from(this._items.values()).filter((m) => {
            if (filter.category && m.category !== filter.category)
                return false;
            if (filter.status && m.status !== filter.status)
                return false;
            if (filter.provenance && m.provenance !== filter.provenance)
                return false;
            if (filter.ownerId && m.ownerId !== filter.ownerId)
                return false;
            return true;
        });
    }
    getByCategory(category) {
        return Array.from(this._items.values()).filter((m) => m.category === category && m.status === 'ACTIVE');
    }
    getByProvenance(provenance) {
        return Array.from(this._items.values()).filter((m) => m.provenance === provenance);
    }
    getByOwner(ownerId) {
        return Array.from(this._items.values()).filter((m) => m.ownerId === ownerId);
    }
    searchByKeyword(keyword) {
        const term = keyword.toLowerCase();
        return Array.from(this._items.values()).filter((m) => m.content.toLowerCase().includes(term) ||
            m.tags.some((t) => t.toLowerCase().includes(term)));
    }
    /**
     * Atomically saves memory ledger to disk with SHA-256 header.
     */
    saveToDisk(customPath) {
        const targetFile = customPath ? path.resolve(customPath) : this._storagePath;
        const targetDir = path.dirname(targetFile);
        if (targetFile.toLowerCase().includes('shopofbow')) {
            throw new Error('[PROTECTED_WORKSPACE_VIOLATION] Cannot persist to shopofbow');
        }
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        const items = Array.from(this._items.values());
        const payload = JSON.stringify(items, null, 2);
        const hash = createHash('sha256').update(payload).digest('hex');
        const envelope = {
            version: '4.0.0',
            milestone: 'MS-1.3.39',
            itemCount: items.length,
            checksum: hash,
            savedAt: Date.now(),
            items,
        };
        const tempFile = `${targetFile}.tmp.${Date.now()}`;
        fs.writeFileSync(tempFile, JSON.stringify(envelope, null, 2), 'utf8');
        fs.renameSync(tempFile, targetFile);
    }
    /**
     * Loads and validates memory ledger from disk.
     */
    loadFromDisk(customPath) {
        const targetFile = customPath ? path.resolve(customPath) : this._storagePath;
        if (!fs.existsSync(targetFile))
            return 0;
        const raw = fs.readFileSync(targetFile, 'utf8');
        const envelope = JSON.parse(raw);
        if (envelope.items && Array.isArray(envelope.items)) {
            const payload = JSON.stringify(envelope.items, null, 2);
            const computedHash = createHash('sha256').update(payload).digest('hex');
            if (envelope.checksum && envelope.checksum !== computedHash) {
                throw new Error('[PERSISTENCE_CORRUPTION] Memory store payload SHA-256 checksum mismatch');
            }
            this._items.clear();
            for (const item of envelope.items) {
                this._items.set(item.memoryId, item);
            }
            return this._items.size;
        }
        return 0;
    }
    clear() {
        this._items.clear();
    }
}
export const globalPersonalMemoryStore = new PersonalMemoryStore();
