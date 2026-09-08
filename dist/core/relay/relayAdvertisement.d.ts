import type { RelayEndpointMetadata, RelayCapability, RelayId } from './relayTypes.js';
export interface RelayAdvertisement {
    readonly advertisementId: string;
    readonly relayId: RelayId;
    readonly endpoint: RelayEndpointMetadata;
    readonly protocolVersion: string;
    readonly supportedProtocols: readonly string[];
    readonly capabilities: readonly RelayCapability[];
    readonly advertisedAt: number;
    readonly ttlMs: number;
    readonly signature?: string;
}
export declare class RelayAdvertisementError extends Error {
    constructor(message: string);
}
/**
 * Validates an incoming relay advertisement envelope.
 */
export declare function validateRelayAdvertisement(adv: RelayAdvertisement, now?: number): boolean;
