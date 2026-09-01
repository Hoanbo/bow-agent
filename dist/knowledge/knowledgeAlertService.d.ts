import type { KnowledgeAlert, AlertCenterSummary, AlertSeverity } from '../monitoring/analyticsTypes.js';
export declare function clearAlertStore(): void;
export declare function generateAlertFingerprint(entityId: string, alertType: string, evidence: string): string;
export declare function isAlertInCooldown(fingerprint: string): boolean;
export declare function createGovernanceAlert(params: {
    title: string;
    severity: AlertSeverity;
    reason: string;
    evidence: string;
    entityId?: string;
    entityType?: string;
    alertType?: string;
}): KnowledgeAlert | null;
export declare function acknowledgeAlert(alertId: string, adminUserId: string): {
    success: boolean;
    error?: string;
};
export declare function snoozeAlert(alertId: string, adminUserId: string, snoozeHours?: number): {
    success: boolean;
    error?: string;
};
export declare function dismissAlert(alertId: string, adminUserId: string, reason?: string): {
    success: boolean;
    error?: string;
};
export declare function evaluateGovernanceAlerts(params: {
    matchRateDrop?: number;
    gapRateSurge?: number;
    criticalRegressionsCount?: number;
    transactionBoundaryFailure?: boolean;
    unauthorizedMutationAttempt?: boolean;
    piiLeakageDetected?: boolean;
    activeConflictsCount?: number;
}): AlertCenterSummary;
