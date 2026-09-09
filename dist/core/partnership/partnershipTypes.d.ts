export declare const MASTER_OWNER_ID = "master_operator";
export declare const AUTHORIZED_MASTER_OWNER_ALIASES: readonly string[];
export declare function isMasterOwner(ownerId?: string | null): boolean;
export declare function assertMasterOwner(ownerId?: string | null, actionDescription?: string): void;
export type EpistemicCategory = 'FACT' | 'OBSERVATION' | 'INFERENCE' | 'ASSUMPTION' | 'HYPOTHESIS' | 'RECOMMENDATION' | 'UNCERTAINTY' | 'OWNER_DECISION';
export declare const EPISTEMIC_CATEGORIES: readonly ["FACT", "OBSERVATION", "INFERENCE", "ASSUMPTION", "HYPOTHESIS", "RECOMMENDATION", "UNCERTAINTY", "OWNER_DECISION"];
export interface EpistemicStatement<T = any> {
    readonly id: string;
    readonly category: EpistemicCategory;
    readonly statement: string;
    readonly data?: T;
    readonly confidence: number;
    readonly source: string;
    readonly timestamp: number;
}
export type MemoryProvenance = 'OWNER_EXPLICIT' | 'EXECUTION_VERIFIED' | 'SYSTEM_OBSERVED' | 'DERIVED' | 'INFERRED' | 'IMPORTED';
export declare const MEMORY_PROVENANCE_PRECEDENCE: Record<MemoryProvenance, number>;
export declare function compareProvenance(a: MemoryProvenance, b: MemoryProvenance): number;
export type MemoryCategory = 'IDENTITY' | 'PROJECT' | 'DECISION' | 'PROBLEM' | 'PREFERENCE' | 'CONSTRAINT' | 'INCIDENT' | 'OUTCOME';
export type MemoryStatus = 'ACTIVE' | 'ARCHIVED' | 'CONTRADICTED' | 'SUPERSEDED' | 'UNCONFIRMED';
export type CertaintyLevel = 'ABSOLUTE' | 'HIGH' | 'MEDIUM' | 'LOW' | 'UNCERTAIN';
export interface PersonalMemoryItem {
    readonly memoryId: string;
    readonly ownerId: string;
    readonly sessionId?: string;
    readonly category: MemoryCategory;
    readonly content: string;
    readonly source: string;
    readonly createdAt: number;
    updatedAt: number;
    confidence: number;
    certainty: CertaintyLevel;
    provenance: MemoryProvenance;
    status: MemoryStatus;
    tags: string[];
    metadata?: Record<string, any>;
    readonly checksum?: string;
}
export declare function computeMemoryChecksum(item: Omit<PersonalMemoryItem, 'checksum'>): string;
export interface CognitiveChallenge {
    readonly challengeId: string;
    readonly decision: string;
    readonly assessment: string;
    readonly concern: string;
    readonly evidence: string[];
    readonly confidence: number;
    readonly unknowns: string[];
    readonly alternative: string;
    readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
    ownerDecision?: 'WAITING FOR MASTER OWNER' | 'CONFIRMED' | 'OVERRIDDEN' | 'ABANDONED';
    readonly createdAt: number;
    resolvedAt?: number;
}
export type ContradictionType = 'TELEMETRY_VS_MEMORY' | 'OBSERVATION_VS_ASSUMPTION' | 'OUTCOME_VS_EXPECTATION' | 'STATEMENT_VS_FACT';
export interface ContradictionRecord {
    readonly contradictionId: string;
    readonly type: ContradictionType;
    readonly previousBelief: string;
    readonly currentEvidence: string;
    readonly recommendedAction: string;
    readonly detectedAt: number;
    resolved: boolean;
    resolutionNotes?: string;
}
export interface SelfCorrectionRecord {
    readonly correctionId: string;
    readonly previousAssessment: string;
    readonly newEvidence: string;
    readonly detectedError: string;
    readonly correctedAssessment: string;
    readonly confidenceChange: {
        readonly before: number;
        readonly after: number;
    };
    readonly affectedDecisions: string[];
    readonly timestamp: number;
}
export interface OutcomeLearningRecord {
    readonly learningId: string;
    readonly actionId: string;
    readonly expectedOutcome: string;
    readonly actualOutcome: string;
    readonly verdict: 'SUCCESS' | 'PARTIAL' | 'FAILURE';
    readonly unexpectedSideEffects: string[];
    readonly unexpectedEnvironmentalConditions: string[];
    readonly incorrectAssumptions: string[];
    readonly incorrectPredictions: string[];
    readonly learnedInsights: string[];
    readonly timestamp: number;
}
export interface OwnerOverrideRecord {
    readonly overrideId: string;
    readonly ownerId: string;
    readonly sessionId?: string;
    readonly decision: string;
    readonly bowconRecommendation: string;
    readonly ownerOverride: string;
    readonly reason: string;
    readonly timestamp: number;
    readonly affectedGoal?: string;
    readonly affectedTask?: string;
}
export type KnowledgeNodeType = 'OWNER' | 'PROJECT' | 'GOAL' | 'TASK' | 'DECISION' | 'PROBLEM' | 'PREFERENCE' | 'CONSTRAINT' | 'KNOWLEDGE' | 'INCIDENT' | 'OUTCOME';
export type KnowledgeEdgeType = 'HAS_PROJECT' | 'HAS_GOAL' | 'HAS_TASK' | 'HAS_DECISION' | 'HAS_PROBLEM' | 'DEPENDS_ON' | 'RESOLVED_BY' | 'PRODUCED_OUTCOME' | 'HAS_PREFERENCE' | 'HAS_CONSTRAINT' | 'RELATES_TO';
export interface KnowledgeGraphNode {
    readonly id: string;
    readonly label: string;
    readonly type: KnowledgeNodeType;
    readonly properties: Record<string, any>;
    readonly createdAt: number;
}
export interface KnowledgeGraphEdge {
    readonly id: string;
    readonly source: string;
    readonly target: string;
    readonly relationship: KnowledgeEdgeType;
    readonly metadata?: Record<string, any>;
}
export interface PersonalOperatingModel {
    readonly ownerId: string;
    readonly activeProjects: string[];
    readonly activeGoals: string[];
    readonly currentObjective?: string;
    readonly currentTask?: string;
    readonly knownConstraints: string[];
    readonly knownRisks: string[];
    readonly recentDecisions: string[];
    readonly unresolvedProblems: string[];
    readonly currentHostState: Record<string, any>;
    readonly availableCapabilities: string[];
    readonly pendingAuthorizations: number;
    readonly lastVerifiedOutcome?: string;
    readonly currentConfidence: number;
    readonly contradictions: string[];
    readonly timestamp: number;
}
export type MasterOwnerCommandType = 'ASK' | 'ANALYZE' | 'EXPLAIN' | 'CHALLENGE' | 'RECOMMEND' | 'PLAN' | 'APPROVE' | 'DENY' | 'OVERRIDE' | 'STOP' | 'PAUSE' | 'RESUME' | 'RESET' | 'CONFIGURE';
export interface MasterOwnerCommand {
    readonly commandId: string;
    readonly ownerId: string;
    readonly sessionId?: string;
    readonly type: MasterOwnerCommandType;
    readonly payload: Record<string, any>;
    readonly timestamp: number;
}
export declare function generatePartnershipId(prefix: string): string;
