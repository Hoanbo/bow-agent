import { DiagnosisSanitizer } from '../diagnosis/diagnosisSanitizer.js';
import type { IncidentId, RootCauseHypothesis, DecisionPackageId } from '../diagnosis/diagnosisTypes.js';
import type { RemediationPlanId, RemediationExecutionId } from '../remediation/remediationTypes.js';
import { type PostMortemReport, type IncidentClosureRecord, type RemediationEffectivenessMetrics, type HypothesisAccuracyRecord, type OscillationPattern, type BaselineReconciliationRecord } from './incidentResilienceTypes.js';
export interface SynthesizePostMortemInput {
    readonly incidentId: IncidentId;
    readonly targetId: string;
    readonly evidenceClusterId?: string;
    readonly primaryHypothesis?: RootCauseHypothesis;
    readonly hypothesisAccuracy?: HypothesisAccuracyRecord;
    readonly decisionPackageId?: DecisionPackageId;
    readonly authorizationTokenReference?: string;
    readonly remediationPlanId?: RemediationPlanId;
    readonly executionId?: RemediationExecutionId;
    readonly verificationSummary?: string;
    readonly rollbackOutcome?: string;
    readonly effectivenessMetrics: RemediationEffectivenessMetrics;
    readonly oscillationSummary?: OscillationPattern;
    readonly baselineReconciliation: BaselineReconciliationRecord;
    readonly closureRecord: IncidentClosureRecord;
    readonly upstreamProvenanceHash?: string;
}
export declare class IncidentPostMortemSynthesizer {
    private readonly sanitizer;
    constructor(sanitizer?: DiagnosisSanitizer);
    /**
     * Synthesizes an immutable, cryptographically sealed post-mortem report from all lifecycle artifacts.
     * Tổng hợp báo cáo hậu kiểm bất biến, được niêm phong mật mã từ tất cả các tài liệu vòng đời.
     */
    synthesizePostMortem(input: SynthesizePostMortemInput): PostMortemReport;
}
