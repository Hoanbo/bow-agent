import type { PersonalMemoryItem, MemoryCategory, MemoryProvenance, CertaintyLevel, MemoryStatus } from './partnershipTypes.js';
export interface CreateMemoryOptions {
    ownerId?: string;
    sessionId?: string;
    category: MemoryCategory;
    content: string;
    source?: string;
    confidence?: number;
    certainty?: CertaintyLevel;
    provenance: MemoryProvenance;
    status?: MemoryStatus;
    tags?: string[];
    metadata?: Record<string, any>;
}
export declare class PersonalMemoryStore {
    private _items;
    private _storagePath;
    constructor(customStoragePath?: string);
    get size(): number;
    get storagePath(): string;
    setStoragePath(newPath: string): void;
    /**
     * Records a new personal memory item with strict provenance checking.
     */
    addMemory(opts: CreateMemoryOptions): PersonalMemoryItem;
    /**
     * Alias for addMemory.
     */
    createMemory(opts: CreateMemoryOptions): PersonalMemoryItem;
    /**
     * Updates status of an existing memory item.
     */
    updateMemoryStatus(memoryId: string, status: MemoryStatus, metadataUpdates?: Record<string, any>): PersonalMemoryItem;
    /**
     * Retrieves a memory item by ID with integrity verification.
     */
    getMemory(memoryId: string): PersonalMemoryItem | undefined;
    /**
     * Updates an existing memory item while enforcing provenance rules:
     * Lower provenance cannot overwrite higher provenance (e.g. INFERRED cannot overwrite OWNER_EXPLICIT).
     */
    updateMemory(memoryId: string, updates: Partial<Omit<PersonalMemoryItem, 'memoryId' | 'ownerId' | 'createdAt' | 'checksum'>>, updatingProvenance?: MemoryProvenance): PersonalMemoryItem;
    getAll(): PersonalMemoryItem[];
    /**
     * Alias for getAll.
     */
    getAllMemories(): PersonalMemoryItem[];
    /**
     * Filtered query for memory items.
     */
    query(filter: {
        category?: MemoryCategory;
        status?: MemoryStatus;
        provenance?: MemoryProvenance;
        ownerId?: string;
    }): PersonalMemoryItem[];
    getByCategory(category: MemoryCategory): PersonalMemoryItem[];
    getByProvenance(provenance: MemoryProvenance): PersonalMemoryItem[];
    getByOwner(ownerId: string): PersonalMemoryItem[];
    searchByKeyword(keyword: string): PersonalMemoryItem[];
    /**
     * Atomically saves memory ledger to disk with SHA-256 header.
     */
    saveToDisk(customPath?: string): void;
    /**
     * Loads and validates memory ledger from disk.
     */
    loadFromDisk(customPath?: string): number;
    clear(): void;
}
export declare const globalPersonalMemoryStore: PersonalMemoryStore;
