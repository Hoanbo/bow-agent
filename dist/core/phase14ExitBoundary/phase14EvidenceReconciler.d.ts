import { Phase14ExitBoundaryGate } from './phase14ExitBoundaryGate.js';
import { Phase14ContradictionFinding, Phase14CriterionAuditResult, Phase14CriterionAuditStatus, Phase14EvidenceItem, Phase14ExitCriterionId } from './phase14ExitCertificateTypes.js';
import { Phase14ReadinessReport } from '../phase14Readiness/phase14ReadinessTypes.js';
export interface ReconciliationInput {
    readonly tenantId: string;
    readonly evidence: readonly Phase14EvidenceItem[];
    readonly readinessReport?: Phase14ReadinessReport;
    readonly independentEvidenceOverrides?: Partial<Record<Phase14ExitCriterionId, {
        status: Phase14CriterionAuditStatus;
        score: number;
        notes: string;
    }>>;
}
export interface ReconciliationOutcome {
    readonly criteriaResults: readonly Phase14CriterionAuditResult[];
    readonly contradictions: readonly Phase14ContradictionFinding[];
    readonly allPassed: boolean;
    readonly passedCount: number;
}
export declare class Phase14EvidenceReconciler {
    private readonly _gate;
    constructor(gate: Phase14ExitBoundaryGate);
    reconcile(input: ReconciliationInput): ReconciliationOutcome;
}
