import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import type { PolicyIncidentRecord } from '../governedPolicyLifecycle/GovernedPolicyLifecycleTypes.js';
import type { RuntimeComplianceEvidenceDossier, PolicyViolationRecord, OperationalAssuranceScore } from '../governedRuntimeCompliance/GovernedRuntimeComplianceTypes.js';
import { CorrelatedIncidentEnvelope, EmergencyStopProvider } from './GovernedPolicyRemediationTypes.js';
export interface IngestedComplianceData {
    readonly dossiers?: readonly RuntimeComplianceEvidenceDossier[];
    readonly violations?: readonly PolicyViolationRecord[];
    readonly assuranceScores?: readonly OperationalAssuranceScore[];
    readonly incidents?: readonly PolicyIncidentRecord[];
}
export interface IncidentCorrelationConfig {
    readonly windowDurationSeconds?: number;
}
export declare class IncidentComplianceEvidenceCorrelator {
    private readonly emergencyStopProvider?;
    private readonly windowDurationSeconds;
    private readonly secretRegexes;
    private readonly promptInjectionRegexes;
    constructor(emergencyStopProvider?: EmergencyStopProvider, config?: IncidentCorrelationConfig);
    private assertEmergencyStopInactive;
    sanitizeUntrustedText(text: string): {
        sanitized: string;
        hadInjection: boolean;
    };
    correlateIncidentEvidence(tenantId: string, policyDomain: PolicyDomain, data: IngestedComplianceData, currentTime?: Date): CorrelatedIncidentEnvelope;
}
