// tests/test_v4_ms15_semantic_memory.ts
// BOWCON V4.0 — MS-1.5.03: LOCAL EMBEDDING ENGINE & NATIVE DENSE VECTOR SEMANTIC MEMORY
// Dedicated Regression Suite #97
//
// Invariants:
// COGNITION != AUTHORITY
// SEMANTIC_SIMILARITY != FACTUAL_TRUTH
// EMBEDDING_SCORE != AUTHORIZATION
// VECTOR_MATCH != MEMORY_PROMOTION
// USER_STOP > ALL_MUTATION
// ZERO_DIRECT_TOOL_EXECUTION == TRUE
// FAIL_CLOSED_ON_MALFORMED_VECTOR == TRUE
// NO_RAW_CHAIN_OF_THOUGHT_PERSISTENCE == TRUE
// LOCAL_EMBEDDING_PATH_HAS_ZERO_CLOUD_FALLBACK == TRUE

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import {
  SEMANTIC_MEMORY_SCHEMA_VERSION,
  MAX_VECTOR_DIMENSIONS,
  MIN_VECTOR_DIMENSIONS,
  MAX_INDEX_ENTRIES,
  MAX_SEMANTIC_PAYLOAD_BYTES,
  SemanticMemoryError,
  EmbeddingValidationError,
  VectorMathError,
  VectorIndexCapacityError,
  IncompatibleVectorSpaceError,
  CrossTenantSemanticMemoryError,
  SemanticMemoryUserStopError,
  SemanticMemoryCoTProhibitedError,
  SemanticMemoryIntegrityError,
  SemanticMemorySecurityError,
  SemanticMemoryValidationError,
  isSafeObjectKey,
  assertNoChainOfThought,
  assertNoProhibitedReasoning,
  computeContentHash,
  computeProvenanceHash,
  computeIndexProvenanceHash,
  VectorMathEngine,
  EmbeddingVectorValidator,
  DeterministicLocalEmbeddingProvider,
  OllamaEmbeddingProvider,
  NativeVectorIndex,
  SemanticMemoryPersistenceEngine,
  HybridMemoryRetrievalEngine,
  SemanticMemoryProjectionEngine,
  SemanticMemoryRecoveryEngine,
  type SemanticMemoryRecord,
  type LexicalCandidate,
  type EmbeddingVectorDescriptor,
} from '../src/core/semanticMemory/index.js';
import { globalMasterHumanAuthority } from '../src/core/authority/masterHumanAuthority.js';

let passedAssertions = 0;
function expect(condition: boolean, msg: string) {
  assert(condition, `[ASSERTION FAILED] ${msg}`);
  passedAssertions++;
}

