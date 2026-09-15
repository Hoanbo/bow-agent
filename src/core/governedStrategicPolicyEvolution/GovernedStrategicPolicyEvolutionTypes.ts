// ============================================================================
// BOWCON V4.0 — MILESTONE MS-1.5.19
// Component 1158: GovernedStrategicPolicyEvolutionTypes
// Canonical Contracts, Ontology, Error Hierarchy, Ceilings, & Provenance Hashers
// ============================================================================

import * as crypto from 'crypto';

// EN: Mandatory governance invariants asserting that deliberation does not equal policy authority or execution.
// VI: Các bất biến quản trị bắt buộc khẳng định rằng nghị sự không đồng nghĩa với quyền chính sách hay thực thi.
export const STRATEGIC_POLICY_EVOLUTION_INVARIANTS = {
  AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: 'AGENT_CAPABILITY != HUMAN_AUTHORITY',
  KNOWLEDGE_NOT_AUTHORIZATION: 'KNOWLEDGE != AUTHORIZATION',
  CONSENSUS_NOT_AUTHORIZATION: 'CONSENSUS != AUTHORIZATION',
  CONFIDENCE_NOT_AUTHORITY: 'CONFIDENCE != AUTHORITY',
  AGREEMENT_NOT_HUMAN_APPROVAL: 'AGREEMENT != HUMAN_APPROVAL',
  STATE_NOT_PRIVILEGE: 'STATE != PRIVILEGE',
  PERSISTENCE_NOT_EXECUTION: 'PERSISTENCE != EXECUTION',
  COLLECTIVE_INTELLIGENCE_NOT_HUMAN_GOVERNANCE: 'COLLECTIVE_INTELLIGENCE != HUMAN_GOVERNANCE',
  STRATEGIC_MEMORY_NOT_EXECUTION_PERMISSION: 'STRATEGIC_MEMORY != EXECUTION_PERMISSION',
  LEARNED_POLICY_NOT_AUTHORIZATION: 'LEARNED_POLICY != AUTHORIZATION',
  MS_1518_NOT_AUTONOMY_LEASE_AUTHORITY: 'MS-1.5.18 != AUTONOMY_LEASE_AUTHORITY',
  MS_1518_NOT_DIRECT_EXECUTION: 'MS-1.5.18 != DIRECT_EXECUTION',
  MS_1519_NOT_PDP: 'MS-1.5.19 != PDP',
  MS_1519_NOT_AUTONOMY_LEASE_AUTHORITY: 'MS-1.5.19 != AUTONOMY_LEASE_AUTHORITY',
  MS_1519_NOT_DIRECT_EXECUTION: 'MS-1.5.19 != DIRECT_EXECUTION',
  RECOMMENDATION_NOT_POLICY: 'RECOMMENDATION != POLICY',
  RECOMMENDATION_NOT_AUTHORIZATION: 'RECOMMENDATION != AUTHORIZATION',
  DELIBERATION_NOT_APPROVAL: 'DELIBERATION != APPROVAL',
  APPROVED_FOR_PDP_HANDOFF_NOT_POLICY_APPROVED: 'APPROVED_FOR_PDP_HANDOFF != POLICY_APPROVED',
  APPROVED_FOR_PDP_HANDOFF_NOT_POLICY_MUTATION_AUTHORIZATION: 'APPROVED_FOR_PDP_HANDOFF != POLICY_MUTATION_AUTHORIZATION',
  APPROVED_FOR_PDP_HANDOFF_NOT_EXECUTION_AUTHORIZATION: 'APPROVED_FOR_PDP_HANDOFF != EXECUTION_AUTHORIZATION',
  HUMAN_DELIBERATION_NOT_POLICY_MUTATION: 'HUMAN_DELIBERATION != POLICY_MUTATION',
  HUMAN_APPROVAL_NOT_DIRECT_EXECUTION: 'HUMAN_APPROVAL != DIRECT_EXECUTION',
  SIMULATION_NOT_EXECUTION: 'SIMULATION != EXECUTION',
  SIMULATION_RESULT_NOT_AUTHORIZATION: 'SIMULATION_RESULT != AUTHORIZATION',
  SIMULATION_RESULT_NOT_EXECUTION: 'SIMULATION_RESULT != EXECUTION',
  ADVISORY_RESULT_NOT_AUTHORIZATION: 'ADVISORY_RESULT != AUTHORIZATION',
  HASH_NOT_AUTHORIZATION: 'HASH != AUTHORIZATION',
  LEASE_SUPERVISION_NOT_LEASE_EXPANSION: 'LEASE_SUPERVISION != LEASE_EXPANSION',
} as const;

