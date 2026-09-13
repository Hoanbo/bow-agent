import { type IndependentAuditReport, type PolicyPhaseExitAuditOptions } from './policyPhaseExitAuditTypes.js';
export declare class PolicyPhaseExitAuditRuntime {
    private readonly collector;
    private readonly milestoneInspector;
    private readonly integrationInspector;
    private readonly runtimeInspector;
    private readonly securityInspector;
    private readonly authorityInspector;
    private readonly isolationInspector;
    private readonly provenanceInspector;
    private readonly antiCircularityEngine;
    private readonly assessmentEngine;
    private readonly store;
    private readonly auditProvenanceEngine;
    private readonly auditEngine;
    private readonly isUserStopActiveFn?;
    constructor(options?: PolicyPhaseExitAuditOptions);
    private assertUserStopInactive;
    /**
     * Executes an independent, multi-vector evidence audit across all 16 Phase 1.3 governance milestones.
     * Produces an immutable-style IndependentAuditReport with dedicated provenance and audit ledger entries.
     * STRICTLY READ-ONLY; modifies ZERO policy state; CANNOT authorize or commit any phase exit.
     */
    executeIndependentAudit(params: {
        readonly tenantPartition: string;
        readonly actorUserId: string;
    }): IndependentAuditReport;
    /**
     * Retrieves a previously generated IndependentAuditReport.
     */
    getReport(tenantPartition: string, reportId: any): IndependentAuditReport | null;
    /**
     * Verifies the cryptographic audit provenance chain for a tenant.
     */
    verifyAuditProvenance(tenantPartition: string): {
        valid: boolean;
        recordCount: number;
        error?: string;
    };
}
