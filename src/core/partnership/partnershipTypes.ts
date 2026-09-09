// src/core/partnership/partnershipTypes.ts
// BOWCON V4.0 — MS-1.3.39: MASTER OWNER COGNITIVE PARTNERSHIP & PERSISTENT PERSONAL INTELLIGENCE RUNTIME
//
// Authoritative contracts, types, and schemas for the Master Owner Cognitive Partnership.
//
// Invariants:
// MASTER_OWNER_AUTHORITY > BOWCON_REASONING > BOWCON_AUTONOMY
// BOWCON_OPINION != AUTHORITY
// BOWCON_CONFIDENCE != AUTHORITY
// BOWCON_INTELLIGENCE != AUTHORITY
// BOWCON_REASONING != AUTHORITY
// BOWCON_AUTONOMY != OWNERSHIP
// INFERENCE != CONFIRMED MEMORY
// CHALLENGE != AUTHORITY
// RECOMMENDATION != EXECUTION
// LEARNING != AUTHORIZATION
// OWNER OVERRIDE != BOWCON FAILURE
// PROTECTED_WORKSPACE: C:\BOW\shopofbow -> READS = 0, WRITES = 0, IMPORTS = 0, TOUCHES = 0

import { createHash, randomBytes } from 'node:crypto';

// ---------------------------------------------------------------------------
// 1. Master Owner Identity & Authorities
// ---------------------------------------------------------------------------

export const MASTER_OWNER_ID = 'master_operator';

export const AUTHORIZED_MASTER_OWNER_ALIASES = Object.freeze([
  'master_operator',
  'user_primary',
  'operator',
  'boss_user',
]);

export function isMasterOwner(ownerId?: string | null): boolean {
  if (!ownerId || typeof ownerId !== 'string') return false;
  return AUTHORIZED_MASTER_OWNER_ALIASES.includes(ownerId.trim().toLowerCase());
}

export function assertMasterOwner(ownerId?: string | null, actionDescription: string = 'Operation'): void {
  if (!isMasterOwner(ownerId)) {
    throw new Error(
      `[AUTHORITY_DENIED] ${actionDescription} requires Master Owner authority. Provided: '${ownerId}'`
    );
  }
}

// ---------------------------------------------------------------------------
// 2. Epistemic Category Taxonomy
// Invariant: No category may be silently represented as another category.
// ---------------------------------------------------------------------------

export type EpistemicCategory =
  | 'FACT'
  | 'OBSERVATION'
  | 'INFERENCE'
  | 'ASSUMPTION'
  | 'HYPOTHESIS'
  | 'RECOMMENDATION'
  | 'UNCERTAINTY'
  | 'OWNER_DECISION';

export const EPISTEMIC_CATEGORIES = Object.freeze([
  'FACT',
  'OBSERVATION',
  'INFERENCE',
  'ASSUMPTION',
  'HYPOTHESIS',
  'RECOMMENDATION',
  'UNCERTAINTY',
  'OWNER_DECISION',
] as const);