export const GOVERNED_STRATEGIC_POLICY_EVOLUTION_INVARIANTS = STRATEGIC_POLICY_EVOLUTION_INVARIANTS;

// EN: Strict hard ceilings to guarantee bounded CPU, memory, and storage footprints.
// VI: Các giới hạn trần cứng nghiêm ngặt để đảm bảo giới hạn sử dụng tài nguyên CPU, bộ nhớ và lưu trữ.
export const MAX_POLICY_PROPOSALS_PER_TENANT = 500;
export const MAX_ACTIVE_DELIBERATION_SESSIONS = 3;
export const MAX_EVIDENCE_RECORDS_PER_PROPOSAL = 50;
export const MAX_HISTORICAL_PRECEDENTS_PER_PROPOSAL = 20;
export const MAX_SIMULATION_SCENARIOS_PER_ROUND = 10;
export const MAX_SIMULATION_DEPTH = 5;
export const MAX_IMPACT_ANALYSIS_DIMENSIONS = 10;
export const MAX_DELIBERATION_DOSSIER_SIZE_BYTES = 5242880; // 5 MB
export const MAX_DELIBERATION_SESSION_DURATION_MS = 86400000; // 24 hours
export const MAX_CONCURRENT_SIMULATIONS = 3;
export const MAX_AUDIT_LOG_RECORDS_PER_SESSION = 2000;

// EN: Canonical tripartite 18-state lifecycle model for strategic policy evolution.
// VI: Mô hình vòng đời 18 trạng thái chia 3 nhóm chuẩn tắc cho tiến hóa chính sách chiến lược.
export type ActiveOperationalLifecycleStatus =
  | 'CREATED'
  | 'VALIDATING'
  | 'ADMITTED'
  | 'ANALYZING_IMPACT'
  | 'IMPACT_ANALYZED'
  | 'SIMULATING'
  | 'SIMULATION_COMPLETED'
  | 'INVARIANT_REVIEW'
  | 'DOSSIER_COMPILING'
  | 'AWAITING_HUMAN_DELIBERATION'
  | 'DELIBERATING';

export type ResolvedOutcomeLifecycleStatus =
  | 'APPROVED_FOR_PDP_HANDOFF'
  | 'REJECTED_BY_HUMAN'
  | 'EXPIRED'
  | 'SUPERSEDED';

export type TerminalFaultLifecycleStatus =
  | 'FAILED'
  | 'HALTED_BY_USER_STOP'
  | 'HALTED_BY_EMERGENCY_STOP';

export type PolicyEvolutionLifecycleStatus =
  | ActiveOperationalLifecycleStatus
  | ResolvedOutcomeLifecycleStatus
  | TerminalFaultLifecycleStatus;

export const TERMINAL_POLICY_EVOLUTION_STATES: readonly PolicyEvolutionLifecycleStatus[] = [
  'APPROVED_FOR_PDP_HANDOFF',
  'REJECTED_BY_HUMAN',
  'EXPIRED',
  'SUPERSEDED',
  'FAILED',
  'HALTED_BY_USER_STOP',
  'HALTED_BY_EMERGENCY_STOP',
] as const;

