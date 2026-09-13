import { Phase14BoundaryGateOptions } from './phase14ExitBoundaryGate.js';
import { RunGovernanceAuditOptions } from './phase14GovernanceAuditEngine.js';
import { Phase14AuditExecutionResult } from './phase14ExitCertificateTypes.js';
export interface ExecuteIndependentAuditInput extends RunGovernanceAuditOptions {
    readonly certificateId?: string;
    readonly auditId?: string;
}
export declare class Phase14ExitCertificateRuntime {
    private readonly _gate;
    private readonly _auditEngine;
    constructor(gateOptions?: Phase14BoundaryGateOptions);
    /**
     * Static factory method for executing the full independent governance audit
     */
    static executeIndependentAudit(input: ExecuteIndependentAuditInput, gateOptions?: Phase14BoundaryGateOptions): Promise<Phase14AuditExecutionResult>;
    /**
     * Run independent governance audit and generate sealed, non-authoritative exit certificate
     */
    runIndependentAudit(input: ExecuteIndependentAuditInput): Promise<Phase14AuditExecutionResult>;
}
