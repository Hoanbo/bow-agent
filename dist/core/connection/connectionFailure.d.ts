import type { ScopedConnectionIdentity, ConnectionFailureCode } from './connectionTypes.js';
export interface ConnectionFailureDescriptor {
    readonly failureId: string;
    readonly scope: string;
    readonly scopeIdentity: ScopedConnectionIdentity;
    readonly code: ConnectionFailureCode;
    readonly message: string;
    readonly details: Readonly<Record<string, unknown>>;
    readonly timestamp: string;
    readonly fingerprint: string;
}
/**
 * Creates an immutable, scrubbed ConnectionFailureDescriptor
 */
export declare function createConnectionFailureDescriptor(identity: ScopedConnectionIdentity, code: ConnectionFailureCode, rawMessage: string, rawDetails?: Record<string, unknown>, timestamp?: string): Readonly<ConnectionFailureDescriptor>;