// EN: 16 canonical synchronous security checkpoints.
// VI: 16 điểm kiểm soát an ninh đồng bộ chuẩn tắc.
export type StrategicPolicySecurityCheckpoint =
  | 'PRE_ADVISORY_INGESTION'
  | 'PRE_PROPOSAL_REGISTRATION'
  | 'PRE_PROPOSAL_ADMISSION'
  | 'PRE_IMPACT_ANALYSIS'
  | 'POST_IMPACT_ANALYSIS'
  | 'PRE_COUNTERFACTUAL_SIMULATION'
  | 'POST_COUNTERFACTUAL_SIMULATION'
  | 'PRE_INVARIANT_EVALUATION'
  | 'POST_INVARIANT_EVALUATION'
  | 'PRE_DOSSIER_COMPILATION'
  | 'POST_DOSSIER_COMPILATION'
  | 'PRE_HUMAN_DELIBERATION_GATE'
  | 'PRE_HUMAN_DECISION_RECORD'
  | 'PRE_PDP_HANDOFF'
  | 'PRE_PERSISTENCE'
  | 'POST_PERSISTENCE';

// EN: 10 canonical impact dimensions for blast radius calculation.
// VI: 10 chiều tác động chuẩn tắc để tính toán bán kính ảnh hưởng.
export type PolicyImpactDimension =
  | 'FEDERATION_BLAST_RADIUS'
  | 'MISSION_SCOPE_SPREAD'
  | 'LEASE_SAFETY_MARGIN'
  | 'RESOURCE_BUDGET_VOLATILITY'
  | 'CONVERGENCE_STABILITY'
  | 'CONFLICT_RATE_PROJECTION'
  | 'REVERSIBILITY_RATING'
  | 'DEPENDENT_POLICY_COUPLING'
  | 'DRIFT_ACCELERATION_RISK'
  | 'SECURITY_PERIMETER_IMPACT';

export type PolicyDomain =
  | 'LEASE'
  | 'CONVERGENCE'
  | 'FEDERATION'
  | 'SECURITY'
  | 'RESOURCE'
  | 'AUDIT';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PolicyDelta {
  fieldPath: string;
  currentValue: unknown;
  proposedValue: unknown;
  rationale: string;
}

export interface PolicyEvolutionProposal {
  proposalId: string;
  tenantId: string;
  sessionId: string;
  missionId: string;
  sourceRecommendationId: string;
  sourceStrategicMemoryRecordIds: string[];
  policyDomain: PolicyDomain;
  proposedChanges: PolicyDelta[];
  justification: string;
  advisoryOnly: true;
  requiresHumanReview: true;
  status: PolicyEvolutionLifecycleStatus;
  version: number;
  provenanceHash: string;
  createdAt: number;
  updatedAt: number;
}

export interface AdvisoryMediationRecord {
  mediationId: string;
  tenantId: string;
  sessionId: string;
  sourceRecommendationId: string;
  sourceMemoryId: string;
  advisoryOnly: true;
  admitted: boolean;
  rejectionReason?: string;
  sanitizationApplied: boolean;
  provenanceHash: string;
  createdAt: number;
}

export interface DimensionScore {
  dimension: PolicyImpactDimension;
  score: number; // [0.0, 1.0]
  description: string;
}

export interface PolicyImpactAnalysisResult {
  analysisId: string;
  proposalId: string;
  tenantId: string;
  dimensionScores: DimensionScore[];
  compositeImpactScore: number; // [0.0, 1.0]
  reversibilityScore: number; // [0.0, 1.0]
  riskLevel: RiskLevel;
  affectedFederationIds: string[];
  affectedMissionIds: string[];
  provenanceHash: string;
  analyzedAt: number;
}

export interface CounterfactualScenario {
  scenarioId: string;
  description: string;
  simulatedAgentCount: number;
  simulatedConvergenceRounds: number;
  projectedSuccessRate: number; // [0.0, 1.0]
  projectedConflictDelta: number;
  projectedDriftDelta: number;
}

export interface CounterfactualSimulationResult {
  simulationId: string;
  proposalId: string;
  tenantId: string;
  scenarios: CounterfactualScenario[];
  recursionDepth: number;
  isHypothetical: true;
  cannotGrantAuthority: true;
  overallConvergenceFeasibility: number; // [0.0, 1.0]
  provenanceHash: string;
  simulatedAt: number;
}

export interface InvariantCheckResult {
  evaluationId: string;
  proposalId: string;
  tenantId: string;
  passed: boolean;
  evaluatedAxioms: string[];
  violations: string[];
  provenanceHash: string;
  evaluatedAt: number;
}

