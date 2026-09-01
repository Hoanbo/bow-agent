import type { ProductionIncident, IncidentSeverity, IncidentType, IncidentStatus } from '../monitoring/analyticsTypes.js';
export interface CreateIncidentParams {
    title: string;
    severity: IncidentSeverity;
    type: IncidentType;
    affectedComponent: string;
    evidence: string;
}
export declare function generateIncidentFingerprint(type: IncidentType, component: string, evidence: string): string;
export declare function createProductionIncident(params: CreateIncidentParams): ProductionIncident | null;
export declare function getActiveIncidents(filterSeverity?: IncidentSeverity | 'ALL', filterStatus?: IncidentStatus | 'ALL'): ProductionIncident[];
export declare function hasOpenCriticalIncidents(): boolean;
export declare function acknowledgeIncident(incidentId: string, adminUserId: string): {
    success: boolean;
    error?: string;
};
export declare function resolveIncident(incidentId: string, adminUserId: string): {
    success: boolean;
    error?: string;
};
export declare function dismissIncident(incidentId: string, adminUserId: string, reason: string): {
    success: boolean;
    error?: string;
};
export declare function clearIncidentStore(): void;
