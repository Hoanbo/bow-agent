import type { InternetAdmissionToken, InternetEdgeSessionId } from './internetTypes.js';
import { type InternetAuditLedger } from './internetAudit.js';
export type RelayBindingState = 'UNBOUND' | 'BINDING' | 'BOUND' | 'UNBOUND_CLEANLY' | 'REJECTED';
/** A relay binding record created after a successful token consumption. */
export interface RelayBinding {
    readonly bindingId: string;
    readonly sessionId: InternetEdgeSessionId;
    readonly certFingerprint: string;
    readonly tlsVersion: string;
    readonly cipherSuite: string;
    readonly boundAt: number;
    readonly state: RelayBindingState;
}
export declare class InternetRelayBridge {
    private readonly _bindings;
    private readonly _ledger;
    constructor(ledger?: InternetAuditLedger);
    /** Number of currently active (BOUND) relay bindings. */
    get activeBindingCount(): number;
    /**
     * Binds an admitted session to the relay fabric.
     *
     * @param token  A consumed (single-use) admission token from InternetAdmissionBridge.
     * @returns      The relay binding record.
     *
     * INVARIANT: Duplicate bindings for the same sessionId are rejected.
     * INVARIANT: Token must be consumed (has consumedAt) before calling this.
     */
    bind(token: InternetAdmissionToken): RelayBinding;
    /**
     * Unbinds (removes from relay fabric) the session.
     * No-op if the session was never bound or already unbound.
     */
    unbind(sessionId: InternetEdgeSessionId, reason?: string): void;
    /**
     * Returns the current binding for a session, or undefined.
     */
    getBinding(sessionId: InternetEdgeSessionId): Readonly<RelayBinding> | undefined;
    /**
     * Returns a snapshot of all active (BOUND) relay bindings.
     */
    getActiveBindings(): readonly RelayBinding[];
}