export interface HumanDecisionToken {
  operatorId: string;
  operatorSignature: string;
  decision: 'APPROVE' | 'REJECT';
  rationale: string;
  timestamp: number;
  twoPersonVerifierId?: string;
  twoPersonVerifierSignature?: string;
}

export interface HumanDecisionRecord {
  recordId: string;
  proposalId: string;
  dossierId: string;
  tenantId: string;
  decision: 'APPROVE' | 'REJECT';
  operatorId: string;
  operatorSignature: string;
  rationale: string;
  timestamp: number;
  verified: boolean;
  provenanceHash: string;
}

export interface PdpPolicyHandoffPackage {
  handoffId: string;
  proposalId: string;
  dossierId: string;
  tenantId: string;
  policyDomain: PolicyDomain;
  proposedChanges: PolicyDelta[];
  humanApprovalCertified: true;
  isAuthoritativePolicy: false; // PDP will evaluate authoritatively
  dossierProvenanceHash: string;
  packagedAt: number;
}

export interface HumanReviewRequirements {
  requiresExplicitSignOff: boolean;
  minimumOperatorRole: string;
  twoPersonRuleRequired: boolean;
}

export interface StrategicPolicyDeliberationDossier {
  dossierId: string;
  proposalId: string;
  tenantId: string;
  sessionId: string;
  missionId: string;
  compiledAt: number;
  proposalSummary: {
    policyDomain: PolicyDomain;
    proposedChanges: PolicyDelta[];
    justification: string;
  };
  sourceEvidence: {
    metaLearningRecommendationId: string;
    strategicMemoryRecordIds: string[];
    driftSnapshotId?: string;
  };
  impactAnalysis: PolicyImpactAnalysisResult;
  counterfactualSimulation: CounterfactualSimulationResult;
  constitutionalCompliance: InvariantCheckResult;
  riskClassification: RiskLevel;
  reversibilityScore: number;
  humanReviewRequirements: {
    requiresExplicitSignOff: true;
    minimumOperatorRole: string;
    twoPersonRuleRequired: boolean;
  };
  humanDecision?: HumanDecisionRecord;
  pdpHandoffPackage?: PdpPolicyHandoffPackage;
  version: number;
  provenanceHash: string;
}

// EN: 38 canonical structured audit event types.
// VI: 38 loại sự kiện kiểm toán có cấu trúc chuẩn tắc.
export type StrategicPolicyAuditEventType =
  | 'PROPOSAL_CREATED'
  | 'PROPOSAL_VALIDATED'
  | 'PROPOSAL_ADMITTED'
  | 'PROPOSAL_REJECTED_ADMISSION'
  | 'IMPACT_ANALYSIS_STARTED'
  | 'IMPACT_ANALYSIS_COMPLETED'
  | 'IMPACT_ANALYSIS_FAILED'
  | 'SIMULATION_STARTED'
  | 'SIMULATION_SCENARIO_EVALUATED'
  | 'SIMULATION_COMPLETED'
  | 'SIMULATION_ABORTED'
  | 'INVARIANT_CHECK_STARTED'
  | 'INVARIANT_CHECK_PASSED'
  | 'INVARIANT_CHECK_VIOLATION'
  | 'DOSSIER_COMPILATION_STARTED'
  | 'DOSSIER_COMPILED'
  | 'DOSSIER_SEALED'
  | 'DOSSIER_CORRUPTED'
  | 'DELIBERATION_SESSION_OPENED'
  | 'DELIBERATION_AWAITING_INPUT'
  | 'DELIBERATION_TIMEOUT'
  | 'HUMAN_REVIEW_SUBMITTED'
  | 'HUMAN_APPROVED'
  | 'HUMAN_REJECTED'
  | 'INVALID_DECISION_TOKEN'
  | 'PDP_HANDOFF_PACKAGED'
  | 'PDP_HANDOFF_DISPATCHED'
  | 'PDP_HANDOFF_FAILED'
  | 'USER_STOP_HALT'
  | 'EMERGENCY_STOP_HALT'
  | 'FIREWALL_MUTATION_BLOCKED'
  | 'SECURITY_VIOLATION'
  | 'OCC_CONFLICT'
  | 'PERSISTENCE_SAVED'
  | 'BACKUP_RECOVERED'
  | 'PERSISTENCE_CORRUPTION'
  | 'SANITIZATION_SCRUB'
  | 'PROPOSAL_SUPERSEDED';