export interface EpistemicStatement<T = any> {
  readonly id: string;
  readonly category: EpistemicCategory;
  readonly statement: string;
  readonly data?: T;
  readonly confidence: number; // 0.0 to 1.0
  readonly source: string;
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// 3. Memory Provenance & Hierarchy
// Priority: OWNER_EXPLICIT > EXECUTION_VERIFIED > SYSTEM_OBSERVED > DERIVED > INFERRED > IMPORTED
// ---------------------------------------------------------------------------

export type MemoryProvenance =
  | 'OWNER_EXPLICIT'
  | 'EXECUTION_VERIFIED'
  | 'SYSTEM_OBSERVED'
  | 'DERIVED'
  | 'INFERRED'
  | 'IMPORTED';

export const MEMORY_PROVENANCE_PRECEDENCE: Record<MemoryProvenance, number> = Object.freeze({
  OWNER_EXPLICIT: 5,
  EXECUTION_VERIFIED: 4,
  SYSTEM_OBSERVED: 3,
  DERIVED: 2,
  INFERRED: 1,
  IMPORTED: 0,
});

export function compareProvenance(a: MemoryProvenance, b: MemoryProvenance): number {
  return (MEMORY_PROVENANCE_PRECEDENCE[b] ?? 0) - (MEMORY_PROVENANCE_PRECEDENCE[a] ?? 0);
}

// ---------------------------------------------------------------------------
// 4. Memory Item Contract & Taxonomy
// ---------------------------------------------------------------------------

export type MemoryCategory =
  | 'IDENTITY'
  | 'PROJECT'
  | 'DECISION'
  | 'PROBLEM'
  | 'PREFERENCE'
  | 'CONSTRAINT'
  | 'INCIDENT'
  | 'OUTCOME';

export type MemoryStatus =
  | 'ACTIVE'
  | 'ARCHIVED'
  | 'CONTRADICTED'
  | 'SUPERSEDED'
  | 'UNCONFIRMED';

export type CertaintyLevel =
  | 'ABSOLUTE'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNCERTAIN';

export interface PersonalMemoryItem {
  readonly memoryId: string;
  readonly ownerId: string;
  readonly sessionId?: string;
  readonly category: MemoryCategory;
  readonly content: string;
  readonly source: string;
  readonly createdAt: number;
  updatedAt: number;
  confidence: number; // 0.0 to 1.0
  certainty: CertaintyLevel;
  provenance: MemoryProvenance;
  status: MemoryStatus;
  tags: string[];
  metadata?: Record<string, any>;
  readonly checksum?: string;
}

export function computeMemoryChecksum(item: Omit<PersonalMemoryItem, 'checksum'>): string {
  const payload = `${item.memoryId}:${item.ownerId}:${item.category}:${item.content}:${item.provenance}:${item.createdAt}`;
  return createHash('sha256').update(payload).digest('hex');
}

// ---------------------------------------------------------------------------
// 5. Cognitive Challenge Contract
// ---------------------------------------------------------------------------

export interface CognitiveChallenge {
  readonly challengeId: string;
  readonly decision: string;
  readonly assessment: string;
  readonly concern: string;
  readonly evidence: string[];
  readonly confidence: number; // 0.0 to 1.0
  readonly unknowns: string[];
  readonly alternative: string;
  readonly severity: 'INFO' | 'WARNING' | 'CRITICAL';
  ownerDecision?: 'WAITING FOR MASTER OWNER' | 'CONFIRMED' | 'OVERRIDDEN' | 'ABANDONED';
  readonly createdAt: number;
  resolvedAt?: number;
}

// ---------------------------------------------------------------------------
// 6. Contradiction Detection Record
// ---------------------------------------------------------------------------

export type ContradictionType =
  | 'TELEMETRY_VS_MEMORY'
  | 'OBSERVATION_VS_ASSUMPTION'
  | 'OUTCOME_VS_EXPECTATION'
  | 'STATEMENT_VS_FACT';

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

// ---------------------------------------------------------------------------
// 7. Self-Correction Record
// ---------------------------------------------------------------------------

export interface SelfCorrectionRecord {
  readonly correctionId: string;
  readonly previousAssessment: string;
  readonly newEvidence: string;
  readonly detectedError: string;
  readonly correctedAssessment: string;
  readonly confidenceChange: { readonly before: number; readonly after: number };
  readonly affectedDecisions: string[];
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// 8. Outcome Learning Record
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 9. Owner Override Record
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 10. Personal Knowledge Graph Types
// ---------------------------------------------------------------------------

export type KnowledgeNodeType =
  | 'OWNER'
  | 'PROJECT'
  | 'GOAL'
  | 'TASK'
  | 'DECISION'
  | 'PROBLEM'
  | 'PREFERENCE'
  | 'CONSTRAINT'
  | 'KNOWLEDGE'
  | 'INCIDENT'
  | 'OUTCOME';

export type KnowledgeEdgeType =
  | 'HAS_PROJECT'
  | 'HAS_GOAL'
  | 'HAS_TASK'
  | 'HAS_DECISION'
  | 'HAS_PROBLEM'
  | 'DEPENDS_ON'
  | 'RESOLVED_BY'
  | 'PRODUCED_OUTCOME'
  | 'HAS_PREFERENCE'
  | 'HAS_CONSTRAINT'
  | 'RELATES_TO';

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

// ---------------------------------------------------------------------------
// 11. Personal Operating Model (Current World Model)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 12. Master Owner Command Semantics
// ---------------------------------------------------------------------------

export type MasterOwnerCommandType =
  | 'ASK'
  | 'ANALYZE'
  | 'EXPLAIN'
  | 'CHALLENGE'
  | 'RECOMMEND'
  | 'PLAN'
  | 'APPROVE'
  | 'DENY'
  | 'OVERRIDE'
  | 'STOP'
  | 'PAUSE'
  | 'RESUME'
  | 'RESET'
  | 'CONFIGURE';

export interface MasterOwnerCommand {
  readonly commandId: string;
  readonly ownerId: string;
  readonly sessionId?: string;
  readonly type: MasterOwnerCommandType;
  readonly payload: Record<string, any>;
  readonly timestamp: number;
}

// ---------------------------------------------------------------------------
// 13. Unique ID Generators
// ---------------------------------------------------------------------------

export function generatePartnershipId(prefix: string): string {
  const timestamp = Date.now();
  const rand = randomBytes(4).toString('hex');
  return `${prefix}_${timestamp}_${rand}`;
}
