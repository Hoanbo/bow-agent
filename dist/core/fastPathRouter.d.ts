export interface FastPathMatchResult {
    matched: boolean;
    intent: 'OPEN_APP' | 'DESKTOP_ACTION' | 'UTILITY_TIME' | 'GREETING_FAST' | 'NONE';
    action?: string;
    target?: string;
    textResponse?: string;
    payload?: Record<string, any>;
    executionDurationMs?: number;
}
export declare class FastPathRouter {
    private normalize;
    /**
     * Evaluate if a user query can be fulfilled deterministically via V2 local engine
     */
    evaluate(rawText: string): FastPathMatchResult;
}
export declare const fastPathRouter: FastPathRouter;
