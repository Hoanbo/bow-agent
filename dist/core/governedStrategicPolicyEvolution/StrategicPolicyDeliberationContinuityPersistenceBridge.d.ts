import { PolicyEvolutionProposal, StrategicPolicyDeliberationDossier, StrategicPolicyAuditEvent, StrategicPolicyAuditEventType } from './GovernedStrategicPolicyEvolutionTypes';
export interface PersistenceResult {
    targetPath: string;
    checksum: string;
    version: number;
}
export declare class StrategicPolicyDeliberationContinuityPersistenceBridge {
    private readonly baseDirectory;
    private readonly auditChains;
    constructor(customBaseDir?: string);
    validateIdentifier(id: string, label?: string): void;
    private toSafeFilename;
    private computeChecksum;
    persistProposalAtomically(tenantId: string, proposal: PolicyEvolutionProposal, expectedVersion: number): PersistenceResult;
    loadProposal(tenantId: string, proposalId: string): PolicyEvolutionProposal | null;
    persistDossierAtomically(tenantId: string, dossier: StrategicPolicyDeliberationDossier, expectedVersion: number): PersistenceResult;
    loadDossier(tenantId: string, dossierId: string): StrategicPolicyDeliberationDossier | null;
    emitAuditEvent(eventType: StrategicPolicyAuditEventType, tenantId: string, sessionId: string, details?: Record<string, unknown>, proposalId?: string, dossierId?: string): StrategicPolicyAuditEvent;
    getAuditChain(sessionId: string): StrategicPolicyAuditEvent[];
    verifyAuditChainIntegrity(sessionId: string): boolean;
    persistAuditLedger(tenantId: string, sessionId?: string): string;
    clear(): void;
}
