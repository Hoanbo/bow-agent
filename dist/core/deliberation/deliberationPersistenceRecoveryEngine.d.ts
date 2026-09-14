import { type DeliberationSessionDocument } from './deliberationTypes.js';
export interface DeliberationPersistenceOptions {
    readonly baseDir?: string;
    readonly userStopProvider?: () => boolean;
}
export declare class DeliberationPersistenceRecoveryEngine {
    private readonly baseDir;
    private readonly userStopProvider;
    constructor(options?: DeliberationPersistenceOptions);
    /**
     * Resolves the isolated directory for a specific tenant.
     */
    getTenantSessionDir(tenantId: string): string;
    /**
     * Crash-safe atomic persistence:
     * serialize -> write .tmp.<random> -> validate -> snapshot .bak -> atomic rename
     */
    saveSession(doc: DeliberationSessionDocument, expectedVersion?: number, activeTenantId?: string): void;
    /**
     * Loads a session from disk with provenance integrity checking and fallback to .bak.
     */
    loadSession(sessionId: string, tenantId: string): DeliberationSessionDocument;
    /**
     * Lists all session IDs belonging strictly to a tenant.
     */
    listSessions(tenantId: string): readonly string[];
    /**
     * Deletes a session document and its backup for a tenant.
     */
    deleteSession(sessionId: string, tenantId: string): void;
    private sanitizeFileName;
}
export declare const globalDeliberationPersistenceRecoveryEngine: DeliberationPersistenceRecoveryEngine;
