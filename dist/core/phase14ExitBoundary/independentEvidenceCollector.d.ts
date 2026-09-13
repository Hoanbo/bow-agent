import { Phase14ExitBoundaryGate } from './phase14ExitBoundaryGate.js';
import { Phase14EvidenceItem } from './phase14ExitCertificateTypes.js';
export interface EvidenceCollectionOptions {
    readonly tenantId: string;
    readonly auditLedgerPath?: string;
    readonly protectedWorkspacePath?: string;
    readonly overrideFilesystemCheck?: () => boolean;
    readonly rawEvidenceOverrides?: readonly Phase14EvidenceItem[];
}
export declare class IndependentEvidenceCollector {
    private readonly _gate;
    constructor(gate: Phase14ExitBoundaryGate);
    private hashData;
    /**
     * Collect all independent evidence streams across repository and runtime artifacts
     */
    collectEvidence(options: EvidenceCollectionOptions): Promise<readonly Phase14EvidenceItem[]>;
}
