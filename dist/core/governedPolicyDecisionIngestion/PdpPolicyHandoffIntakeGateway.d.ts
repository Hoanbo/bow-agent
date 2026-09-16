import type { PdpPolicyHandoffPackage } from '../governedStrategicPolicyEvolution/GovernedStrategicPolicyEvolutionTypes.js';
import { type IngestionLifecycleStatus } from './GovernedPolicyDecisionIngestionTypes.js';
export interface ValidatedIntakeRecord {
    intakeId: string;
    handoffId: string;
    proposalId: string;
    dossierId: string;
    tenantId: string;
    policyDomain: string;
    deltasCount: number;
    dossierProvenanceHash: string;
    policyDeltaHash: string;
    intakeHash: string;
    receivedAt: number;
    lifecycleStatus: IngestionLifecycleStatus;
}
export declare class PdpPolicyHandoffIntakeGateway {
    private readonly consumedHandoffIds;
    private readonly consumedProposalIds;
    private readonly inFlightHandoffs;
    private readonly validatedIntakeRecords;
    private readonly isUserStopActiveFn?;
    private readonly isEmergencyStopActiveFn?;
    constructor(options?: {
        isUserStopActive?: (tenantId?: string) => boolean;
        isEmergencyStopActive?: (domain?: string) => boolean;
    });
    /**
     * Validate and admit an incoming PdpPolicyHandoffPackage from MS-1.5.19.
     * Xác thực và tiếp nhận gói PdpPolicyHandoffPackage gửi từ MS-1.5.19.
     */
    ingestHandoff(handoff: PdpPolicyHandoffPackage, callingTenantContext?: string): ValidatedIntakeRecord;
    /**
     * Release in-flight counter once ratification or rejection completes.
     */
    releaseInFlight(tenantId: string): void;
    getIntakeRecord(intakeId: string): ValidatedIntakeRecord | undefined;
    isConsumed(handoffId: string): boolean;
    private validateHandoffSchema;
    private assertValidTenantId;
    private assertInterlocksInactive;
}
