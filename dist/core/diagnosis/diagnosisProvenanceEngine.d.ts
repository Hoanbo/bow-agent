import type { ObservabilitySessionId } from '../observability/observabilityTypes.js';
import type { DecisionPackageId, IncidentId, DiagnosisProvenanceRecord, CorrelatedEvidenceCluster, RootCauseHypothesis, IncidentSeverity } from './diagnosisTypes.js';
export interface BuildProvenanceOptions {
    readonly packageId: DecisionPackageId;
    readonly incidentId: IncidentId;
    readonly sessionId: ObservabilitySessionId;
    readonly evidenceCluster: CorrelatedEvidenceCluster;
    readonly hypotheses: readonly RootCauseHypothesis[];
    readonly telemetrySampleHashes?: readonly string[];
    readonly invariantEvidenceHashes?: readonly string[];
    readonly driftEvidenceHashes?: readonly string[];
    readonly alertFingerprints?: readonly string[];
    readonly parentProvenanceHash?: string;
    readonly timestamp?: number;
}
export declare class DiagnosisProvenanceEngine {
    /**
     * Computes a canonical, sorted JSON string representation of a sanitized object.
     * Tính toán chuỗi đại diện JSON chuẩn tắc, đã sắp xếp của đối tượng đã làm sạch.
     */
    canonicalJson(obj: unknown): string;
    private jsonReplacer;
    /**
     * Computes SHA-256 hash of a canonicalized, sanitized payload.
     * Tính toán mã băm SHA-256 của trọng tải đã chuẩn hóa và làm sạch.
     */
    computeSha256(payload: unknown): string;
    /**
     * Computes the canonical packageHash binding incident identity, evidence, hypotheses, and severity.
     * Tính toán mã băm packageHash chuẩn tắc ràng buộc danh tính sự cố, bằng chứng, giả thuyết và mức độ nghiêm trọng.
     */
    computePackageHash(args: {
        incidentId: IncidentId;
        evidenceHash: string;
        hypotheses: readonly RootCauseHypothesis[];
        severity: IncidentSeverity;
        timestamp: number;
    }): string;
    /**
     * Builds the comprehensive cryptographic provenance record for a decision-support package.
     * Xây dựng bản ghi nguồn gốc mật mã toàn diện cho gói hỗ trợ quyết định.
     */
    buildProvenance(options: BuildProvenanceOptions): DiagnosisProvenanceRecord;
}
export declare const globalDiagnosisProvenanceEngine: DiagnosisProvenanceEngine;
