import { type ContextAssemblyRequest, type ContextAssemblyResult, type ContextFragment } from './contextTypes.js';
import { type ContextSourceResolverOptions } from './contextSourceResolver.js';
import { AuditLedger } from '../auditLedger.js';
export interface ContextAssemblyEngineOptions extends ContextSourceResolverOptions {
    readonly auditLedger?: AuditLedger;
    readonly isUserStopActive?: () => boolean;
    readonly deterministicTimestamp?: number | string;
}
export declare class ContextAssemblyEngine {
    private readonly resolver;
    private readonly auditLedger?;
    private readonly sanitizer;
    private readonly externalUserStopFn?;
    private readonly deterministicTimestamp?;
    private internalUserStop;
    constructor(options?: ContextAssemblyEngineOptions);
    setUserStop(active: boolean): void;
    isUserStopActive(): boolean;
    /**
     * Master execution entrance for Context Assembly.
     */
    assembleContext(request: ContextAssemblyRequest): Promise<ContextAssemblyResult>;
    /**
     * Deterministically formats fragments into an AssembledContext structure.
     */
    private formatAssembledContext;
    calculateProvenanceHash(params: {
        assemblyId: string;
        tenantId: string;
        taskId: string;
        taskVersion: number;
        sourcesHash: string;
        sanitizedContentHash: string;
        timestamp: string;
    }): string;
    calculateSourcesHash(fragments: readonly ContextFragment[]): string;
    calculateContentHash(content: string): string;
    private recordAuditEvent;
}
