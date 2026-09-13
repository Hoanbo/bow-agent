import { Phase14ExitBoundaryGate } from './phase14ExitBoundaryGate.js';
import { EvidenceCollectionOptions } from './independentEvidenceCollector.js';
import { ReconciliationOutcome } from './phase14EvidenceReconciler.js';
import { Phase14AuthenticProvenanceManifest, Phase14EvidenceItem, Phase14ExitCertificateStatus } from './phase14ExitCertificateTypes.js';
import { Phase14ReadinessReport } from '../phase14Readiness/phase14ReadinessTypes.js';
export interface RunGovernanceAuditOptions extends EvidenceCollectionOptions {
    readonly readinessReport?: Phase14ReadinessReport;
    readonly authenticProvenanceOverrides?: Partial<Phase14AuthenticProvenanceManifest>;
    readonly independentEvidenceOverrides?: Record<string, {
        status: 'PASS' | 'FAIL' | 'INCONCLUSIVE';
        score: number;
        notes: string;
    }>;
}
export interface GovernanceAuditOutcome {
    readonly auditStatus: Phase14ExitCertificateStatus;
    readonly reconciliation: ReconciliationOutcome;
    readonly evidenceItems: readonly Phase14EvidenceItem[];
    readonly rawEvidenceHashes: readonly string[];
    readonly provenanceManifest: Phase14AuthenticProvenanceManifest;
    readonly summary: string;
}
export declare class Phase14GovernanceAuditEngine {
    private readonly _gate;
    private readonly _collector;
    private readonly _reconciler;
    constructor(gate: Phase14ExitBoundaryGate);
    /**
     * Derive deterministic authentic cryptographic provenance chain linking MS-1.4.01 to MS-1.4.12
     */
    deriveAuthenticProvenanceManifest(tenantId: string, evidenceItems: readonly Phase14EvidenceItem[], readinessReport?: Phase14ReadinessReport, customProv?: Partial<Phase14AuthenticProvenanceManifest>): Phase14AuthenticProvenanceManifest;
    /**
     * Execute full independent governance audit
     */
    executeAudit(options: RunGovernanceAuditOptions): Promise<GovernanceAuditOutcome>;
}
