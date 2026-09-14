import { type SemanticMemoryRecord } from './semanticMemoryTypes.js';
import { type LocalEmbeddingProvider } from './localEmbeddingProvider.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export interface SemanticProjectionInput {
    readonly memoryId: string;
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly sourceDomain: 'EPISODIC' | 'KNOWLEDGE_GRAPH' | 'WORKING_REGISTER' | 'USER_PREFERENCE';
    readonly rawText: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
}
export declare class SemanticMemoryProjectionEngine {
    private readonly sanitizer;
    private readonly userStopProvider;
    constructor(options?: {
        readonly sanitizer?: DiagnosisSanitizer;
        readonly userStopProvider?: () => boolean;
    });
    /**
     * Projects canonical memory content into a strongly typed, sanitized SemanticMemoryRecord.
     * Asserts USER_STOP, filters CoT, sanitizes credentials/PII, computes contentHash,
     * generates local vector embedding, and validates vector boundaries.
     */
    project(input: SemanticProjectionInput, provider: LocalEmbeddingProvider, signal?: AbortSignal): Promise<SemanticMemoryRecord>;
}