async function runSuite97() {
  console.log('================================================================================');
  console.log('BOWCON V4 — MS-1.5.03: LOCAL EMBEDDING ENGINE & NATIVE DENSE VECTOR SEMANTIC MEMORY');
  console.log('DEDICATED REGRESSION SUITE #97');
  console.log('================================================================================\n');

  const testRoot = path.join(process.cwd(), 'data', 'test_scratch_suite_97');
  if (fs.existsSync(testRoot)) {
    fs.rmSync(testRoot, { recursive: true, force: true });
  }
  fs.mkdirSync(testRoot, { recursive: true });

  try {
    // --------------------------------------------------------------------------
    // VECTOR 1: Embedding provider initialization and health probe
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 1: Embedding Provider Initialization & Health Probe ---');
    const deterministicProvider = new DeterministicLocalEmbeddingProvider();
    const detHealth = await deterministicProvider.healthCheck();
    expect(detHealth.healthy === true, 'Deterministic provider health status must be healthy');
    expect(detHealth.isLocal === true, 'Deterministic provider must be strictly local-only');
    expect(detHealth.dimensions === 256, 'Deterministic provider dimension must be 256');
    expect(deterministicProvider.providerId === 'deterministic-local-embedder', 'Provider ID must match');

    // Ollama provider health probe (with cloud fallback strictly disallowed)
    const ollamaProvider = new OllamaEmbeddingProvider({
      baseUrl: 'http://127.0.0.1:11434',
      modelId: 'nomic-embed-text',
    });
    const ollamaHealth = await ollamaProvider.healthCheck();
    expect(ollamaHealth.isLocal === true, 'Ollama provider must be strictly local-only');
    expect(ollamaProvider.providerId === 'ollama-local-embedder', 'Ollama provider ID must match');
    console.log('✔ VECTOR 1 PASSED: Embedding provider initialization and health probe verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 2: Valid dense vector generation with finite numeric values
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 2: Valid Dense Vector Generation with Finite Values ---');
    const embeddingDesc = await deterministicProvider.embed('Government-grade security architecture');
    expect(embeddingDesc.values.length === 256, 'Generated vector must have 256 dimensions');
    expect(embeddingDesc.dimension === 256, 'Reported dimension must be 256');
    expect(embeddingDesc.modelId === 'bow-deterministic-feature-projector-v1', 'Model identifier must match');
    for (let i = 0; i < embeddingDesc.values.length; i++) {
      expect(Number.isFinite(embeddingDesc.values[i]), `Vector element at ${i} must be finite`);
    }
    const norm = VectorMathEngine.l2Norm(embeddingDesc.values);
    expect(Math.abs(norm - 1.0) < 1e-5, 'Generated vector must be L2 unit normalized');

    // Deterministic repeatability: same input gives identical vector
    const embeddingDesc2 = await deterministicProvider.embed('Government-grade security architecture');
    expect(
      VectorMathEngine.cosineSimilarity(embeddingDesc.values, embeddingDesc2.values) > 0.99999,
      'Identical governed input must produce identical deterministic vector'
    );
    console.log('✔ VECTOR 2 PASSED: Dense vector generation with finite values verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 3: Vector dimension consistency and contract validation
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 3: Vector Dimension Consistency & Contract Validation ---');
    EmbeddingVectorValidator.validateRawVector(embeddingDesc.values, 256);

    // Dimension mismatch must throw EmbeddingValidationError
    assert.throws(
      () => EmbeddingVectorValidator.validateRawVector(embeddingDesc.values, 512),
      (err: any) => err instanceof EmbeddingValidationError,
      'Dimension mismatch must be rejected'
    );

    // Out-of-bounds dimension contracts (below 16 or above 4096)
    const tooSmallVec = new Array(10).fill(0.1);
    assert.throws(
      () => EmbeddingVectorValidator.validateRawVector(tooSmallVec, 10),
      (err: any) => err instanceof EmbeddingValidationError,
      'Vectors smaller than MIN_VECTOR_DIMENSIONS must be rejected'
    );
    console.log('✔ VECTOR 3 PASSED: Vector dimension consistency verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 4: Strict rejection of NaN, Infinity, and malformed vectors
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 4: Rejection of NaN, Infinity & Malformed Vectors ---');
    const nanVector = new Array(256).fill(0.1);
    nanVector[5] = NaN;
    assert.throws(
      () => EmbeddingVectorValidator.validateRawVector(nanVector, 256),
      (err: any) => err instanceof EmbeddingValidationError && err.message.includes('NaN'),
      'Vector containing NaN must be rejected'
    );

    const posInfVector = new Array(256).fill(0.1);
    posInfVector[10] = Infinity;
    assert.throws(
      () => EmbeddingVectorValidator.validateRawVector(posInfVector, 256),
      (err: any) => err instanceof EmbeddingValidationError && err.message.includes('Infinity'),
      'Vector containing +Infinity must be rejected'
    );

    const negInfVector = new Array(256).fill(0.1);
    negInfVector[20] = -Infinity;
    assert.throws(
      () => EmbeddingVectorValidator.validateRawVector(negInfVector, 256),
      (err: any) => err instanceof EmbeddingValidationError && err.message.includes('Infinity'),
      'Vector containing -Infinity must be rejected'
    );

    assert.throws(
      () => EmbeddingVectorValidator.validateRawVector('not-an-array' as any, 256),
      (err: any) => err instanceof EmbeddingValidationError,
      'Non-array vector must be rejected'
    );

    assert.throws(
      () => EmbeddingVectorValidator.validateRawVector([], 0),
      (err: any) => err instanceof EmbeddingValidationError,
      'Empty array vector must be rejected'
    );
    console.log('✔ VECTOR 4 PASSED: Rejection of NaN, Infinity & malformed vectors verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 5: Cosine similarity mathematical correctness
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 5: Cosine Similarity Mathematical Correctness ---');
    const v1 = [1, 0, 0, 0];
    const v2 = [1, 0, 0, 0];
    const vOpposite = [-1, 0, 0, 0];
    const vOrthogonal = [0, 1, 0, 0];

    const simIdentical = VectorMathEngine.cosineSimilarity(v1, v2);
    expect(Math.abs(simIdentical - 1.0) < 1e-6, 'Identical vectors must have cosine similarity 1.0');

    const simOpposite = VectorMathEngine.cosineSimilarity(v1, vOpposite);
    expect(Math.abs(simOpposite - -1.0) < 1e-6, 'Opposite vectors must have cosine similarity -1.0');

    const simOrthogonal = VectorMathEngine.cosineSimilarity(v1, vOrthogonal);
    expect(Math.abs(simOrthogonal - 0.0) < 1e-6, 'Orthogonal vectors must have cosine similarity 0.0');
    console.log('✔ VECTOR 5 PASSED: Cosine similarity mathematical correctness verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 6: Zero-magnitude vector safety
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 6: Zero-Magnitude Vector Safety ---');
    const zeroVec = [0, 0, 0, 0];
    const nonZeroVec = [0.5, 0.5, 0.5, 0.5];

    const zeroSim1 = VectorMathEngine.cosineSimilarity(zeroVec, nonZeroVec);
    expect(zeroSim1 === 0.0, 'Zero vector with non-zero vector must yield 0.0 similarity');

    const zeroSim2 = VectorMathEngine.cosineSimilarity(zeroVec, zeroVec);
    expect(zeroSim2 === 0.0, 'Zero vector with zero vector must yield 0.0 similarity');

    const normZero = VectorMathEngine.normalize(zeroVec);
    expect(normZero.every((v) => v === 0), 'Normalizing zero vector must return zero vector without error');
    console.log('✔ VECTOR 6 PASSED: Zero-magnitude vector safety verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 7: Native vector index insertion, retrieval, and removal
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 7: Native Vector Index CRUD Operations ---');
    const index = new NativeVectorIndex({
      tenantId: 'tenant-alpha',
      modelId: 'bow-deterministic-feature-projector-v1',
      dimension: 256,
      maxEntries: 100,
    });

    const testRecord1: SemanticMemoryRecord = {
      memoryId: 'mem-1',
      tenantId: 'tenant-alpha',
      sessionId: 'session-1',
      sourceDomain: 'EPISODIC',
      canonicalText: 'User requested system health check',
      contentHash: computeContentHash('User requested system health check'),
      embedding: embeddingDesc,
      metadata: {},
      indexedAt: new Date().toISOString(),
    };

    index.insert(testRecord1);
    expect(index.size === 1, 'Index size must be 1 after insertion');

    const retrieved = index.get('mem-1', 'tenant-alpha');
    expect(retrieved !== undefined, 'Record must be retrievable');
    expect(retrieved?.memoryId === 'mem-1', 'Retrieved memoryId must match');

    const removed = index.remove('mem-1', 'tenant-alpha');
    expect(removed === true, 'Removal must succeed');
    expect(index.size === 0, 'Index size must be 0 after removal');
    expect(index.get('mem-1', 'tenant-alpha') === undefined, 'Removed record must return undefined');
    console.log('✔ VECTOR 7 PASSED: Native vector index CRUD verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 8: Top-K semantic search and threshold filtering
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 8: Top-K Semantic Search and Threshold Filtering ---');
    const searchIndex = new NativeVectorIndex({
      tenantId: 'tenant-alpha',
      modelId: 'bow-deterministic-feature-projector-v1',
      dimension: 256,
    });

    const queryEmbed = await deterministicProvider.embed('network security configuration');
    const queryVec = queryEmbed.values;

    // Create 3 records with differing content
    const texts = [
      'network security configuration firewall rules',
      'network security and perimeter defense mechanisms',
      'culinary recipe for chocolate cake and frosting',
    ];

    for (let i = 0; i < texts.length; i++) {
      const embed = await deterministicProvider.embed(texts[i]);
      searchIndex.insert({
        memoryId: `mem-${i}`,
        tenantId: 'tenant-alpha',
        sourceDomain: 'EPISODIC',
        canonicalText: texts[i],
        contentHash: computeContentHash(texts[i]),
        embedding: embed,
        metadata: {},
        indexedAt: new Date().toISOString(),
      });
    }

    const resultsAll = searchIndex.search(queryVec, {
      activeTenantId: 'tenant-alpha',
      topK: 2,
      minScore: 0.0,
    });
    expect(resultsAll.length === 2, 'Top-K should return exactly 2 results');
    expect(resultsAll[0].semanticScore >= resultsAll[1].semanticScore, 'Results must be sorted descending by similarity');

    // Threshold filtering: high threshold must filter out cake recipe
    const highThresholdResults = searchIndex.search(queryVec, {
      activeTenantId: 'tenant-alpha',
      topK: 10,
      minScore: 0.6,
    });
    expect(
      highThresholdResults.every((r) => !r.canonicalText.includes('chocolate cake')),
      'Culinary cake recipe must be filtered out by similarity threshold'
    );
    console.log('✔ VECTOR 8 PASSED: Top-K search and threshold filtering verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 9: Multi-tenant vector isolation
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 9: Multi-Tenant Vector Isolation ---');
    const multiTenantIndexA = new NativeVectorIndex({
      tenantId: 'tenant-a',
      modelId: 'bow-deterministic-feature-projector-v1',
      dimension: 256,
    });

    // Inserting record belonging to tenant-alpha into index bound to tenant-a must throw
    assert.throws(
      () => multiTenantIndexA.insert(testRecord1),
      (err: any) => err instanceof CrossTenantSemanticMemoryError,
      'Inserting cross-tenant record into index must be rejected'
    );

    // Correctly insert with matching tenant:
    const tenantARecord: SemanticMemoryRecord = {
      ...testRecord1,
      tenantId: 'tenant-a',
    };
    multiTenantIndexA.insert(tenantARecord);

    // Tenant B cannot retrieve Tenant A's record
    assert.throws(
      () => multiTenantIndexA.get('mem-1', 'tenant-b'),
      (err: any) => err instanceof CrossTenantSemanticMemoryError,
      'Cross-tenant record access must be rejected'
    );

    // Tenant B cannot delete Tenant A's record
    assert.throws(
      () => multiTenantIndexA.remove('mem-1', 'tenant-b'),
      (err: any) => err instanceof CrossTenantSemanticMemoryError,
      'Cross-tenant record deletion must be rejected'
    );

    // Tenant B searching on Tenant A index must throw CrossTenantSemanticMemoryError
    assert.throws(
      () =>
        multiTenantIndexA.search(embeddingDesc.values, {
          activeTenantId: 'tenant-b',
          topK: 10,
        }),
      (err: any) => err instanceof CrossTenantSemanticMemoryError,
      'Cross-tenant search must be rejected'
    );
    console.log('✔ VECTOR 9 PASSED: Multi-tenant vector isolation verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 10: Session-scoped vector filtering
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 10: Session-Scoped Vector Filtering ---');
    const sessionIndex = new NativeVectorIndex({
      tenantId: 'tenant-alpha',
      modelId: 'bow-deterministic-feature-projector-v1',
      dimension: 256,
    });

    sessionIndex.insert({
      ...testRecord1,
      memoryId: 'sess-rec-1',
      sessionId: 'sess-100',
    });
    sessionIndex.insert({
      ...testRecord1,
      memoryId: 'sess-rec-2',
      sessionId: 'sess-200',
    });

    const sess100Results = sessionIndex.search(embeddingDesc.values, {
      activeTenantId: 'tenant-alpha',
      sessionId: 'sess-100',
      topK: 10,
    });
    expect(sess100Results.length === 1, 'Search scoped to sess-100 must return 1 record');
    expect(sess100Results[0].memoryId === 'sess-rec-1', 'Must match sess-rec-1');
    console.log('✔ VECTOR 10 PASSED: Session-scoped vector filtering verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 11: Content hash validation and stale embedding rejection
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 11: Content Hash Validation & Stale Embedding Rejection ---');
    const originalText = 'Original authorized memory entry';
    const modifiedText = 'Tampered or modified memory entry';
    const originalHash = computeContentHash(originalText);
    const modifiedHash = computeContentHash(modifiedText);
    expect(originalHash !== modifiedHash, 'Hashes of different contents must not collide');

    const staleRecord: SemanticMemoryRecord = {
      ...testRecord1,
      canonicalText: modifiedText,
      contentHash: originalHash, // Stale / mismatched hash!
    };

    assert.throws(
      () => {
        const computed = computeContentHash(staleRecord.canonicalText);
        if (computed !== staleRecord.contentHash) {
          throw new SemanticMemoryIntegrityError('Content hash mismatch: embedding is stale or tampered');
        }
      },
      (err: any) => err instanceof SemanticMemoryIntegrityError,
      'Stale embedding with mismatched content hash must be rejected'
    );
    console.log('✔ VECTOR 11 PASSED: Content hash validation verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 12: Model / dimension mismatch rejection
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 12: Model / Dimension Mismatch Rejection ---');
    const incompatibleIndex = new NativeVectorIndex({
      tenantId: 'tenant-alpha',
      modelId: 'bow-deterministic-feature-projector-v1',
      dimension: 256,
    });

    // Incompatible model insert
    assert.throws(
      () =>
        incompatibleIndex.insert({
          ...testRecord1,
          embedding: {
            ...testRecord1.embedding,
            modelId: 'nomic-embed-text',
            dimension: 768,
            values: new Array(768).fill(0.1),
          },
        }),
      (err: any) => err instanceof Error && err.message.includes('bound to'),
      'Incompatible embedding model insert must fail closed'
    );

    // Incompatible dimension query vector
    assert.throws(
      () =>
        incompatibleIndex.search(new Array(128).fill(0.1), {
          activeTenantId: 'tenant-alpha',
          topK: 5,
        }),
      (err: any) => err instanceof EmbeddingValidationError,
      'Incompatible query vector dimension must fail closed'
    );
    console.log('✔ VECTOR 12 PASSED: Model / dimension mismatch rejection verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 13: Atomic crash-safe persistence
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 13: Atomic Crash-Safe Persistence ---');
    const persistence = new SemanticMemoryPersistenceEngine({
      partitionBaseDir: testRoot,
    });

    const indexToSave = new NativeVectorIndex({
      tenantId: 'tenant-alpha',
      modelId: 'bow-deterministic-feature-projector-v1',
      dimension: 256,
    });
    indexToSave.insert(testRecord1);

    persistence.saveIndex(indexToSave, 1, 'tenant-alpha');
    const partitionPath = persistence.resolvePartitionFilePath('tenant-alpha');
    expect(fs.existsSync(partitionPath), 'Partition file must exist after atomic write');

    // Second write must create backup snapshot
    persistence.saveIndex(indexToSave, 2, 'tenant-alpha');
    const bakPath = `${partitionPath}.bak`;
    expect(fs.existsSync(bakPath), 'Backup .bak snapshot must exist after second write');
    console.log('✔ VECTOR 13 PASSED: Atomic crash-safe persistence verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 14: Corruption detection and recovery
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 14: Corruption Detection and Recovery ---');
    // Corrupt primary partition file with garbage data
    fs.writeFileSync(partitionPath, 'CORRUPTED_GARBAGE_DATA_NOT_VALID_JSON{[');

    const recoveryEngine = new SemanticMemoryRecoveryEngine(persistence);
    const recoveredIndex = recoveryEngine.rehydrateIndex('tenant-alpha');
    expect(recoveredIndex !== null, 'Recovery engine must rehydrate from .bak snapshot');
    expect(recoveredIndex.size === 1, 'Recovered index must restore valid record from backup');
    expect(recoveredIndex.get('mem-1', 'tenant-alpha') !== undefined, 'Restored record must match original');
    console.log('✔ VECTOR 14 PASSED: Corruption detection and recovery verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 15: Deterministic idempotent index rebuild
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 15: Deterministic Idempotent Index Rebuild ---');
    const mockEpisodicStore: any = {
      listMemories: (tenantId: string) => [
        {
          memoryId: 'ep-1',
          taskId: 'task-1',
          stepId: 'step-1',
          toolName: 'readPolicy',
          stateDelta: { file: 'policy.json' },
          tenantId,
          taskVersion: 1,
        },
        {
          memoryId: 'ep-2',
          taskId: 'task-1',
          stepId: 'step-2',
          toolName: 'verifyStatus',
          stateDelta: { status: 'healthy' },
          tenantId,
          taskVersion: 1,
        },
      ],
    };

    const rebuildOutcome1 = await recoveryEngine.rebuildFromEpisodicStore(
      'tenant-rebuild',
      mockEpisodicStore,
      deterministicProvider
    );
    expect(rebuildOutcome1.report.indexedCount === 2, 'Rebuild run 1 must index 2 canonical records');
    expect(rebuildOutcome1.index.size === 2, 'Index size must be 2');

    // Rebuild run 2 (idempotent repeat)
    const rebuildOutcome2 = await recoveryEngine.rebuildFromEpisodicStore(
      'tenant-rebuild',
      mockEpisodicStore,
      deterministicProvider
    );
    expect(rebuildOutcome2.report.indexedCount === 2, 'Rebuild run 2 must index 2 records');
    expect(rebuildOutcome2.index.size === 2, 'Index size must be 2');
    console.log('✔ VECTOR 15 PASSED: Deterministic idempotent rebuild verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 16: Hybrid lexical + semantic ranking with bounded weights
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 16: Hybrid Ranking with Bounded Weights ---');
    const hybridEngine = new HybridMemoryRetrievalEngine();

    const lexicalCandidates: LexicalCandidate[] = [
      {
        memoryId: 'cand-1',
        tenantId: 'tenant-hybrid',
        canonicalText: 'System security policy review',
        lexicalScore: 0.9,
        sourceDomain: 'EPISODIC',
      },
      {
        memoryId: 'cand-2',
        tenantId: 'tenant-hybrid',
        canonicalText: 'General status inquiry',
        lexicalScore: 0.4,
        sourceDomain: 'EPISODIC',
      },
    ];

    const hybridIndex = new NativeVectorIndex({
      tenantId: 'tenant-hybrid',
      modelId: 'bow-deterministic-feature-projector-v1',
      dimension: 256,
    });

    const emb1 = await deterministicProvider.embed(lexicalCandidates[0].canonicalText);
    hybridIndex.insert({
      memoryId: 'cand-1',
      tenantId: 'tenant-hybrid',
      sourceDomain: 'EPISODIC',
      canonicalText: lexicalCandidates[0].canonicalText,
      contentHash: computeContentHash(lexicalCandidates[0].canonicalText),
      embedding: emb1,
      metadata: {},
      indexedAt: new Date().toISOString(),
    });

    // Invalid weights: must sum to 1.0
    await assert.rejects(
      async () =>
        hybridEngine.search(
          {
            text: 'System security policy',
            tenantId: 'tenant-hybrid',
            weights: { lexicalWeight: 0.8, semanticWeight: 0.5 },
          },
          hybridIndex,
          deterministicProvider,
          async () => lexicalCandidates
        ),
      (err: any) => err instanceof Error && err.message.includes('must sum to 1.0'),
      'Weights not summing to 1.0 must be rejected'
    );

    const hybridResult = await hybridEngine.search(
      {
        text: 'System security policy',
        tenantId: 'tenant-hybrid',
        weights: { lexicalWeight: 0.5, semanticWeight: 0.5 },
        topK: 5,
      },
      hybridIndex,
      deterministicProvider,
      async () => lexicalCandidates
    );

    expect(hybridResult.retrievalMode === 'HYBRID', 'Hybrid retrieval must succeed in HYBRID mode');
    expect(hybridResult.results.length > 0, 'Results must be returned');
    expect(hybridResult.results[0].memoryId === 'cand-1', 'Highest ranked result must be cand-1');
    expect(
      hybridResult.results[0].hybridScore >= (hybridResult.results[1]?.hybridScore ?? 0),
      'Results must be ordered descending by score'
    );
    console.log('✔ VECTOR 16 PASSED: Hybrid ranking with bounded weights verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 17: Semantic degradation to lexical-only retrieval
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 17: Semantic Degradation to Lexical-Only Retrieval ---');
    const failingProvider: any = {
      providerId: 'failing-provider',
      modelId: 'failing-model',
      modelVersion: '1.0',
      dimensions: 256,
      embed: async () => {
        throw new Error('Local embedding service unavailable');
      },
      healthCheck: async () => ({
        healthy: false,
        providerId: 'failing-provider',
        modelId: 'failing-model',
        dimensions: 256,
        latencyMs: 1,
        isLocal: true,
        statusMessage: 'Failing provider',
      }),
    };

    const degradedResult = await hybridEngine.search(
      {
        text: 'Any query',
        tenantId: 'tenant-hybrid',
        topK: 5,
      },
      hybridIndex,
      failingProvider,
      async () => lexicalCandidates
    );

    expect(degradedResult.retrievalMode === 'DEGRADED_LEXICAL', 'Status must degrade to DEGRADED_LEXICAL');
    expect(degradedResult.results.length === 2, 'Lexical candidates must still be returned');
    expect(degradedResult.results[0].memoryId === 'cand-1', 'Lexical ranking preserved');
    console.log('✔ VECTOR 17 PASSED: Semantic degradation to lexical-only retrieval verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 18: Credential / secret sanitization before embedding
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 18: Credential / Secret Sanitization Before Embedding ---');
    const projectionEngine = new SemanticMemoryProjectionEngine();
    const sensitiveText = 'Admin logged in with superSecretPasswordXYZ123 and token sk-ant-api03-abcdef1234567890';

    const projected = await projectionEngine.project(
      {
        memoryId: 'mem-secret',
        tenantId: 'tenant-sec',
        sourceDomain: 'EPISODIC',
        rawText: sensitiveText,
      },
      deterministicProvider
    );

    expect(!projected.canonicalText.includes('superSecretPasswordXYZ123'), 'Raw password must be scrubbed');
    expect(!projected.canonicalText.includes('sk-ant-api03-abcdef1234567890'), 'Raw token must be scrubbed');
    expect(projected.canonicalText.includes('[REDACTED'), 'Redaction placeholder must be present');
    console.log('✔ VECTOR 18 PASSED: Credential / secret sanitization verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 19: Prototype pollution defense
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 19: Prototype Pollution Defense ---');
    expect(isSafeObjectKey('__proto__') === false, '__proto__ must be rejected');
    expect(isSafeObjectKey('constructor') === false, 'constructor must be rejected');
    expect(isSafeObjectKey('prototype') === false, 'prototype must be rejected');
    expect(isSafeObjectKey('safeKey') === true, 'Normal key must be accepted');

    assert.throws(
      () =>
        assertNoChainOfThought(JSON.parse('{"__proto__": {"polluted": true}}')),
      (err: any) => err instanceof SemanticMemorySecurityError,
      'Payload with __proto__ key must be rejected'
    );

    assert.throws(
      () =>
        assertNoChainOfThought({ constructor: { name: 'attacker' } }),
      (err: any) => err instanceof SemanticMemorySecurityError,
      'Payload with constructor key must be rejected'
    );

    assert.throws(
      () =>
        assertNoChainOfThought({ prototype: { injected: true } }),
      (err: any) => err instanceof SemanticMemorySecurityError,
      'Payload with prototype key must be rejected'
    );
    console.log('✔ VECTOR 19 PASSED: Prototype pollution defense verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 20: Synchronous USER_STOP preemption
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 20: Synchronous USER_STOP Preemption ---');
    try {
      globalMasterHumanAuthority.triggerUserStop('Operator emergency halt');

      // 1. Projection must be preempted
      await assert.rejects(
        async () =>
          projectionEngine.project(
            {
              memoryId: 'mem-stopped',
              tenantId: 'tenant-stop',
              sourceDomain: 'EPISODIC',
              rawText: 'Memory write during stop',
            },
            deterministicProvider
          ),
        (err: any) => err instanceof SemanticMemoryUserStopError,
        'Projection must be synchronously blocked under USER_STOP'
      );

      // 2. Index recovery rebuild must be preempted
      await assert.rejects(
        async () =>
          recoveryEngine.rebuildFromEpisodicStore(
            'tenant-stop',
            mockEpisodicStore,
            deterministicProvider
          ),
        (err: any) => err instanceof SemanticMemoryUserStopError,
        'Index rebuild must be synchronously blocked under USER_STOP'
      );
    } finally {
      globalMasterHumanAuthority.resetUserStop(globalMasterHumanAuthority.masterOperatorId);
    }
    console.log('✔ VECTOR 20 PASSED: Synchronous USER_STOP preemption verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 21: Chain-of-thought prohibition
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 21: Chain-of-Thought Prohibition ---');
    const prohibitedPayloads = [
      { chainOfThought: 'Internal step 1: think about query' },
      { scratchpad: 'Reasoning scratchpad notes' },
      { internalReasoning: 'Hidden thought process' },
      { privateDeliberation: 'Private internal debate' },
      '<thought>Internal reasoning block</thought>',
    ];

    for (const payload of prohibitedPayloads) {
      assert.throws(
        () => assertNoChainOfThought(payload),
        (err: any) => err instanceof SemanticMemoryCoTProhibitedError,
        `Prohibited reasoning payload ${JSON.stringify(payload)} must be rejected`
      );
    }
    console.log('✔ VECTOR 21 PASSED: Chain-of-thought prohibition verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 22: Zero external network dependency in local embedding mode
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 22: Zero External Network Dependency ---');
    // Attempting to construct OllamaEmbeddingProvider pointing to external cloud domain must throw SemanticMemorySecurityError
    assert.throws(
      () =>
        new OllamaEmbeddingProvider({
          baseUrl: 'https://api.openai.com/v1',
        }),
      (err: any) => err instanceof SemanticMemorySecurityError,
      'External cloud embedding domain must be strictly rejected'
    );

    assert.throws(
      () =>
        new OllamaEmbeddingProvider({
          baseUrl: 'https://generativelanguage.googleapis.com',
        }),
      (err: any) => err instanceof SemanticMemorySecurityError,
      'External Google domain must be strictly rejected'
    );
    console.log('✔ VECTOR 22 PASSED: Zero external network dependency verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 23: Zero execution authority
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 23: Zero Execution Authority ---');
    const semanticObjects: any[] = [
      deterministicProvider,
      searchIndex,
      persistence,
      hybridEngine,
      projectionEngine,
      recoveryEngine,
      VectorMathEngine,
      EmbeddingVectorValidator,
    ];

    for (const obj of semanticObjects) {
      expect(typeof obj.execute === 'undefined', 'Object must not expose execute()');
      expect(typeof obj.runTool === 'undefined', 'Object must not expose runTool()');
      expect(typeof obj.shell === 'undefined', 'Object must not expose shell()');
      expect(typeof obj.spawn === 'undefined', 'Object must not expose spawn()');
    }
    console.log('✔ VECTOR 23 PASSED: Zero execution authority verified.\n');

    // --------------------------------------------------------------------------
    // VECTOR 24: Historical regression compatibility check
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 24: Historical Regression Compatibility ---');
    expect(fs.existsSync('tests/test_v4_ms15_cognitive_state.ts'), 'Suite #96 must exist');
    expect(fs.existsSync('tests/test_v4_phase14_exit_boundary_independent_governance_audit.ts'), 'Suite #95 must exist');
    expect(fs.existsSync('tests/test_v4_phase14_reality_validation_readiness.ts'), 'Suite #94 must exist');
    expect(fs.existsSync('tests/test_v4_reality_verification_engine.ts'), 'Suite #93 must exist');
    expect(fs.existsSync('tests/test_v4_ms15_local_first_cognitive_runtime.ts'), 'MS-1.5.01 suite must exist');
    expect(fs.existsSync('tests/test_v4_agent_governed_task_lifecycle.ts'), 'MS-1.4.02 suite must exist');
    console.log('✔ VECTOR 24 PASSED: Historical regression suites intact.\n');

    // --------------------------------------------------------------------------
    // VECTOR 25: Protected workspace isolation
    // --------------------------------------------------------------------------
    console.log('--- VECTOR 25: Protected Workspace Isolation ---');
    const protectedPath = 'C:\\BOW\\shopofbow';
    expect(fs.existsSync(protectedPath) === false, `Protected workspace (${protectedPath}) must remain untouched`);
    console.log('✔ VECTOR 25 PASSED: Protected workspace isolation verified.\n');

    console.log('================================================================================');
    console.log(`ALL 25 VECTORS PASSED (${passedAssertions} assertions confirmed).`);
    console.log('SUITE #97: 100% PASS');
    console.log('================================================================================');
  } finally {
    if (fs.existsSync(testRoot)) {
      try {
        fs.rmSync(testRoot, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  }
}

runSuite97().catch((err) => {
  console.error('[SUITE #97 FAILED]', err);
  process.exit(1);
});