export interface StrategicPolicyAuditEvent {
  eventId: string;
  eventType: StrategicPolicyAuditEventType;
  tenantId: string;
  sessionId: string;
  proposalId?: string;
  dossierId?: string;
  details: Record<string, unknown>;
  prevHash: string;
  eventHash: string;
  timestamp: number;
}

export interface DeliberationSessionState {
  sessionId: string;
  tenantId: string;
  activeProposalIds: string[];
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP';
  openedAt: number;
  closedAt?: number;
  lastActivityAt: number;
  auditRecordCount: number;
}

export interface SecurityContext {
  tenantId: string;
  sessionId: string;
  checkpoint: StrategicPolicySecurityCheckpoint;
  operatorId?: string;
  userStopSignaled?: boolean;
  emergencyStopSignaled?: boolean;
}

// EN: Typed error hierarchy for strategic policy evolution.
// VI: Cây phân cấp lỗi có kiểu cho tiến hóa chính sách chiến lược.
export class StrategicPolicyEvolutionBaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class PolicyMutationViolationError extends StrategicPolicyEvolutionBaseError {}
export class InvalidProposalLifecycleTransitionError extends StrategicPolicyEvolutionBaseError {}
export class StrategicPolicyEvolutionOCCConflictError extends StrategicPolicyEvolutionBaseError {}
export class StrategicPolicySecurityCheckpointError extends StrategicPolicyEvolutionBaseError {}
export class ConstitutionalInvariantViolationError extends StrategicPolicyEvolutionBaseError {}
export class UnauthorizedHumanDecisionError extends StrategicPolicyEvolutionBaseError {}
export class SimulationCeilingExceededError extends StrategicPolicyEvolutionBaseError {}
export class TenantIsolationViolationError extends StrategicPolicyEvolutionBaseError {}
export class StrategicPolicyPersistenceError extends StrategicPolicyEvolutionBaseError {}

// EN: Canonical serialization helper for deterministic SHA-256 hashing.
// VI: Hàm tuần tự hóa chuẩn tắc để tạo băm SHA-256 xác định.
function canonicalJsonSerialize(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonSerialize).join(',') + ']';
  }
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = keys
    .filter((k) => k !== 'provenanceHash' && k !== 'updatedAt' && k !== 'eventHash' && k !== 'pdpHandoffPackage')
    .map((k) => `${JSON.stringify(k)}:${canonicalJsonSerialize((obj as Record<string, unknown>)[k])}`);
  return '{' + pairs.join(',') + '}';
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
}

// EN: 8 deterministic SHA-256 provenance hashers.
// VI: 8 hàm băm nguồn gốc xác định SHA-256.
export function computePolicyEvolutionProposalHash(proposal: PolicyEvolutionProposal): string {
  return sha256(canonicalJsonSerialize(proposal));
}

export function computeAdvisoryMediationRecordHash(record: AdvisoryMediationRecord): string {
  return sha256(canonicalJsonSerialize(record));
}

export function computePolicyImpactAnalysisHash(analysis: PolicyImpactAnalysisResult): string {
  return sha256(canonicalJsonSerialize(analysis));
}

export function computeCounterfactualSimulationHash(simulation: CounterfactualSimulationResult): string {
  return sha256(canonicalJsonSerialize(simulation));
}

export function computeConstitutionalInvariantEvaluationHash(evalResult: InvariantCheckResult): string {
  return sha256(canonicalJsonSerialize(evalResult));
}

export function computeDeliberationDossierHash(dossier: StrategicPolicyDeliberationDossier): string {
  return sha256(canonicalJsonSerialize(dossier));
}

export function computeHumanDecisionRecordHash(decision: HumanDecisionRecord): string {
  return sha256(canonicalJsonSerialize(decision));
}

export function computeStrategicPolicyAuditHash(event: StrategicPolicyAuditEvent): string {
  return sha256(canonicalJsonSerialize(event));
}
