import type { ScopedConnectionIdentity } from './connectionTypes.js';
export type AuthState = 'UNAUTHENTICATED' | 'AUTHENTICATING' | 'AUTHENTICATED' | 'FAILED';
export interface ConnectionAuthCredentials {
    readonly credentialType: string;
    readonly principal: string;
    readonly secretPayload?: string;
    readonly claims?: Readonly<Record<string, unknown>>;
}
export interface ConnectionAuthResult {
    readonly authenticated: boolean;
    readonly peerId: string;
    readonly principal: string;
    readonly authState: AuthState;
    readonly claims: Readonly<Record<string, unknown>>;
    readonly error?: string;
    readonly fingerprint: string;
}
/**
 * Pure-data authentication verification.
 * Authenticates peer identity without granting authorization or capabilities.
 */
export declare function authenticateConnectionPeer(identity: ScopedConnectionIdentity, creds: ConnectionAuthCredentials): Readonly<ConnectionAuthResult>;
