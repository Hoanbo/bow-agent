import type { RelayEndpointMetadata } from './relayTypes.js';
export declare class RelayEndpointError extends Error {
    constructor(message: string);
}
/**
 * Validates the syntactic and architectural integrity of a RelayEndpointMetadata object.
 */
export declare function validateRelayEndpoint(endpoint: RelayEndpointMetadata): void;
/**
 * Formats an endpoint metadata object into a canonical URI string.
 */
export declare function formatRelayEndpointUrl(endpoint: RelayEndpointMetadata): string;
/**
 * Compares two endpoints for routing equivalence.
 */
export declare function areEndpointsEquivalent(a: RelayEndpointMetadata, b: RelayEndpointMetadata): boolean;
/**
 * Enforces the core invariant: Knowing the endpoint never grants authorization or access.
 */
export declare function assertRelayEndpointKnowledgeDoesNotGrantAccess(hasEndpointInfo: boolean, isAdmitted: boolean): void;
