// src/core/semanticMemory/localEmbeddingProvider.ts
// BOWCON V4.0 — MS-1.5.03: LOCAL EMBEDDING PROVIDER CONTRACT & IMPLEMENTATIONS
// Component 999 — REAL
//
// Invariants:
// LOCAL_FIRST_OR_FAIL_CLOSED == TRUE
// ZERO_CLOUD_EMBEDDING_FALLBACK == TRUE
// ZERO_EXTERNAL_NETWORK_EGRESS == TRUE
// DETERMINISTIC_VECTOR_REPRODUCIBILITY == TRUE
import crypto from 'node:crypto';
import { EmbeddingValidationError, SemanticMemorySecurityError, computeContentHash, assertNoChainOfThought, } from './semanticMemoryTypes.js';
import { EmbeddingVectorValidator } from './embeddingVectorValidator.js';
import { VectorMathEngine } from './vectorMathEngine.js';
/**
 * Deterministic Local Embedding Provider:
 * Generates fixed-dimension, normalized dense vectors using a cryptographically deterministic
 * feature-hashing projection across character n-grams and subwords.
 * 100% Node-native, zero network egress, zero cloud dependency, perfectly reproducible.
 */
export class DeterministicLocalEmbeddingProvider {
    providerId = 'deterministic-local-embedder';
    modelId;
    modelVersion;
    dimensions;
    constructor(options) {
        this.dimensions = options?.dimensions ?? 256;
        this.modelId = options?.modelId ?? 'bow-deterministic-feature-projector-v1';
        this.modelVersion = options?.modelVersion ?? '1.0.0';
    }
    async embed(text, signal) {
        if (signal?.aborted) {
            throw new Error('Embedding generation aborted by signal');
        }
        // Chain-of-thought check
        assertNoChainOfThought(text, 'embed.text');
        const clean = (text || '').trim();
        if (!clean) {
            throw new EmbeddingValidationError('Cannot embed empty or whitespace-only text', ['EMPTY_TEXT']);
        }
        const contentHash = computeContentHash(clean);
        const vectorValues = this.generateDeterministicVector(clean);
        const descriptor = Object.freeze({
            vectorId: `vec_${crypto.randomBytes(8).toString('hex')}`,
            providerId: this.providerId,
            modelId: this.modelId,
            modelVersion: this.modelVersion,
            dimension: this.dimensions,
            values: vectorValues,
            contentHash,
            createdAt: new Date().toISOString(),
        });
        EmbeddingVectorValidator.validateDescriptor(descriptor);
        return descriptor;
    }
    async healthCheck(signal) {
        const start = Date.now();
        try {
            const probeVector = await this.embed('BOWCON deterministic health probe', signal);
            const latencyMs = Date.now() - start;
            return Object.freeze({
                healthy: true,
                providerId: this.providerId,
                modelId: this.modelId,
                dimensions: probeVector.dimension,
                latencyMs,
                isLocal: true,
                statusMessage: `Deterministic local embedding ready (${this.dimensions}d, zero cloud egress)`,
            });
        }
        catch (err) {
            return Object.freeze({
                healthy: false,
                providerId: this.providerId,
                modelId: this.modelId,
                dimensions: this.dimensions,
                latencyMs: Date.now() - start,
                isLocal: true,
                statusMessage: `Deterministic embedding error: ${err.message}`,
            });
        }
    }
    /**
     * Generates a deterministic dense normalized float vector from input text using
     * cryptographic salted feature hashing across unigrams, bigrams, and character n-grams.
     */
    generateDeterministicVector(text) {
        const rawVector = new Float64Array(this.dimensions);
        const normalizedText = text.toLowerCase();
        const tokens = normalizedText.split(/\s+/).filter(Boolean);
        // Feature 1: Subword character 3-grams
        for (let i = 0; i <= normalizedText.length - 3; i++) {
            const gram = normalizedText.slice(i, i + 3);
            const hash = crypto.createHash('sha256').update(`gram:${gram}`).digest();
            const bucket = hash.readUInt32BE(0) % this.dimensions;
            const sign = (hash.readUInt8(4) & 1) === 1 ? 1.0 : -1.0;
            rawVector[bucket] += sign * 1.5;
        }
        // Feature 2: Word unigrams & bigrams
        for (let i = 0; i < tokens.length; i++) {
            const word = tokens[i];
            const hWord = crypto.createHash('sha256').update(`word:${word}`).digest();
            const bWord = hWord.readUInt32BE(0) % this.dimensions;
            const sWord = (hWord.readUInt8(4) & 1) === 1 ? 1.0 : -1.0;
            rawVector[bWord] += sWord * 2.0;
            if (i < tokens.length - 1) {
                const bigram = `${word}_${tokens[i + 1]}`;
                const hBi = crypto.createHash('sha256').update(`bi:${bigram}`).digest();
                const bBi = hBi.readUInt32BE(0) % this.dimensions;
                const sBi = (hBi.readUInt8(4) & 1) === 1 ? 1.0 : -1.0;
                rawVector[bBi] += sBi * 2.5;
            }
        }
        // Convert to Array and normalize L2
        const arr = Array.from(rawVector);
        return VectorMathEngine.normalize(arr);
    }
}
export class OllamaEmbeddingProvider {
    providerId = 'ollama-local-embedder';
    baseUrl;
    modelId;
    modelVersion = 'ollama-native';
    dimensions = 768; // Dynamically adapted upon first valid embedding
    defaultTimeoutMs;
    fetchFn;
    constructor(options) {
        const rawUrl = (options?.baseUrl ||
            process.env.LOCAL_OLLAMA_BASE_URL ||
            'http://127.0.0.1:11434').replace(/\/+$/, '');
        try {
            const parsed = new URL(rawUrl);
            const host = parsed.hostname.toLowerCase();
            const isLoopback = host === 'localhost' ||
                host === '127.0.0.1' ||
                host === '::1' ||
                host === '[::1]';
            if (!isLoopback) {
                throw new SemanticMemorySecurityError(`Security violation: OllamaEmbeddingProvider must only connect to local loopback daemon. External host '${host}' is strictly prohibited.`, { host, url: rawUrl });
            }
        }
        catch (err) {
            if (err instanceof SemanticMemorySecurityError)
                throw err;
            throw new SemanticMemorySecurityError(`Invalid Ollama baseUrl: ${rawUrl}`);
        }
        this.baseUrl = rawUrl;
        this.modelId =
            options?.modelId ||
                process.env.LOCAL_EMBEDDING_MODEL ||
                'nomic-embed-text';
        this.defaultTimeoutMs = options?.defaultTimeoutMs ?? 15000;
        this.fetchFn = options?.fetchFn || fetch;
    }
    async embed(text, signal) {
        assertNoChainOfThought(text, 'ollama.embed.text');
        const clean = (text || '').trim();
        if (!clean) {
            throw new EmbeddingValidationError('Cannot embed empty text', ['EMPTY_TEXT']);
        }
        const contentHash = computeContentHash(clean);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.defaultTimeoutMs);
        if (signal) {
            signal.addEventListener('abort', () => controller.abort(), { once: true });
        }
        try {
            const resp = await this.fetchFn(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.modelId,
                    prompt: clean,
                }),
                signal: controller.signal,
            });
            if (!resp.ok) {
                throw new Error(`Ollama embedding HTTP ${resp.status}: ${await resp.text()}`);
            }
            const data = await resp.json();
            if (data.error) {
                throw new Error(`Ollama embedding error: ${data.error}`);
            }
            const rawValues = data.embedding;
            if (!Array.isArray(rawValues) || rawValues.length === 0) {
                throw new Error('Ollama returned empty or malformed embedding vector');
            }
            this.dimensions = rawValues.length;
            const normalizedValues = VectorMathEngine.normalize(rawValues);
            const descriptor = Object.freeze({
                vectorId: `vec_${crypto.randomBytes(8).toString('hex')}`,
                providerId: this.providerId,
                modelId: this.modelId,
                modelVersion: this.modelVersion,
                dimension: this.dimensions,
                values: normalizedValues,
                contentHash,
                createdAt: new Date().toISOString(),
            });
            EmbeddingVectorValidator.validateDescriptor(descriptor);
            return descriptor;
        }
        finally {
            clearTimeout(timeout);
        }
    }
    async healthCheck(signal) {
        const start = Date.now();
        try {
            const probeVector = await this.embed('BOWCON Ollama health check probe', signal);
            const latencyMs = Date.now() - start;
            return Object.freeze({
                healthy: true,
                providerId: this.providerId,
                modelId: this.modelId,
                dimensions: probeVector.dimension,
                latencyMs,
                isLocal: true,
                statusMessage: `Ollama local embedding endpoint active at ${this.baseUrl} with model ${this.modelId}`,
            });
        }
        catch (err) {
            return Object.freeze({
                healthy: false,
                providerId: this.providerId,
                modelId: this.modelId,
                dimensions: this.dimensions,
                latencyMs: Date.now() - start,
                isLocal: true,
                statusMessage: `Ollama embedding unavailable: ${err.message}`,
            });
        }
    }
}
