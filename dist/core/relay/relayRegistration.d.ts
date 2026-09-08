import type { RelayRegistration, RelayId } from './relayTypes.js';
export declare class RelayRegistrationError extends Error {
    constructor(message: string);
}
/**
 * Validates the cryptographic and structural integrity of a RelayRegistration request.
 */
export declare function validateRelayRegistration(reg: RelayRegistration): void;
/**
 * In-memory registry manager for registered relays.
 */
export declare class RelayRegistrationManager {
    private readonly registrations;
    register(registration: RelayRegistration): void;
    unregister(relayId: RelayId): boolean;
    getRegistration(relayId: RelayId): RelayRegistration | undefined;
    isRegistered(relayId: RelayId): boolean;
    revoke(relayId: RelayId): void;
    listRegistrations(): readonly RelayRegistration[];
    clear(): void;
}
