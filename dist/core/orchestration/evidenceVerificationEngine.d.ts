import type { EvidenceRecord, EvidenceVerificationResult, TaskArtifact, AgentTask, TaskContradiction, AgentTaskResult, TaskId, TaskGroupId } from './taskOrchestrationTypes.js';
import { ArtifactEvidenceEngine } from './artifactEvidenceEngine.js';
export declare class EvidenceVerificationEngine {
    private readonly artifactEngine;
    private readonly evidenceRecords;
    private readonly contradictions;
    constructor(artifactEngine?: ArtifactEvidenceEngine);
    /**
     * Registers a raw evidence record into the engine.
     */
    registerEvidence(record: EvidenceRecord): EvidenceRecord;
    /**
     * Creates an evidence record from an artifact.
     */
    createEvidenceFromArtifact(artifact: TaskArtifact, isSpeculative?: boolean, notes?: string): EvidenceRecord;
    /**
     * Verifies an individual evidence record against task context and artifact integrity.
     */
    verifyEvidenceRecord(evidence: EvidenceRecord, task: AgentTask, rawContent?: string): EvidenceVerificationResult;
    /**
     * Evaluates two or more agent results for the same task/group to detect contradictions.
     * INVARIANT: Preserves contradiction records with full provenance; never auto-resolves.
     */
    detectContradictions(results: readonly AgentTaskResult[], taskGroupId: TaskGroupId): readonly TaskContradiction[];
    getEvidence(evidenceId: string): EvidenceRecord | undefined;
    getEvidenceByTask(taskId: TaskId): readonly EvidenceRecord[];
    getContradictionsByTask(taskId: TaskId): readonly TaskContradiction[];
    getAllContradictions(): readonly TaskContradiction[];
    clear(): void;
}
export declare const globalEvidenceVerificationEngine: EvidenceVerificationEngine;
