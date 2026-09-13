import { AuditLedger } from '../auditLedger.js';
import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
export type PolicyEvolutionPlanningAuditEventType = 'EVOLUTION_PLAN_CREATED' | 'CANDIDATE_SYNTHESIS_STARTED' | 'CANDIDATE_DRAFT_CREATED' | 'CANDIDATE_VALIDATED' | 'CANDIDATE_BLOCKED' | 'CANDIDATE_REJECTED' | 'HUMAN_REVIEW_REQUIRED' | 'USER_STOP_BLOCKED' | 'TENANT_ISOLATION_BLOCKED' | 'HARD_FORBIDDEN_BLOCKED' | 'AUTONOMOUS_EVOLUTION_BLOCKED' | 'PROVENANCE_TAMPER_BLOCKED';
export interface PolicyEvolutionPlanningAuditRecord {
    readonly eventType: PolicyEvolutionPlanningAuditEventType;
    readonly tenantPartition: string;
    readonly intakeId?: string;
    readonly planId?: string;
    readonly candidateDraftId?: string;
    readonly status?: string;
    readonly reason?: string;
    readonly details?: Record<string, any>;
}
export interface PolicyEvolutionPlanningAuditEngineOptions {
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class PolicyEvolutionPlanningAuditEngine {
    static readonly CANONICAL_DOMAIN = "POLICY_EVOLUTION_PLANNING";
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: PolicyEvolutionPlanningAuditEngineOptions);
    /**
     * Records a sanitized evolution planning audit event into the append-only ledger.
     */
    recordEvent(record: PolicyEvolutionPlanningAuditRecord): void;
}
export declare const globalPolicyEvolutionPlanningAuditEngine: PolicyEvolutionPlanningAuditEngine;
