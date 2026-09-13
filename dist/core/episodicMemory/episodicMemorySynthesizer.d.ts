import type { DurableCommitRecord } from '../durableCommit/durableCommitTypes.js';
import type { EpisodicMemorySynthesis, EpisodicMemoryRecord } from './episodicMemoryTypes.js';
export interface SynthesizerInput {
    readonly commitRecord: DurableCommitRecord;
    readonly memoryRecord?: EpisodicMemoryRecord;
    readonly contextRecords?: readonly EpisodicMemoryRecord[];
}
export declare class EpisodicMemorySynthesizer {
    /**
     * EN: Produces a canonical JSON string with deterministically sorted keys.
     */
    private canonicalJSON;
    /**
     * EN: Computes SHA-256 digest of input string.
     */
    private hash256;
    /**
     * EN: Generates a deterministic lesson ID.
     */
    private computeLessonId;
    /**
     * EN: Synthesizes deterministic lessons, causal links, and summary from committed evidence.
     * PURE & SIDE-EFFECT FREE.
     */
    synthesize(input: SynthesizerInput): EpisodicMemorySynthesis;
}
export declare const globalEpisodicMemorySynthesizer: EpisodicMemorySynthesizer;
