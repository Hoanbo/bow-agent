import { type AuditLedger } from '../auditLedger.js';
import { type SupervisorHumanGate } from '../supervisor/supervisorHumanGate.js';
import type { ObservabilitySessionId, ObservabilityHealthState, InvariantCheck, DriftEvent, ObservabilityAlert, TelemetryAggregationWindow, ObservabilityContradictionRecord } from '../observability/observabilityTypes.js';
import type { IncidentDiagnosis, AgentDiagnosticAssertion } from './diagnosisTypes.js';
import { EvidenceCorrelationEngine } from './evidenceCorrelationEngine.js';
import { RootCauseHypothesisEngine } from './rootCauseHypothesisEngine.js';
import { IncidentClassificationEngine } from './incidentClassificationEngine.js';
import { DiagnosisContradictionEngine } from './diagnosisContradictionEngine.js';
import { DiagnosisProvenanceEngine } from './diagnosisProvenanceEngine.js';
import { DecisionSupportSynthesizer } from './decisionSupportSynthesizer.js';
import { DiagnosisSanitizer } from './diagnosisSanitizer.js';
export interface DiagnoseIncidentOptions {
    readonly sessionId: ObservabilitySessionId;
    readonly targetId: string;
    readonly targetPath?: string;
    readonly referenceTime?: number;
    readonly windowDurationMs?: number;
    readonly invariantChecks?: readonly InvariantCheck[];
    readonly driftEvents?: readonly DriftEvent[];
    readonly alerts?: readonly ObservabilityAlert[];
    readonly telemetryWindow?: TelemetryAggregationWindow;
    readonly multiAgentAssertions?: readonly AgentDiagnosticAssertion[];
    readonly observabilityContradictions?: readonly ObservabilityContradictionRecord[];
    readonly currentHealth?: ObservabilityHealthState;
    readonly canaryRollbackRecommended?: boolean;
    readonly telemetrySampleHashes?: readonly string[];
    readonly invariantEvidenceHashes?: readonly string[];
    readonly driftEvidenceHashes?: readonly string[];
    readonly alertFingerprints?: readonly string[];
    readonly parentProvenanceHash?: string;
}
export declare class DiagnosisRuntime {
    private readonly correlationEngine;
    private readonly hypothesisEngine;
    private readonly classificationEngine;
    private readonly contradictionEngine;
    private readonly provenanceEngine;
    private readonly synthesizer;
    private readonly sanitizer;
    private readonly auditLedger;
    private readonly humanGate;
    private isUserStopActive;
    private isRevoked;
    constructor(correlationEngine?: EvidenceCorrelationEngine, hypothesisEngine?: RootCauseHypothesisEngine, classificationEngine?: IncidentClassificationEngine, contradictionEngine?: DiagnosisContradictionEngine, provenanceEngine?: DiagnosisProvenanceEngine, synthesizer?: DecisionSupportSynthesizer, sanitizer?: DiagnosisSanitizer, auditLedger?: AuditLedger, humanGate?: SupervisorHumanGate);
    triggerUserStop(reason: string): void;
    triggerRevocation(reason: string): void;
    resetSafetySwitches(): void;
    get isSafetyHalted(): boolean;
    /**
     * Performs autonomous self-diagnosis, incident classification, and decision-support package synthesis.
     * Purely advisory analysis; executes zero remediation.
     * Thực hiện tự chẩn đoán có quản trị, phân loại sự cố và tổng hợp gói hỗ trợ quyết định.
     * Phân tích hoàn toàn mang tính khuyến nghị; không thực thi bất kỳ hành động khắc phục nào.
     */
    diagnoseIncident(options: DiagnoseIncidentOptions): IncidentDiagnosis;
    /**
     * Submits an inert decision package to the SupervisorHumanGate for human evaluation.
     * Adapts IncidentDiagnosis to legacy HumanGateRequest contracts without creating execution authority.
     * Gửi gói quyết định trơ tới SupervisorHumanGate để con người đánh giá.
     * Thích ứng IncidentDiagnosis với các hợp đồng HumanGateRequest cũ mà không tạo ra quyền thực thi.
     */
    submitToSupervisorGate(diagnosis: IncidentDiagnosis): {
        readonly requestId: string;
        readonly status: string;
    };
    private logAudit;
}
export declare const globalDiagnosisRuntime: DiagnosisRuntime;
