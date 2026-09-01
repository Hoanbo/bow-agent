import type { KnowledgeAction, KnowledgeActionStatus, EstimatedImpact, ActionOutcome, ObservationWindow, BeforeAfterSnapshot, KnowledgeImprovementScore, ActionCenterSummary, AdminRecommendation } from '../monitoring/analyticsTypes.js';
export type { KnowledgeActionStatus };
export declare function clearActionCenterCache(): void;
export declare function assertAdminAuthorized(adminUserId: string, _operation?: string): boolean;
export declare function sanitizeActionText(raw: string): string;
export declare function calculateDecisionFingerprint(entityId: string, issueType: string, normalizedEvidence: string): string;
export declare function estimateImpact(params: {
    usageCount?: number;
    healthScore?: number;
    gapCount?: number;
    conflictCount?: number;
    coveragePercentage?: number;
}): EstimatedImpact;
export declare function captureBeforeSnapshot(params: {
    matchRate?: number;
    usageCount?: number;
    gapCount?: number;
    healthScore?: number;
    conflictCount?: number;
    coverage?: number;
    variantCount?: number;
}): BeforeAfterSnapshot;
export declare function captureAfterSnapshot(before: BeforeAfterSnapshot, params: {
    matchRate?: number;
    usageCount?: number;
    gapCount?: number;
    healthScore?: number;
    conflictCount?: number;
    coverage?: number;
    variantCount?: number;
}): BeforeAfterSnapshot;
export declare function calculateActionOutcome(before: BeforeAfterSnapshot, after: BeforeAfterSnapshot, observationWindow?: ObservationWindow, isInsufficientData?: boolean, feedbackReason?: string): ActionOutcome;
export declare function calculateKnowledgeImprovementScore(input: KnowledgeAction[] | {
    healthScore?: number;
    matchRate?: number;
    gapCount?: number;
    conflictCount?: number;
    coveragePercentage?: number;
}): KnowledgeImprovementScore;
export declare function syncRecommendationsToActions(recommendations: AdminRecommendation[], existingActions: KnowledgeAction[]): Promise<KnowledgeAction[]>;
export declare function acknowledgeAction(actionId: string, adminUserId: string, allActions: KnowledgeAction[]): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function startAction(actionId: string, adminUserId: string, allActions: KnowledgeAction[], beforeSnapshot?: BeforeAfterSnapshot): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function completeAction(actionId: string, adminUserId: string, allActions: KnowledgeAction[], params?: {
    afterSnapshot?: BeforeAfterSnapshot;
    outcome?: ActionOutcome;
    improvementScore?: number;
}): Promise<{
    success: boolean;
    error?: string;
    isRegression?: boolean;
}>;
export declare function dismissAction(actionId: string, adminUserId: string, allActions: KnowledgeAction[], reason?: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function snoozeAction(actionId: string, adminUserId: string, allActions: KnowledgeAction[], snoozedUntil: string, reason?: string): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function recordOutcome(actionId: string, adminUserId: string, allActions: KnowledgeAction[], outcome: ActionOutcome, afterSnapshot?: BeforeAfterSnapshot): Promise<{
    success: boolean;
    error?: string;
}>;
export declare function getActionCenter(recommendations: AdminRecommendation[], forceRefresh?: boolean): Promise<ActionCenterSummary>;
