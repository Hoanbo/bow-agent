export declare const STRATEGIC_POLICY_EVOLUTION_INVARIANTS: {
    readonly AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: "AGENT_CAPABILITY != HUMAN_AUTHORITY";
    readonly KNOWLEDGE_NOT_AUTHORIZATION: "KNOWLEDGE != AUTHORIZATION";
    readonly CONSENSUS_NOT_AUTHORIZATION: "CONSENSUS != AUTHORIZATION";
    readonly CONFIDENCE_NOT_AUTHORITY: "CONFIDENCE != AUTHORITY";
    readonly AGREEMENT_NOT_HUMAN_APPROVAL: "AGREEMENT != HUMAN_APPROVAL";
    readonly STATE_NOT_PRIVILEGE: "STATE != PRIVILEGE";
    readonly PERSISTENCE_NOT_EXECUTION: "PERSISTENCE != EXECUTION";
    readonly COLLECTIVE_INTELLIGENCE_NOT_HUMAN_GOVERNANCE: "COLLECTIVE_INTELLIGENCE != HUMAN_GOVERNANCE";
    readonly STRATEGIC_MEMORY_NOT_EXECUTION_PERMISSION: "STRATEGIC_MEMORY != EXECUTION_PERMISSION";
    readonly LEARNED_POLICY_NOT_AUTHORIZATION: "LEARNED_POLICY != AUTHORIZATION";
    readonly MS_1518_NOT_AUTONOMY_LEASE_AUTHORITY: "MS-1.5.18 != AUTONOMY_LEASE_AUTHORITY";
    readonly MS_1518_NOT_DIRECT_EXECUTION: "MS-1.5.18 != DIRECT_EXECUTION";
    readonly MS_1519_NOT_PDP: "MS-1.5.19 != PDP";
    readonly MS_1519_NOT_AUTONOMY_LEASE_AUTHORITY: "MS-1.5.19 != AUTONOMY_LEASE_AUTHORITY";
    readonly MS_1519_NOT_DIRECT_EXECUTION: "MS-1.5.19 != DIRECT_EXECUTION";
    readonly RECOMMENDATION_NOT_POLICY: "RECOMMENDATION != POLICY";
    readonly RECOMMENDATION_NOT_AUTHORIZATION: "RECOMMENDATION != AUTHORIZATION";
    readonly DELIBERATION_NOT_APPROVAL: "DELIBERATION != APPROVAL";
    readonly APPROVED_FOR_PDP_HANDOFF_NOT_POLICY_APPROVED: "APPROVED_FOR_PDP_HANDOFF != POLICY_APPROVED";
    readonly APPROVED_FOR_PDP_HANDOFF_NOT_POLICY_MUTATION_AUTHORIZATION: "APPROVED_FOR_PDP_HANDOFF != POLICY_MUTATION_AUTHORIZATION";
    readonly APPROVED_FOR_PDP_HANDOFF_NOT_EXECUTION_AUTHORIZATION: "APPROVED_FOR_PDP_HANDOFF != EXECUTION_AUTHORIZATION";
    readonly HUMAN_DELIBERATION_NOT_POLICY_MUTATION: "HUMAN_DELIBERATION != POLICY_MUTATION";
    readonly HUMAN_APPROVAL_NOT_DIRECT_EXECUTION: "HUMAN_APPROVAL != DIRECT_EXECUTION";
    readonly SIMULATION_NOT_EXECUTION: "SIMULATION != EXECUTION";
    readonly SIMULATION_RESULT_NOT_AUTHORIZATION: "SIMULATION_RESULT != AUTHORIZATION";
    readonly SIMULATION_RESULT_NOT_EXECUTION: "SIMULATION_RESULT != EXECUTION";
    readonly ADVISORY_RESULT_NOT_AUTHORIZATION: "ADVISORY_RESULT != AUTHORIZATION";
    readonly HASH_NOT_AUTHORIZATION: "HASH != AUTHORIZATION";
    readonly LEASE_SUPERVISION_NOT_LEASE_EXPANSION: "LEASE_SUPERVISION != LEASE_EXPANSION";
};
export declare const GOVERNED_STRATEGIC_POLICY_EVOLUTION_INVARIANTS: {
    readonly AGENT_CAPABILITY_NOT_HUMAN_AUTHORITY: "AGENT_CAPABILITY != HUMAN_AUTHORITY";
    readonly KNOWLEDGE_NOT_AUTHORIZATION: "KNOWLEDGE != AUTHORIZATION";
    readonly CONSENSUS_NOT_AUTHORIZATION: "CONSENSUS != AUTHORIZATION";
    readonly CONFIDENCE_NOT_AUTHORITY: "CONFIDENCE != AUTHORITY";
    readonly AGREEMENT_NOT_HUMAN_APPROVAL: "AGREEMENT != HUMAN_APPROVAL";
    readonly STATE_NOT_PRIVILEGE: "STATE != PRIVILEGE";
    readonly PERSISTENCE_NOT_EXECUTION: "PERSISTENCE != EXECUTION";
    readonly COLLECTIVE_INTELLIGENCE_NOT_HUMAN_GOVERNANCE: "COLLECTIVE_INTELLIGENCE != HUMAN_GOVERNANCE";
    readonly STRATEGIC_MEMORY_NOT_EXECUTION_PERMISSION: "STRATEGIC_MEMORY != EXECUTION_PERMISSION";
    readonly LEARNED_POLICY_NOT_AUTHORIZATION: "LEARNED_POLICY != AUTHORIZATION";
    readonly MS_1518_NOT_AUTONOMY_LEASE_AUTHORITY: "MS-1.5.18 != AUTONOMY_LEASE_AUTHORITY";
    readonly MS_1518_NOT_DIRECT_EXECUTION: "MS-1.5.18 != DIRECT_EXECUTION";
    readonly MS_1519_NOT_PDP: "MS-1.5.19 != PDP";
    readonly MS_1519_NOT_AUTONOMY_LEASE_AUTHORITY: "MS-1.5.19 != AUTONOMY_LEASE_AUTHORITY";
    readonly MS_1519_NOT_DIRECT_EXECUTION: "MS-1.5.19 != DIRECT_EXECUTION";
    readonly RECOMMENDATION_NOT_POLICY: "RECOMMENDATION != POLICY";
    readonly RECOMMENDATION_NOT_AUTHORIZATION: "RECOMMENDATION != AUTHORIZATION";
    readonly DELIBERATION_NOT_APPROVAL: "DELIBERATION != APPROVAL";
    readonly APPROVED_FOR_PDP_HANDOFF_NOT_POLICY_APPROVED: "APPROVED_FOR_PDP_HANDOFF != POLICY_APPROVED";
    readonly APPROVED_FOR_PDP_HANDOFF_NOT_POLICY_MUTATION_AUTHORIZATION: "APPROVED_FOR_PDP_HANDOFF != POLICY_MUTATION_AUTHORIZATION";
    readonly APPROVED_FOR_PDP_HANDOFF_NOT_EXECUTION_AUTHORIZATION: "APPROVED_FOR_PDP_HANDOFF != EXECUTION_AUTHORIZATION";
    readonly HUMAN_DELIBERATION_NOT_POLICY_MUTATION: "HUMAN_DELIBERATION != POLICY_MUTATION";
    readonly HUMAN_APPROVAL_NOT_DIRECT_EXECUTION: "HUMAN_APPROVAL != DIRECT_EXECUTION";
    readonly SIMULATION_NOT_EXECUTION: "SIMULATION != EXECUTION";
    readonly SIMULATION_RESULT_NOT_AUTHORIZATION: "SIMULATION_RESULT != AUTHORIZATION";
    readonly SIMULATION_RESULT_NOT_EXECUTION: "SIMULATION_RESULT != EXECUTION";
    readonly ADVISORY_RESULT_NOT_AUTHORIZATION: "ADVISORY_RESULT != AUTHORIZATION";
    readonly HASH_NOT_AUTHORIZATION: "HASH != AUTHORIZATION";
    readonly LEASE_SUPERVISION_NOT_LEASE_EXPANSION: "LEASE_SUPERVISION != LEASE_EXPANSION";
};
export declare const MAX_POLICY_PROPOSALS_PER_TENANT = 500;
export declare const MAX_ACTIVE_DELIBERATION_SESSIONS = 3;
export declare const MAX_EVIDENCE_RECORDS_PER_PROPOSAL = 50;
export declare const MAX_HISTORICAL_PRECEDENTS_PER_PROPOSAL = 20;
export declare const MAX_SIMULATION_SCENARIOS_PER_ROUND = 10;
export declare const MAX_SIMULATION_DEPTH = 5;
export declare const MAX_IMPACT_ANALYSIS_DIMENSIONS = 10;
export declare const MAX_DELIBERATION_DOSSIER_SIZE_BYTES = 5242880;
export declare const MAX_DELIBERATION_SESSION_DURATION_MS = 86400000;
export declare const MAX_CONCURRENT_SIMULATIONS = 3;
export declare const MAX_AUDIT_LOG_RECORDS_PER_SESSION = 2000;
export type ActiveOperationalLifecycleStatus = 'CREATED' | 'VALIDATING' | 'ADMITTED' | 'ANALYZING_IMPACT' | 'IMPACT_ANALYZED' | 'SIMULATING' | 'SIMULATION_COMPLETED' | 'INVARIANT_REVIEW' | 'DOSSIER_COMPILING' | 'AWAITING_HUMAN_DELIBERATION' | 'DELIBERATING';
export type ResolvedOutcomeLifecycleStatus = 'APPROVED_FOR_PDP_HANDOFF' | 'REJECTED_BY_HUMAN' | 'EXPIRED' | 'SUPERSEDED';
export type TerminalFaultLifecycleStatus = 'FAILED' | 'HALTED_BY_USER_STOP' | 'HALTED_BY_EMERGENCY_STOP';
export type PolicyEvolutionLifecycleStatus = ActiveOperationalLifecycleStatus | ResolvedOutcomeLifecycleStatus | TerminalFaultLifecycleStatus;
export declare const TERMINAL_POLICY_EVOLUTION_STATES: readonly PolicyEvolutionLifecycleStatus[];
export type StrategicPolicySecurityCheckpoint = 'PRE_ADVISORY_INGESTION' | 'PRE_PROPOSAL_REGISTRATION' | 'PRE_PROPOSAL_ADMISSION' | 'PRE_IMPACT_ANALYSIS' | 'POST_IMPACT_ANALYSIS' | 'PRE_COUNTERFACTUAL_SIMULATION' | 'POST_COUNTERFACTUAL_SIMULATION' | 'PRE_INVARIANT_EVALUATION' | 'POST_INVARIANT_EVALUATION' | 'PRE_DOSSIER_COMPILATION' | 'POST_DOSSIER_COMPILATION' | 'PRE_HUMAN_DELIBERATION_GATE' | 'PRE_HUMAN_DECISION_RECORD' | 'PRE_PDP_HANDOFF' | 'PRE_PERSISTENCE' | 'POST_PERSISTENCE';
export type PolicyImpactDimension = 'FEDERATION_BLAST_RADIUS' | 'MISSION_SCOPE_SPREAD' | 'LEASE_SAFETY_MARGIN' | 'RESOURCE_BUDGET_VOLATILITY' | 'CONVERGENCE_STABILITY' | 'CONFLICT_RATE_PROJECTION' | 'REVERSIBILITY_RATING' | 'DEPENDENT_POLICY_COUPLING' | 'DRIFT_ACCELERATION_RISK' | 'SECURITY_PERIMETER_IMPACT';
export type PolicyDomain = 'LEASE' | 'CONVERGENCE' | 'FEDERATION' | 'SECURITY' | 'RESOURCE' | 'AUDIT';
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
    score: number;
    description: string;
}
export interface PolicyImpactAnalysisResult {
    analysisId: string;
    proposalId: string;
    tenantId: string;
    dimensionScores: DimensionScore[];
    compositeImpactScore: number;
    reversibilityScore: number;
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
    projectedSuccessRate: number;
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
    overallConvergenceFeasibility: number;
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
    tokenId: string;
    proposalId: string;
    dossierId: string;
    policyDomain: PolicyDomain;
    operatorId: string;
    operatorSignature: string;
    decision: 'APPROVE' | 'REJECT';
    rationale: string;
    nonce: string;
    timestamp: number;
    expiresAt: number;
    keyId: string;
    policyDeltaHash: string;
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
    isAuthoritativePolicy: false;
    dossierProvenanceHash: string;
    policyDeltaHash: string;
    packagedAt: number;
}
export interface HumanReviewRequirements {
    requiresExplicitSignOff: boolean;
    minimumOperatorRole: string;
    elevatedSingleHumanAffirmationRequired: boolean;
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
        elevatedSingleHumanAffirmationRequired: boolean;
    };
    humanDecision?: HumanDecisionRecord;
    pdpHandoffPackage?: PdpPolicyHandoffPackage;
    version: number;
    provenanceHash: string;
    policyDeltaHash: string;
}
export type StrategicPolicyAuditEventType = 'PROPOSAL_CREATED' | 'PROPOSAL_VALIDATED' | 'PROPOSAL_ADMITTED' | 'PROPOSAL_REJECTED_ADMISSION' | 'IMPACT_ANALYSIS_STARTED' | 'IMPACT_ANALYSIS_COMPLETED' | 'IMPACT_ANALYSIS_FAILED' | 'SIMULATION_STARTED' | 'SIMULATION_SCENARIO_EVALUATED' | 'SIMULATION_COMPLETED' | 'SIMULATION_ABORTED' | 'INVARIANT_CHECK_STARTED' | 'INVARIANT_CHECK_PASSED' | 'INVARIANT_CHECK_VIOLATION' | 'DOSSIER_COMPILATION_STARTED' | 'DOSSIER_COMPILED' | 'DOSSIER_SEALED' | 'DOSSIER_CORRUPTED' | 'DELIBERATION_SESSION_OPENED' | 'DELIBERATION_AWAITING_INPUT' | 'DELIBERATION_TIMEOUT' | 'HUMAN_REVIEW_SUBMITTED' | 'HUMAN_APPROVED' | 'HUMAN_REJECTED' | 'INVALID_DECISION_TOKEN' | 'PDP_HANDOFF_PACKAGED' | 'PDP_HANDOFF_DISPATCHED' | 'PDP_HANDOFF_FAILED' | 'USER_STOP_HALT' | 'EMERGENCY_STOP_HALT' | 'FIREWALL_MUTATION_BLOCKED' | 'SECURITY_VIOLATION' | 'OCC_CONFLICT' | 'PERSISTENCE_SAVED' | 'BACKUP_RECOVERED' | 'PERSISTENCE_CORRUPTION' | 'SANITIZATION_SCRUB' | 'PROPOSAL_SUPERSEDED';
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
export declare class StrategicPolicyEvolutionBaseError extends Error {
    constructor(message: string);
}
export declare class PolicyMutationViolationError extends StrategicPolicyEvolutionBaseError {
}
export declare class InvalidProposalLifecycleTransitionError extends StrategicPolicyEvolutionBaseError {
}
export declare class StrategicPolicyEvolutionOCCConflictError extends StrategicPolicyEvolutionBaseError {
}
export declare class StrategicPolicySecurityCheckpointError extends StrategicPolicyEvolutionBaseError {
}
export declare class ConstitutionalInvariantViolationError extends StrategicPolicyEvolutionBaseError {
}
export declare class UnauthorizedHumanDecisionError extends StrategicPolicyEvolutionBaseError {
}
export declare class SimulationCeilingExceededError extends StrategicPolicyEvolutionBaseError {
}
export declare class TenantIsolationViolationError extends StrategicPolicyEvolutionBaseError {
}
export declare class StrategicPolicyPersistenceError extends StrategicPolicyEvolutionBaseError {
}
/** Canonical UTF-8 commitment for policy deltas. */
export declare function canonicalPolicyDeltaArray(deltas: PolicyDelta[]): string;
export declare function computePolicyDeltaHash(deltas: PolicyDelta[]): string;
export declare function computePolicyEvolutionProposalHash(proposal: PolicyEvolutionProposal): string;
export declare function computeAdvisoryMediationRecordHash(record: AdvisoryMediationRecord): string;
export declare function computePolicyImpactAnalysisHash(analysis: PolicyImpactAnalysisResult): string;
export declare function computeCounterfactualSimulationHash(simulation: CounterfactualSimulationResult): string;
export declare function computeConstitutionalInvariantEvaluationHash(evalResult: InvariantCheckResult): string;
export declare function computeDeliberationDossierHash(dossier: StrategicPolicyDeliberationDossier): string;
export declare function computeHumanDecisionRecordHash(decision: HumanDecisionRecord): string;
export declare function computeStrategicPolicyAuditHash(event: StrategicPolicyAuditEvent): string;
