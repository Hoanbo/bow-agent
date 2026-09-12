import { ObservabilityRuntime } from '../observability/observabilityRuntime.js';
import type { ObservabilitySessionId } from '../observability/observabilityTypes.js';
import type { GovernedRemediationPlan, PostMitigationVerificationResult } from './remediationTypes.js';
export interface RunVerificationOptions {
    readonly plan: GovernedRemediationPlan;
    readonly observabilityRuntime: ObservabilityRuntime;
    readonly sessionId: ObservabilitySessionId;
    readonly verificationWindowMs?: number;
    readonly baselineLatencyP95?: number;
}
export declare class PostMitigationVerificationEngine {
    static readonly DEFAULT_VERIFICATION_WINDOW_MS = 30000;
    /**
     * Executes closed-loop post-mitigation verification against canonical ObservabilityRuntime.
     * Thực thi xác minh sau giảm thiểu vòng lặp kín dựa trên ObservabilityRuntime chuẩn tắc.
     */
    verifyMitigation(options: RunVerificationOptions): Promise<PostMitigationVerificationResult>;
    computeVerificationSha256(planId: string, passed: boolean, errorRate: number, latencyP95: number, violationsCount: number, drift: string): string;
}
