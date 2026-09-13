import type { ExecutionReceipt, ExecutionVerificationResult } from '../policyExecution/policyExecutionTypes.js';
import type { PostExecutionReconciliationResult, PostExecutionImpactAnalysis, PostExecutionRegressionFinding, PostExecutionEffectivenessResult, PolicyFeedbackProposal, PolicyPostExecutionOptions } from './policyPostExecutionTypes.js';
import { PolicyPostExecutionReconciliationEngine } from './policyPostExecutionReconciliationEngine.js';
import { PolicyImpactAnalysisEngine, type ImpactAnalysisContext } from './policyImpactAnalysisEngine.js';
import { PolicyRegressionDetectionEngine, type RegressionDetectionContext } from './policyRegressionDetectionEngine.js';
import { PolicyRemediationEffectivenessEngine, type EffectivenessEvaluationContext } from './policyRemediationEffectivenessEngine.js';
import { PolicyFeedbackProposalEngine } from './policyFeedbackProposalEngine.js';
import { PolicyPostExecutionProvenanceEngine } from './policyPostExecutionProvenanceEngine.js';
import { PolicyPostExecutionAuditEngine } from './policyPostExecutionAuditEngine.js';
export interface PostExecutionPipelineOptions extends PolicyPostExecutionOptions {
    readonly reconciliationEngine?: PolicyPostExecutionReconciliationEngine;
    readonly impactEngine?: PolicyImpactAnalysisEngine;
    readonly regressionEngine?: PolicyRegressionDetectionEngine;
    readonly effectivenessEngine?: PolicyRemediationEffectivenessEngine;
    readonly feedbackEngine?: PolicyFeedbackProposalEngine;
    readonly provenanceEngine?: PolicyPostExecutionProvenanceEngine;
    readonly auditEngine?: PolicyPostExecutionAuditEngine;
}
export interface PostExecutionPipelineResult {
    readonly reconciliation: PostExecutionReconciliationResult;
    readonly impact: PostExecutionImpactAnalysis;
    readonly regression: PostExecutionRegressionFinding;
    readonly effectiveness: PostExecutionEffectivenessResult;
    readonly feedbackProposal: PolicyFeedbackProposal;
}
export declare class PolicyPostExecutionRuntime {
    private readonly reconciliationEngine;
    private readonly impactEngine;
    private readonly regressionEngine;
    private readonly effectivenessEngine;
    private readonly feedbackEngine;
    private readonly provenanceEngine;
    private readonly auditEngine;
    private readonly baseDir;
    private readonly isUserStopActiveFn?;
    constructor(options?: PostExecutionPipelineOptions);
    private assertUserStopInactive;
    private validateTenant;
    /**
     * Executes the full governed post-execution pipeline.
     * Thực thi toàn bộ đường ống quản trị sau thực thi.
     */
    processPostExecution(input: {
        readonly receipt: ExecutionReceipt;
        readonly verification: ExecutionVerificationResult;
        readonly impactContext: ImpactAnalysisContext;
        readonly regressionContext?: RegressionDetectionContext;
        readonly effectivenessContext?: EffectivenessEvaluationContext;
    }): PostExecutionPipelineResult;
}
export declare const globalPolicyPostExecutionRuntime: PolicyPostExecutionRuntime;
