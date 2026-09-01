export type AgentAnalyticsEventType = 'SESSION_STARTED' | 'MESSAGE_RECEIVED' | 'INTENT_RESOLVED' | 'INTENT_UNRESOLVED' | 'PRODUCT_RESOLVED' | 'PRODUCT_UNRESOLVED' | 'PLAN_RESOLVED' | 'PLAN_UNRESOLVED' | 'CLARIFICATION_REQUESTED' | 'ACTION_SHOWN' | 'ACTION_CLICKED' | 'ACTION_EXPIRED' | 'ACTION_REJECTED' | 'CHECKOUT_OPENED' | 'CHECKOUT_SUCCESS' | 'CHECKOUT_CANCELLED' | 'ORDER_VIEWED' | 'RENEWAL_OPENED' | 'WARRANTY_OPENED' | 'COUPON_APPLIED' | 'DEPOSIT_OPENED' | 'SESSION_RESET' | 'DEMAND_DISCOVERED' | 'DEMAND_MATCHED' | 'GEMINI_REQUEST' | 'GEMINI_RESPONSE' | 'TOOL_CALL' | 'TOOL_RESULT' | 'GEMINI_FALLBACK' | 'KNOWLEDGE_GAP_DETECTED' | 'OBSERVABILITY_RECORDED' | 'KNOWLEDGE_GAP_REVIEWED' | 'KNOWLEDGE_GAP_REJECTED' | 'KNOWLEDGE_GAP_MERGED' | 'KNOWLEDGE_GAP_APPROVED' | 'FAQ_CREATED_FROM_KNOWLEDGE_GAP' | 'FAQ_USED' | 'FAQ_EDITED' | 'FAQ_VERSION_CREATED' | 'NEGATIVE_POLICY_CREATED' | 'NEGATIVE_POLICY_UPDATED' | 'NEGATIVE_POLICY_ACTIVATED' | 'NEGATIVE_POLICY_DEACTIVATED' | 'NEGATIVE_POLICY_MATCHED' | 'KNOWLEDGE_ACTION_CREATED' | 'KNOWLEDGE_ACTION_ACKNOWLEDGED' | 'KNOWLEDGE_ACTION_STARTED' | 'KNOWLEDGE_ACTION_COMPLETED' | 'KNOWLEDGE_ACTION_DISMISSED' | 'KNOWLEDGE_ACTION_SNOOZED' | 'KNOWLEDGE_ACTION_OUTCOME_RECORDED' | 'KNOWLEDGE_REGRESSION_DETECTED' | 'KNOWLEDGE_IMPROVEMENT_DETECTED' | 'KNOWLEDGE_DRIFT_DETECTED' | 'KNOWLEDGE_DRIFT_RESOLVED' | 'KNOWLEDGE_ANOMALY_DETECTED' | 'KNOWLEDGE_QA_STARTED' | 'KNOWLEDGE_QA_COMPLETED' | 'KNOWLEDGE_QA_FAILED' | 'KNOWLEDGE_REGRESSION_RESOLVED' | 'KNOWLEDGE_GOVERNANCE_SNAPSHOT' | 'KNOWLEDGE_HEALTH_ALERT' | 'PRODUCTION_REQUEST' | 'PRODUCTION_ERROR' | 'PRODUCTION_SLO_BREACH' | 'PRODUCTION_INCIDENT_DETECTED' | 'PRODUCTION_INCIDENT_ACKNOWLEDGED' | 'PRODUCTION_INCIDENT_RESOLVED' | 'PRODUCTION_ROLLOUT_CHANGED' | 'PRODUCTION_ROLLBACK' | 'PRODUCTION_CIRCUIT_OPEN' | 'PRODUCTION_CIRCUIT_HALF_OPEN' | 'PRODUCTION_CIRCUIT_CLOSED' | 'PRODUCTION_CAPACITY_WARNING' | 'PRODUCTION_CAPACITY_OVERLOAD' | 'PRODUCTION_HEALTH_SNAPSHOT';
export type DemandState = 'SUPPORTED' | 'NEAR_MATCH' | 'UNSUPPORTED' | 'AMBIGUOUS';
export type KnowledgePriority = 'HIGH' | 'MEDIUM' | 'LOW';
export type FaqStaleStatus = 'CURRENT' | 'NEEDS_REVIEW' | 'STALE';
export type PolicyScopeType = 'GLOBAL' | 'PRODUCT' | 'APP' | 'SERVICE' | 'TOPIC';
export type PolicyStatus = 'ACTIVE' | 'INACTIVE' | 'STALE' | 'EXPIRED';
export interface NegativePolicy {
    id: string;
    policyKey: string;
    scopeType: PolicyScopeType;
    scopeValue: string;
    questionPattern: string;
    normalizedQuestion: string;
    answer: string;
    reason?: string;
    status: PolicyStatus;
    createdBy?: string | null;
    createdAt: string;
    updatedAt: string;
    usageCount?: number;
    lastUsedAt?: string | null;
}
export interface FaqQualityMetrics {
    faqId: string;
    question: string;
    answer?: string;
    category: string;
    usageCount: number;
    lastUsedAt?: string | null;
    qualityScore: number;
    staleStatus: FaqStaleStatus;
    staleReason?: string;
    similarGapCount: number;
}
export interface FaqEditHistoryItem {
    id: string;
    faqId: string;
    adminUserId?: string | null;
    before: {
        question: string;
        answer: string;
    };
    after: {
        question: string;
        answer: string;
    };
    reason?: string;
    timestamp: string;
}
export type ResponseSource = 'FAQ' | 'NEGATIVE_POLICY' | 'DETERMINISTIC' | 'GEMINI' | 'GEMINI_FALLBACK_V2' | 'KNOWLEDGE' | 'UNKNOWN';
export type KnowledgeGapClassification = 'KNOWLEDGE_GAP' | 'PRODUCT_DEMAND' | 'TRANSACTIONAL' | 'GREETING' | 'SUPPORTED_FAQ' | 'SUPPORTED_NEGATIVE_POLICY' | 'UNSUPPORTED' | 'SECURITY_SENSITIVE';
export interface NormalizedDemandMetadata {
    rawQuery: string;
    normalizedCapability: string;
    domainCategory: 'video' | 'audio' | 'image' | 'design' | 'coding' | 'productivity' | 'education' | 'entertainment' | 'other';
    demandState: DemandState;
    matchedCount: number;
    confidence?: number;
    constraints?: string[];
    candidateNames?: string[];
}
export interface KnowledgeGapMetadata {
    originalQuestion: string;
    normalizedQuestion: string;
    category: 'policy' | 'technical' | 'support' | 'troubleshooting' | 'general' | 'other';
    classification: KnowledgeGapClassification;
    confidence: number;
    source: ResponseSource;
    suggestedAction?: string;
    contextIntent?: string;
}
export interface AgentObservabilityMetadata {
    intent: string;
    responseSource: ResponseSource;
    latencyMs: number;
    geminiUsed: boolean;
    geminiFallback: boolean;
    faqHit: boolean;
    isKnowledgeGap: boolean;
    isProductDemand: boolean;
    isTransactional: boolean;
    isSafe: boolean;
    candidateCount?: number;
    actionCount?: number;
}
export interface AgentAnalyticsEvent {
    eventType: AgentAnalyticsEventType;
    userId?: string | null;
    sessionId?: string | null;
    intent?: string | null;
    productId?: string | null;
    planId?: string | null;
    actionId?: string | null;
    actionType?: string | null;
    reason?: string | null;
    metadata?: (Record<string, unknown> & Partial<NormalizedDemandMetadata> & Partial<KnowledgeGapMetadata> & Partial<AgentObservabilityMetadata>) | Record<string, unknown>;
    createdAt?: string;
}
export type FaqHealthGrade = 'EXCELLENT' | 'HEALTHY' | 'NEEDS_REVIEW' | 'DEGRADED' | 'CRITICAL';
export interface FaqHealthDetail {
    faqId: string;
    question: string;
    healthScore: number;
    grade: FaqHealthGrade;
    usageCount: number;
    matchSuccessRate: number;
    unresolvedVariantsCount: number;
    ageInDays: number;
    lastUsedAt?: string;
    versionCount: number;
    conflictCount: number;
    healthReasons: string[];
}
export type KnowledgeDomain = 'PRODUCT' | 'PAYMENT' | 'WALLET' | 'WARRANTY' | 'ACCOUNT' | 'ACTIVATION' | 'INSTALLATION' | 'SUPPORT' | 'GENERAL' | 'NEGATIVE_POLICY';
export interface DomainCoverageDetail {
    domain: KnowledgeDomain;
    coveragePercentage: number;
    totalQueries: number;
    resolvedQueries: number;
    gapCount: number;
    status: 'EXCELLENT' | 'GOOD' | 'NEEDS_ATTENTION' | 'POOR';
    topMissingTopic?: string;
}
export interface DomainCoverageReport {
    overallCoveragePercentage: number;
    domainCoverages: DomainCoverageDetail[];
    totalQueriesAnalyzed: number;
    generatedAt: string;
}
export interface QueryCluster {
    id: string;
    canonicalTopic: string;
    targetDomain: KnowledgeDomain;
    intent: string;
    occurrenceCount: number;
    uniqueVariants: string[];
    uniqueUserCount: number;
    firstSeenAt: string;
    lastSeenAt: string;
    suggestedAction?: 'CREATE_FAQ' | 'CREATE_NEGATIVE_POLICY' | 'EXPAND_EXISTING_FAQ' | 'MONITOR';
    matchingFaqId?: string;
    matchingPolicyId?: string;
}
export type EmergingTopicClassification = 'PRODUCT_DEMAND' | 'TRANSACTIONAL' | 'KNOWLEDGE_GAP' | 'SUPPORTED_FAQ' | 'SUPPORTED_NEGATIVE_POLICY' | 'SECURITY_SENSITIVE';
export interface EmergingTopic {
    id: string;
    topicName: string;
    classification: EmergingTopicClassification;
    queryCount: number;
    uniqueUsers: number;
    growthRatePercentage: number;
    firstSeenAt: string;
    lastSeenAt: string;
    sampleQueries: string[];
    recommendation: string;
}
export interface NegativePolicyIntelligenceItem {
    policyId: string;
    policyKey: string;
    scopeType: PolicyScopeType;
    scopeValue: string;
    status: PolicyStatus;
    matchesCount: number;
    preventedGapsCount: number;
    uniqueUsers: number;
    lastUsedAt?: string;
    effectivenessGrade: 'HIGH' | 'MODERATE' | 'LOW' | 'UNUSED';
    conflictCount: number;
    recommendation?: string;
}
export type ConflictSeverity = 'HIGH' | 'MEDIUM' | 'LOW';
export interface KnowledgeConflictItem {
    id: string;
    conflictType: 'FAQ_VS_FAQ' | 'FAQ_VS_NEGATIVE_POLICY' | 'NEGATIVE_POLICY_VS_NEGATIVE_POLICY';
    entityA: {
        id: string;
        title: string;
        type: 'FAQ' | 'NEGATIVE_POLICY';
    };
    entityB: {
        id: string;
        title: string;
        type: 'FAQ' | 'NEGATIVE_POLICY';
    };
    similarityPercentage: number;
    severity: ConflictSeverity;
    conflictDescription: string;
    recommendedResolution: string;
    detectedAt: string;
}
export type RecommendationType = 'REVIEW_FAQ' | 'UPDATE_FAQ' | 'REVIEW_NEGATIVE_POLICY' | 'INVESTIGATE_EMERGING_TOPIC' | 'RESOLVE_CONFLICT' | 'IMPROVE_COVERAGE' | 'CHECK_REGRESSION' | 'RETIRE_STALE_KNOWLEDGE';
export type RecommendationPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export interface AdminRecommendation {
    id: string;
    type: RecommendationType;
    priority: RecommendationPriority;
    title: string;
    reason: string;
    evidence: string;
    affectedEntityId?: string;
    affectedEntityType?: 'FAQ' | 'NEGATIVE_POLICY' | 'DOMAIN' | 'CLUSTER';
    actionPrompt: string;
    createdAt: string;
    status: 'OPEN' | 'DISMISSED' | 'RESOLVED';
}
export interface KnowledgeRegressionDetail {
    faqId: string;
    question: string;
    beforeSupportedVariants: number;
    afterSupportedVariants: number;
    coverageDropPercentage: number;
    isRegression: boolean;
    regressedQueries: string[];
}
export interface KnowledgeRegressionReport {
    regressionsDetected: number;
    details: KnowledgeRegressionDetail[];
    analyzedAt: string;
}
export interface IntelligenceDashboardSummary {
    overallHealthScore: number;
    overallCoveragePercentage: number;
    activePoliciesCount: number;
    emergingTopicsCount: number;
    activeConflictsCount: number;
    openRecommendationsCount: number;
    faqHealthList: FaqHealthDetail[];
    coverageReport: DomainCoverageReport;
    topQueryClusters: QueryCluster[];
    emergingTopics: EmergingTopic[];
    negativePolicyIntelligence: NegativePolicyIntelligenceItem[];
    conflicts: KnowledgeConflictItem[];
    recommendations: AdminRecommendation[];
    regressionReport: KnowledgeRegressionReport;
    lastUpdated: string;
}
export type KnowledgeActionType = 'REVIEW_FAQ' | 'EDIT_FAQ' | 'MERGE_FAQ' | 'DEPRECATE_FAQ' | 'RESTORE_FAQ' | 'REVIEW_GAP' | 'APPROVE_GAP' | 'REJECT_GAP' | 'REJECT_AND_REMEMBER' | 'MERGE_GAP' | 'REVIEW_POLICY' | 'EDIT_POLICY' | 'DEACTIVATE_POLICY' | 'REACTIVATE_POLICY' | 'REVIEW_CONFLICT' | 'RESOLVE_CONFLICT' | 'DISMISS_CONFLICT' | 'REVIEW_DOMAIN' | 'CREATE_KNOWLEDGE_PLAN';
export type KnowledgeActionStatus = 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED' | 'SNOOZED' | 'BLOCKED';
export type EstimatedImpact = 'LOW' | 'MEDIUM' | 'HIGH';
export type ActionEffectiveness = 'EXCELLENT' | 'EFFECTIVE' | 'NEUTRAL' | 'INEFFECTIVE' | 'REGRESSED' | 'INSUFFICIENT_DATA';
export type OutcomeFeedbackType = 'ACTION_SUCCESS' | 'ACTION_FAILED' | 'ACTION_NO_IMPACT' | 'ACTION_IMPROVED' | 'ACTION_REGRESSED';
export type ObservationWindow = '24H' | '3D' | '7D' | '14D' | '30D';
export interface BeforeAfterSnapshot {
    matchRateBefore?: number;
    matchRateAfter?: number;
    usageCountBefore?: number;
    usageCountAfter?: number;
    gapCountBefore?: number;
    gapCountAfter?: number;
    healthScoreBefore?: number;
    healthScoreAfter?: number;
    conflictCountBefore?: number;
    conflictCountAfter?: number;
    coverageBefore?: number;
    coverageAfter?: number;
    variantCountBefore?: number;
    variantCountAfter?: number;
    capturedAt: string;
}
export interface ActionOutcome {
    effectiveness: ActionEffectiveness;
    feedbackType: OutcomeFeedbackType;
    matchRateDelta?: number;
    usageDelta?: number;
    gapReduction?: number;
    gapCountDelta?: number;
    conflictReduction?: number;
    healthScoreDelta?: number;
    coverageDelta?: number;
    variantDelta?: number;
    feedbackReason?: string;
    observationWindow: ObservationWindow;
    measuredAt: string;
    isInsufficientData: boolean;
}
export interface KnowledgeAction {
    id: string;
    type: KnowledgeActionType;
    recommendationId?: string;
    priority: RecommendationPriority;
    title: string;
    reason: string;
    evidence: string;
    suggestedAction: string;
    affectedEntityId?: string;
    affectedEntityType?: 'FAQ' | 'NEGATIVE_POLICY' | 'DOMAIN' | 'CLUSTER' | 'GAP' | 'CONFLICT';
    estimatedImpact: EstimatedImpact;
    risk: 'LOW' | 'MEDIUM' | 'HIGH';
    status: KnowledgeActionStatus;
    decisionFingerprint: string;
    createdAt: string;
    updatedAt: string;
    acknowledgedAt?: string;
    startedAt?: string;
    completedAt?: string;
    dismissedAt?: string;
    dismissedBy?: string;
    dismissReason?: string;
    snoozedUntil?: string;
    snoozeReason?: string;
    adminUserId?: string;
    beforeSnapshot?: BeforeAfterSnapshot;
    afterSnapshot?: BeforeAfterSnapshot;
    outcome?: ActionOutcome;
    improvementScore?: number;
}
export interface KnowledgeImprovementScore {
    score: number;
    components: {
        healthImprovement: number;
        matchImprovement: number;
        gapReduction: number;
        conflictReduction: number;
        coverageImprovement: number;
    };
    trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
    computedAt: string;
}
export interface ActionCenterSummary {
    openCount: number;
    acknowledgedCount: number;
    inProgressCount: number;
    completedCount: number;
    dismissedCount: number;
    snoozedCount: number;
    blockedCount: number;
    regressionsDetected: number;
    successfulImprovements: number;
    actions: KnowledgeAction[];
    improvementScore: KnowledgeImprovementScore;
    lastUpdated: string;
}
export type DriftSeverity = 'NONE' | 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
export type DriftStatus = 'STABLE' | 'WATCH' | 'DEGRADED' | 'CRITICAL';
export interface FaqDriftDetail {
    faqId: string;
    question: string;
    matchRateDrop: number;
    usageDrop: number;
    unmatchedVariantsCount: number;
    ageInDays: number;
    driftSeverity: DriftSeverity;
    reasons: string[];
}
export interface NegativePolicyDriftDetail {
    policyId: string;
    policyKey: string;
    matchRateDrop: number;
    falseInterceptCount: number;
    scopeDrift: 'TOO_BROAD' | 'TOO_NARROW' | 'STABLE';
    driftSeverity: DriftSeverity;
    reasons: string[];
}
export interface QueryDriftDetail {
    clusterId: string;
    canonicalTopic: string;
    volumeChangePercentage: number;
    intentShiftDetected: boolean;
    driftSeverity: DriftSeverity;
}
export interface CoverageDriftDetail {
    domain: KnowledgeDomain;
    coverageDropPercentage: number;
    gapIncreaseCount: number;
    driftSeverity: DriftSeverity;
}
export interface KnowledgeDriftReport {
    overallDriftScore: number;
    driftStatus: DriftStatus;
    faqDrifts: FaqDriftDetail[];
    policyDrifts: NegativePolicyDriftDetail[];
    queryDrifts: QueryDriftDetail[];
    coverageDrifts: CoverageDriftDetail[];
    analyzedAt: string;
}
export type QaTestStatus = 'PASS' | 'WARN' | 'FAIL' | 'BLOCKED';
export interface KnowledgeQaTestResult {
    testId: string;
    category: string;
    status: QaTestStatus;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    evidence: string;
    expected: string;
    actual: string;
    timestamp: string;
}
export interface KnowledgeQaSuiteResult {
    totalTests: number;
    passedCount: number;
    warningCount: number;
    failedCount: number;
    blockedCount: number;
    passRate: number;
    testResults: KnowledgeQaTestResult[];
    executionDurationMs: number;
    evaluatedAt: string;
}
export interface GoldenQueryTestCase {
    id: string;
    query: string;
    expectedRoute: 'TRANSACTIONAL' | 'PRODUCT_DEMAND' | 'WARRANTY' | 'SUPPORTED_NEGATIVE_POLICY' | 'SUPPORTED_FAQ' | 'KNOWLEDGE_GAP';
    expectedIntent?: string;
    expectedPlanDuration?: string;
    expectedPrice?: number;
    category: string;
    description: string;
}
export interface GoldenQueryResult {
    caseId: string;
    query: string;
    pass: boolean;
    expected: string;
    actual: string;
    latencyMs: number;
}
export type AnomalyType = 'GAP_SPIKE' | 'CONFLICT_SPIKE' | 'MATCH_RATE_DROP' | 'TRAFFIC_SURGE' | 'ROUTING_ANOMALY' | 'POLICY_SPIKE';
export interface KnowledgeAnomalyItem {
    id: string;
    type: AnomalyType;
    magnitude: number;
    baselineValue: number;
    currentValue: number;
    confidence: number;
    severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
    description: string;
    detectedAt: string;
}
export interface KnowledgeAnomalyReport {
    anomalies: KnowledgeAnomalyItem[];
    totalAnomalies: number;
    highSeverityCount: number;
    evaluatedAt: string;
    isInsufficientData: boolean;
}
export type AlertSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'SNOOZED' | 'RESOLVED';
export interface KnowledgeAlert {
    id: string;
    fingerprint: string;
    title: string;
    severity: AlertSeverity;
    status: AlertStatus;
    reason: string;
    evidence: string;
    entityId?: string;
    entityType?: string;
    createdAt: string;
    acknowledgedAt?: string;
    acknowledgedBy?: string;
    snoozedUntil?: string;
    resolvedAt?: string;
    resolvedBy?: string;
}
export interface AlertCenterSummary {
    totalAlerts: number;
    openCount: number;
    criticalCount: number;
    highCount: number;
    warningCount: number;
    infoCount: number;
    alerts: KnowledgeAlert[];
}
export type KnowledgeGovernanceHealthStatus = 'EXCELLENT' | 'HEALTHY' | 'WATCH' | 'DEGRADED' | 'CRITICAL';
export interface KnowledgeGovernanceScore {
    score: number;
    components: {
        knowledgeIntegrity: number;
        faqHealth: number;
        coverage: number;
        regressionSafety: number;
        driftStability: number;
        qaPassRate: number;
        conflictHealth: number;
        negativePolicyHealth: number;
        actionResolution: number;
    };
    isCapped: boolean;
    capReason?: string;
    computedAt: string;
}
export interface LatencyPercentiles {
    p50: number;
    p95: number;
    p99: number;
    isInsufficientData: boolean;
}
export interface SlaSloMetrics {
    resolutionLatency: LatencyPercentiles;
    faqLookupLatency: LatencyPercentiles;
    negativePolicyLookupLatency: LatencyPercentiles;
    overallStatus: 'MEETING_SLA' | 'AT_RISK' | 'BREACHED' | 'INSUFFICIENT_DATA';
    evaluatedAt: string;
}
export interface GovernanceDashboardSummary {
    governanceScore: KnowledgeGovernanceScore;
    overallHealth: KnowledgeGovernanceHealthStatus;
    driftReport: KnowledgeDriftReport;
    qaSuiteResult: KnowledgeQaSuiteResult;
    anomalyReport: KnowledgeAnomalyReport;
    alertSummary: AlertCenterSummary;
    slaMetrics: SlaSloMetrics;
    regressionsCount: number;
    activePoliciesCount: number;
    totalFaqsCount: number;
    lastUpdated: string;
}
export type ProductionRolloutStage = 'OFF' | 'CANARY' | '10' | '25' | '50' | '75' | '100';
export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';
export type CapacityStatus = 'NORMAL' | 'BUSY' | 'HIGH_LOAD' | 'OVERLOAD';
export type IncidentSeverity = 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
export type IncidentType = 'TRAFFIC_SPIKE' | 'ERROR_SPIKE' | 'LATENCY_SPIKE' | 'FALLBACK_SPIKE' | 'KNOWLEDGE_REGRESSION' | 'TRANSACTION_BOUNDARY_BREACH' | 'DURATION_REGRESSION' | 'WARRANTY_REGRESSION' | 'PRODUCT_DEMAND_REGRESSION' | 'NEGATIVE_POLICY_LOOP' | 'PII_LEAK' | 'UNAUTHORIZED_MUTATION' | 'CIRCUIT_BREAKER_OPEN' | 'CAPACITY_OVERLOAD';
export type IncidentStatus = 'DETECTED' | 'ACKNOWLEDGED' | 'INVESTIGATING' | 'MITIGATED' | 'RESOLVED' | 'DISMISSED';
export interface ProductionIncident {
    id: string;
    title: string;
    severity: IncidentSeverity;
    type: IncidentType;
    status: IncidentStatus;
    affectedComponent: string;
    firstDetected: string;
    lastDetected: string;
    evidence: string;
    fingerprint: string;
    acknowledgedBy?: string;
    resolvedBy?: string;
    dismissReason?: string;
}
export interface ProductionRequestMetric {
    requestId: string;
    timestamp: string;
    route: string;
    intent: string;
    latencyMs: number;
    success: boolean;
    errorType?: string;
    fallbackUsed: boolean;
    knowledgeHit: boolean;
    negativePolicyHit: boolean;
    transactionBoundaryHit: boolean;
    warrantyBoundaryHit: boolean;
    productDemandHit: boolean;
    piiDetected: boolean;
    sanitized: boolean;
    rolloutStage: ProductionRolloutStage;
}
export interface SloThresholds {
    availabilityTarget: number;
    errorRateHealthyMax: number;
    errorRateWarningMax: number;
    p95LatencyHealthyMax: number;
    p95LatencyWarningMax: number;
    p99LatencyHealthyMax: number;
    p99LatencyWarningMax: number;
    fallbackRateHealthyMax: number;
    fallbackRateWarningMax: number;
    knowledgeGapRateHealthyMax: number;
    knowledgeGapRateWarningMax: number;
}
export interface SloEvaluationItem {
    name: string;
    currentValue: number;
    target: string;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INSUFFICIENT_DATA';
}
export interface ProductionSloReport {
    overallStatus: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'INSUFFICIENT_DATA';
    availability: SloEvaluationItem;
    errorRate: SloEvaluationItem;
    p95Latency: SloEvaluationItem;
    p99Latency: SloEvaluationItem;
    fallbackRate: SloEvaluationItem;
    knowledgeGapRate: SloEvaluationItem;
    evaluatedAt: string;
}
export interface RolloutState {
    currentStage: ProductionRolloutStage;
    trafficPercentage: number;
    updatedAt: string;
    updatedBy: string;
    isBlocked: boolean;
    blockReason?: string;
}
export interface RollbackRecord {
    rollbackId: string;
    reason: string;
    triggeredBy: string;
    stageBefore: ProductionRolloutStage;
    stageAfter: ProductionRolloutStage;
    metricsSnapshot: Record<string, any>;
    timestamp: string;
}
export interface CapacityMetrics {
    status: CapacityStatus;
    requestsPerMinute: number;
    concurrentRequests: number;
    queueDepth: number;
    avgProcessingTimeMs: number;
    peakTraffic: number;
    rejectedRequests: number;
    timeoutCount: number;
}
export interface ProductionHealthScore {
    score: number;
    status: 'EXCELLENT' | 'HEALTHY' | 'WATCH' | 'DEGRADED' | 'CRITICAL';
    components: {
        reliability: number;
        latency: number;
        errorHealth: number;
        routingHealth: number;
        knowledgeHealth: number;
        securityHealth: number;
        capacityHealth: number;
        sloCompliance: number;
        incidentHealth: number;
    };
    isCapped: boolean;
    capReason?: string;
    evaluatedAt: string;
}
export interface ProductionControlCenterSummary {
    healthScore: ProductionHealthScore;
    rolloutState: RolloutState;
    circuitState: CircuitBreakerState;
    capacityMetrics: CapacityMetrics;
    sloReport: ProductionSloReport;
    activeIncidents: ProductionIncident[];
    recentRollbacks: RollbackRecord[];
    trafficStats: {
        requestsPerMin: number;
        successCount: number;
        errorCount: number;
        fallbackCount: number;
        activeUsers: number;
        concurrentRequests: number;
    };
    boundaryHealth: {
        transaction: boolean;
        duration: boolean;
        productDemand: boolean;
        warranty: boolean;
        negativePolicy: boolean;
        zeroAutoMutation: boolean;
        piiSanitization: boolean;
        promptInjection: boolean;
    };
    lastUpdated: string;
}
