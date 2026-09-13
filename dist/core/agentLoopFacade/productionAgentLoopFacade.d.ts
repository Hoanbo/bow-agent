import { type AuditLedger } from '../auditLedger.js';
import { type DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import { type AgentLoopRequest, type AgentLoopResult } from './agentLoopFacadeTypes.js';
import { AgentLoopExecutionGate } from './agentLoopExecutionGate.js';
import { AgentLoopSubsystemComposer } from './agentLoopSubsystemComposer.js';
export interface ProductionAgentLoopFacadeOptions {
    readonly composer?: AgentLoopSubsystemComposer;
    readonly gate?: AgentLoopExecutionGate;
    readonly auditLedger?: AuditLedger;
    readonly sanitizer?: DiagnosisSanitizer;
}
export declare class ProductionAgentLoopFacade {
    private readonly composer;
    private readonly gate;
    private readonly auditLedger;
    private readonly sanitizer;
    constructor(options?: ProductionAgentLoopFacadeOptions);
    /**
     * EN: Recursively deep-freezes an object to guarantee absolute immutability.
     */
    private deepFreeze;
    /**
     * EN: Produces a canonical JSON string with deterministically sorted keys.
     */
    private canonicalJSON;
    /**
     * EN: Validates the structural and security envelope of the loop request.
     */
    private validateRequest;
    /**
     * EN: Records structured audit event in globalAuditLedger.
     */
    private recordAudit;
    /**
     * EN: Primary execution entrypoint alias: runs a governed, bounded agent execution cycle.
     */
    executeLoop(request: AgentLoopRequest): Promise<AgentLoopResult>;
    /**
     * EN: Primary execution entrypoint: runs a governed, bounded agent execution cycle.
     */
    runLoop(request: AgentLoopRequest): Promise<AgentLoopResult>;
}
export declare const globalProductionAgentLoopFacade: ProductionAgentLoopFacade;
