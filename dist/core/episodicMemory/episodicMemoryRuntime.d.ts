import { type EpisodicMemoryRequest, type EpisodicMemoryResult, type EpisodicMemoryRecord, type EpisodicMemorySynthesis, type EpisodicMemoryStatus } from './episodicMemoryTypes.js';
import { EpisodicMemoryValidator } from './episodicMemoryValidator.js';
import { EpisodicMemoryExecutionGate } from './episodicMemoryExecutionGate.js';
import { EpisodicMemoryStore } from './episodicMemoryStore.js';
import { EpisodicMemorySynthesizer } from './episodicMemorySynthesizer.js';
import { type AuditLedger } from '../auditLedger.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { DurableCommitRecord } from '../durableCommit/durableCommitTypes.js';
export interface EpisodicMemoryRuntimeOptions {
    readonly validator?: EpisodicMemoryValidator;
    readonly gate?: EpisodicMemoryExecutionGate;
    readonly store?: EpisodicMemoryStore;
    readonly synthesizer?: EpisodicMemorySynthesizer;
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class EpisodicMemoryRuntime {
    private readonly validator;
    private readonly gate;
    private readonly store;
    private readonly synthesizer;
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: EpisodicMemoryRuntimeOptions);
    /**
     * EN: Recursively deep-freezes an object to guarantee absolute immutability.
     */
    private deepFreeze;
    /**
     * EN: Produces a canonical JSON string with deterministically sorted keys.
     */
    private canonicalJSON;
    /**
     * EN: Calculates SHA-256 cryptographic memory provenance hash.
     */
    calculateMemoryProvenanceHash(params: {
        readonly commitProvenanceHash: string;
        readonly commitId: string;
        readonly taskId: string;
        readonly tenantId: string;
        readonly stepId: string;
        readonly executionId: string;
        readonly status: EpisodicMemoryStatus;
        readonly stateDelta: Readonly<Record<string, unknown>>;
        readonly recordedAt: string;
    }): string;
    /**
     * EN: Records structured audit event in globalAuditLedger.
     */
    private recordAudit;
    /**
     * EN: Primary execution entrypoint: ingests committed evidence into episodic memory.
     * Throws typed errors on gate aborts, binding violations, stale versions, duplicate memories,
     * security violations, and uncommitted inputs.
     */
    recordMemory(request: EpisodicMemoryRequest): Promise<EpisodicMemoryResult>;
    /**
     * EN: Retrieves an existing episodic memory record by ID.
     */
    getMemory(tenantId: string, memoryId: string): EpisodicMemoryRecord | undefined;
    /**
     * EN: Lists historical memory records for a tenant and optional taskId.
     */
    listMemories(tenantId: string, taskId?: string): readonly EpisodicMemoryRecord[];
    /**
     * EN: Synthesizes insights on-demand from historical evidence for a committed record.
     */
    synthesizeFromHistory(tenantId: string, commitRecord: DurableCommitRecord): EpisodicMemorySynthesis;
}
export declare const globalEpisodicMemoryRuntime: EpisodicMemoryRuntime;
