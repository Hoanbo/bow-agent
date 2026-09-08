import type { EndpointMetadata } from './admissionTypes.js';
export declare const BRAIN_ENDPOINT_KNOWLEDGE_STATEMENT = "Knowing where the Brain is does not mean having the right to enter it.";
export declare const ALLOWED_PROTOCOLS: Set<string>;
/**
 * Validates endpoint metadata.
 */
export declare function isValidEndpoint(endpoint: unknown): endpoint is EndpointMetadata;
/**
 * Asserts endpoint validity.
 */
export declare function assertValidEndpoint(endpoint: unknown): void;
/**
 * Formats canonical endpoint string: <protocol>://<host>:<port><path>
 */
export declare function formatEndpoint(endpoint: EndpointMetadata): string;
/**
 * Parses canonical endpoint string into EndpointMetadata.
 */
export declare function parseEndpoint(urlStr: string): EndpointMetadata;
/**
 * Core security assertion:
 * Knowing an endpoint grants 0 authorization or admission rights.
 */
export declare function assertEndpointKnowledgeDoesNotGrantAccess(): boolean;
export interface CreateBrainEndpointOptions {
    readonly host: string;
    readonly port: number;
    readonly protocol: string;
    readonly path?: string;
    readonly tlsRequired?: boolean;
}
export declare function createBrainEndpointMetadata(options: CreateBrainEndpointOptions): EndpointMetadata;
export declare function validateBrainEndpointMetadata(endpoint: unknown): boolean;
export declare function isBrainEndpointTargeting(endpoint: EndpointMetadata, host: string, port: number): boolean;
