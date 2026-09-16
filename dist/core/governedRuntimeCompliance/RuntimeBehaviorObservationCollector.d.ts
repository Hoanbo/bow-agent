import { RuntimeBehavioralProfile, RuntimeActionClassification } from './GovernedRuntimeComplianceTypes.js';
import type { PolicyDomain } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
export interface EmergencyStopProvider {
    isEmergencyStopActive(): boolean;
}
export interface RawTelemetryInput {
    readonly observationId: string;
    readonly tenantId: string;
    readonly policyDomain: PolicyDomain;
    readonly timestamp: string;
    readonly actionName: string;
    readonly actionClassification: RuntimeActionClassification;
    readonly parameters: Record<string, unknown>;
    readonly executionOutcome: 'SUCCESS' | 'FAILURE' | 'EXCEPTION';
    readonly sessionId?: string;
    readonly agentId?: string;
    readonly sequenceNumber: number;
}
export declare class RuntimeBehaviorObservationCollector {
    private readonly stopProvider?;
    private readonly seenObservationIds;
    private readonly sessionSequenceMap;
    private readonly maxReplayCacheSize;
    private readonly observationBuffer;
    private readonly maxBufferSize;
    constructor(stopProvider?: EmergencyStopProvider);
    private assertEmergencyStopInactive;
    assertValidTenantId(tenantId: string): void;
    sanitizeParameters(params: Record<string, unknown>): Record<string, unknown>;
    ingestObservation(raw: RawTelemetryInput): RuntimeBehavioralProfile;
    getBufferedObservations(): readonly RuntimeBehavioralProfile[];
    clearBuffer(): void;
}
