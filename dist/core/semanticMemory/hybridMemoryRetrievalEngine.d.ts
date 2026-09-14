import { type HybridSearchResult, type HybridRetrievalWeights, type RetrievalMode } from './semanticMemoryTypes.js';
import { NativeVectorIndex } from './nativeVectorIndex.js';
import { type LocalEmbeddingProvider } from './localEmbeddingProvider.js';
export interface LexicalCandidate {
    readonly memoryId: string;
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly sourceDomain: string;
    readonly canonicalText: string;
    readonly lexicalScore: number;
}
export interface HybridSearchQuery {
    readonly text: string;
    readonly tenantId: string;
    readonly sessionId?: string;
    readonly topK?: number;
    readonly minScore?: number;
    readonly weights?: HybridRetrievalWeights;
    readonly activeTenantId?: string;
}
export declare class HybridMemoryRetrievalEngine {
    private readonly defaultLexicalWeight;
    private readonly defaultSemanticWeight;
    /**
     * Executes hybrid lexical + semantic retrieval.
     * If local embedding fails or provider is offline, seamlessly degrades to LEXICAL_ONLY / DEGRADED_LEXICAL.
     */
    search(query: HybridSearchQuery, index: NativeVectorIndex, embeddingProvider: LocalEmbeddingProvider, lexicalRetriever: (queryText: string, tenantId: string) => Promise<readonly LexicalCandidate[]>, signal?: AbortSignal): Promise<{
        readonly results: readonly HybridSearchResult[];
        readonly retrievalMode: RetrievalMode;
        readonly totalCandidates: number;
    }>;
}
