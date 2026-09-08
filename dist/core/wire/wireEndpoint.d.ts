import type { WireEndpointMetadata } from './wireTypes.js';
export declare function parseWireEndpoint(uri: string): WireEndpointMetadata;
export declare function formatWireEndpoint(endpoint: WireEndpointMetadata): string;
export declare function validateWireEndpoint(endpoint: WireEndpointMetadata): void;
export declare function assertWireEndpointKnowledgeDoesNotGrantAccess(_endpoint: WireEndpointMetadata): void;
