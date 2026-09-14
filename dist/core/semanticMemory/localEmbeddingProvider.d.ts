import { type EmbeddingVectorDescriptor } from './semanticMemoryTypes.js';
export interface EmbeddingProviderHealth {
    readonly healthy: boolean;
    readonly providerId: string;
    readonly modelId: string;
    readonly dimensions: number;
    readonly latencyMs: number;
    readonly isLocal: boolean;
    readonly statusMessage: string;
}
export interface LocalEmbeddingProvider {
    readonly providerId: string;
    readonly modelId: string;
    readonly modelVersion: string;
    readonly dimensions: number;
    embed(text: string, signal?: AbortSignal): Promise<EmbeddingVectorDescriptor>;
    healthCheck(signal?: AbortSignal): Promise<EmbeddingProviderHealth>;
}
export interface DeterministicEmbeddingOptions {
    readonly dimensions?: number;
    readonly modelId?: string;
    readonly modelVersion?: string;
}
/**
 * Deterministic Local Embedding Provider:
 * Generates fixed-dimension, normalized dense vectors using a cryptographically deterministic
 * feature-hashing projection across character n-grams and subwords.
 * 100% Node-native, zero network egress, zero cloud dependency, perfectly reproducible.
 */
export declare class DeterministicLocalEmbeddingProvider implements LocalEmbeddingProvider {
    readonly providerId = "deterministic-local-embedder";
    readonly modelId: string;
    readonly modelVersion: string;
    readonly dimensions: number;
    constructor(options?: DeterministicEmbeddingOptions);
    embed(text: string, signal?: AbortSignal): Promise<EmbeddingVectorDescriptor>;
    healthCheck(signal?: AbortSignal): Promise<EmbeddingProviderHealth>;
    /**
     * Generates a deterministic dense normalized float vector from input text using
     * cryptographic salted feature hashing across unigrams, bigrams, and character n-grams.
     */
    private generateDeterministicVector;
}
export interface OllamaEmbeddingOptions {
    readonly baseUrl?: string;
    readonly modelId?: string;
    readonly defaultTimeoutMs?: number;
    readonly fetchFn?: typeof fetch;
}
export declare class OllamaEmbeddingProvider implements LocalEmbeddingProvider {
    readonly providerId = "ollama-local-embedder";
    readonly baseUrl: string;
    readonly modelId: string;
    readonly modelVersion = "ollama-native";
    dimensions: number;
    readonly defaultTimeoutMs: number;
    private readonly fetchFn;
    constructor(options?: OllamaEmbeddingOptions);
    embed(text: string, signal?: AbortSignal): Promise<EmbeddingVectorDescriptor>;
    healthCheck(signal?: AbortSignal): Promise<EmbeddingProviderHealth>;
}
