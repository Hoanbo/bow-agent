// src/core/semanticMemory/hybridMemoryRetrievalEngine.ts
// BOWCON V4.0 — MS-1.5.03: HYBRID MEMORY RETRIEVAL ENGINE
// Component 1004 — REAL
//
// Invariants:
// SEMANTIC_SIMILARITY != FACTUAL_TRUTH
// WEIGHTS_SUM_TO_ONE == TRUE
// DEGRADED_LEXICAL_ON_EMBEDDING_FAILURE == TRUE
// DETERMINISTIC_RANKING == TRUE
// ZERO_EXECUTION_AUTHORITY == TRUE
import { CrossTenantSemanticMemoryError, } from './semanticMemoryTypes.js';
export class HybridMemoryRetrievalEngine {
    defaultLexicalWeight = 0.4;
    defaultSemanticWeight = 0.6;
    /**
     * Executes hybrid lexical + semantic retrieval.
     * If local embedding fails or provider is offline, seamlessly degrades to LEXICAL_ONLY / DEGRADED_LEXICAL.
     */
    async search(query, index, embeddingProvider, lexicalRetriever, signal) {
        if (query.activeTenantId && query.tenantId !== query.activeTenantId) {
            throw new CrossTenantSemanticMemoryError(query.tenantId, query.activeTenantId);
        }
        if (query.tenantId !== index.tenantId) {
            throw new CrossTenantSemanticMemoryError(query.tenantId, index.tenantId);
        }
        const topK = query.topK ?? 10;
        const minScore = query.minScore ?? 0.0;
        const wLex = query.weights ? query.weights.lexicalWeight : this.defaultLexicalWeight;
        const wSem = query.weights ? query.weights.semanticWeight : this.defaultSemanticWeight;
        // Validate weights sum to 1.0 (with floating-point tolerance)
        if (Math.abs(wLex + wSem - 1.0) > 1e-4) {
            throw new Error(`Hybrid weights must sum to 1.0: found lexical ${wLex} + semantic ${wSem}`);
        }
        // 1. Fetch lexical candidates
        let lexicalCandidates = [];
        try {
            lexicalCandidates = await lexicalRetriever(query.text, query.tenantId);
        }
        catch {
            lexicalCandidates = [];
        }
        // 2. Attempt semantic vector embedding & retrieval
        let semanticCandidates = [];
        let retrievalMode = 'HYBRID';
        try {
            const queryDescriptor = await embeddingProvider.embed(query.text, signal);
            semanticCandidates = index.search(queryDescriptor.values, {
                topK: topK * 2, // oversample for union ranking
                minScore,
                sessionId: query.sessionId,
                activeTenantId: query.activeTenantId,
            });
        }
        catch {
            // Graceful fallback to degraded lexical mode
            retrievalMode = 'DEGRADED_LEXICAL';
        }
        // 3. Normalize lexical scores across candidates to [0.0, 1.0]
        const maxLexical = lexicalCandidates.reduce((max, c) => Math.max(max, c.lexicalScore), 0);
        const normalizedLexicalMap = new Map();
        for (const c of lexicalCandidates) {
            const normScore = maxLexical > 0 ? Math.min(1.0, c.lexicalScore / maxLexical) : 0.0;
            normalizedLexicalMap.set(c.memoryId, { candidate: c, score: normScore });
        }
        // 4. Fusion & Union of candidates
        const fusedMap = new Map();
        // Ingest lexical candidates
        for (const [memId, item] of normalizedLexicalMap.entries()) {
            fusedMap.set(memId, {
                memoryId: item.candidate.memoryId,
                tenantId: item.candidate.tenantId,
                sessionId: item.candidate.sessionId,
                sourceDomain: item.candidate.sourceDomain,
                canonicalText: item.candidate.canonicalText,
                lexicalScore: item.score,
                semanticScore: 0.0,
                matchReasons: ['lexical_keyword_match'],
            });
        }
        // Ingest semantic candidates
        for (const s of semanticCandidates) {
            const existing = fusedMap.get(s.memoryId);
            if (existing) {
                existing.semanticScore = s.semanticScore;
                existing.matchReasons.push('semantic_vector_proximity');
            }
            else {
                fusedMap.set(s.memoryId, {
                    memoryId: s.memoryId,
                    tenantId: s.tenantId,
                    sessionId: s.sessionId,
                    sourceDomain: s.sourceDomain,
                    canonicalText: s.canonicalText,
                    lexicalScore: 0.0,
                    semanticScore: s.semanticScore,
                    matchReasons: ['semantic_vector_proximity'],
                });
            }
        }
        // 5. Compute hybrid weighted scores
        const hybridList = [];
        for (const item of fusedMap.values()) {
            let finalScore;
            if (retrievalMode === 'DEGRADED_LEXICAL') {
                finalScore = item.lexicalScore;
            }
            else if (item.lexicalScore > 0 && item.semanticScore > 0) {
                finalScore = wLex * item.lexicalScore + wSem * item.semanticScore;
            }
            else if (item.semanticScore > 0) {
                finalScore = wSem * item.semanticScore;
            }
            else {
                finalScore = wLex * item.lexicalScore;
            }
            finalScore = Math.round(finalScore * 10000) / 10000;
            if (finalScore >= minScore) {
                hybridList.push({
                    memoryId: item.memoryId,
                    tenantId: item.tenantId,
                    sessionId: item.sessionId,
                    sourceDomain: item.sourceDomain,
                    canonicalText: item.canonicalText,
                    lexicalScore: item.lexicalScore,
                    semanticScore: item.semanticScore,
                    hybridScore: finalScore,
                    retrievalMode,
                    matchReasons: Object.freeze(item.matchReasons),
                });
            }
        }
        // 6. Deterministic Sort: descending score, tie-break memoryId
        hybridList.sort((a, b) => {
            if (b.hybridScore !== a.hybridScore) {
                return b.hybridScore - a.hybridScore;
            }
            return a.memoryId.localeCompare(b.memoryId);
        });
        return Object.freeze({
            results: Object.freeze(hybridList.slice(0, topK)),
            retrievalMode,
            totalCandidates: hybridList.length,
        });
    }
}
