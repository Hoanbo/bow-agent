import type { AgentMessage } from '../core/types.js';
export interface FallbackOptions {
    reason?: string;
    originalQuery: string;
    matchedCategory?: string;
    sampleProducts?: Array<{
        name: string;
        startingPrice: number;
    }>;
}
export declare function generateDeterministicFallback(options: FallbackOptions): AgentMessage;
export declare function getAuthorityLevel(route: string): number;
