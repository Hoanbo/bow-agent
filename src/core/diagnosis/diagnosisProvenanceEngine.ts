// src/core/diagnosis/diagnosisProvenanceEngine.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Cryptographic Provenance Engine for Incident Diagnosis & Decision Support.
// Binds raw telemetry observation hashes, invariant hashes, drift hashes, and alert fingerprints
// into a tamper-evident SHA-256 provenance record for the diagnostic package.
// Động cơ nguồn gốc mật mã cho chẩn đoán sự cố & hỗ trợ quyết định.
// Ràng buộc các mã băm quan sát đo từ xa thô, mã băm bất biến, mã băm sai lệch và dấu vân tay cảnh báo
// thành một bản ghi nguồn gốc SHA-256 chống giả mạo cho gói chẩn đoán.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - ZERO CREDENTIAL HASHING: All payloads MUST be thoroughly sanitized prior to hash generation.
// - DETERMINISTIC SIGNATURE: Sorted canonical JSON keys guarantee reproducible digests.
// - FULL ANCESTRY CHAIN: Connects back to observation session and parent deployment provenance.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import crypto from 'node:crypto';
import type { ObservabilitySessionId } from '../observability/observabilityTypes.js';
import type {
  DecisionPackageId,
  IncidentId,
  DiagnosisProvenanceRecord,
  CorrelatedEvidenceCluster,
  RootCauseHypothesis,
  IncidentSeverity,
} from './diagnosisTypes.js';
import { globalDiagnosisSanitizer } from './diagnosisSanitizer.js';

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

export class DiagnosisProvenanceEngine {
  /**
   * Computes a canonical, sorted JSON string representation of a sanitized object.
   * Tính toán chuỗi đại diện JSON chuẩn tắc, đã sắp xếp của đối tượng đã làm sạch.
   */
  public canonicalJson(obj: unknown): string {
    const sanitized = globalDiagnosisSanitizer.sanitize(obj);
    return JSON.stringify(sanitized, this.jsonReplacer);
  }

  private jsonReplacer(_key: string, value: unknown): unknown {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sortedKeys = Object.keys(value as Record<string, unknown>).sort();
      const sortedObj: Record<string, unknown> = {};
      for (const k of sortedKeys) {
        sortedObj[k] = (value as Record<string, unknown>)[k];
      }
      return sortedObj;
    }
    return value;
  }

  /**
   * Computes SHA-256 hash of a canonicalized, sanitized payload.
   * Tính toán mã băm SHA-256 của trọng tải đã chuẩn hóa và làm sạch.
   */
  public computeSha256(payload: unknown): string {
    const canonical = this.canonicalJson(payload);
    return crypto.createHash('sha256').update(canonical).digest('hex');
  }

  /**
   * Computes the canonical packageHash binding incident identity, evidence, hypotheses, and severity.
   * Tính toán mã băm packageHash chuẩn tắc ràng buộc danh tính sự cố, bằng chứng, giả thuyết và mức độ nghiêm trọng.
   */
  public computePackageHash(args: {
    incidentId: IncidentId;
    evidenceHash: string;
    hypotheses: readonly RootCauseHypothesis[];
    severity: IncidentSeverity;
    timestamp: number;
  }): string {
    return this.computeSha256({
      incidentId: args.incidentId,
      evidenceHash: args.evidenceHash,
      hypotheses: args.hypotheses.map((h) => ({
        id: h.hypothesisId,
        cat: h.category,
        conf: h.confidenceScore,
        unc: h.uncertaintyScore,
      })),
      severity: args.severity,
      timestamp: args.timestamp,
    });
  }

  /**
   * Builds the comprehensive cryptographic provenance record for a decision-support package.
   * Xây dựng bản ghi nguồn gốc mật mã toàn diện cho gói hỗ trợ quyết định.
   */
  public buildProvenance(options: BuildProvenanceOptions): DiagnosisProvenanceRecord {
    const ts = options.timestamp ?? Date.now();
    const hypothesisIds = options.hypotheses.map((h) => h.hypothesisId);

    const sortedTelemetryHashes = options.telemetrySampleHashes ? [...options.telemetrySampleHashes].sort() : [];
    const sortedInvariantHashes = options.invariantEvidenceHashes ? [...options.invariantEvidenceHashes].sort() : [];
    const sortedDriftHashes = options.driftEvidenceHashes ? [...options.driftEvidenceHashes].sort() : [];
    const sortedAlertFingerprints = options.alertFingerprints ? [...options.alertFingerprints].sort() : [];

    const rawSignaturePayload = {
      packageId: options.packageId,
      incidentId: options.incidentId,
      sessionId: options.sessionId,
      evidenceClusterHash: options.evidenceCluster.clusterHash,
      hypothesisIds: [...hypothesisIds].sort(),
      telemetrySampleHashes: sortedTelemetryHashes,
      invariantEvidenceHashes: sortedInvariantHashes,
      driftEvidenceHashes: sortedDriftHashes,
      alertFingerprints: sortedAlertFingerprints,
      parentProvenanceHash: options.parentProvenanceHash ?? 'NONE',
      timestamp: ts,
    };

    const signature = this.computeSha256(rawSignaturePayload);

    return {
      packageId: options.packageId,
      incidentId: options.incidentId,
      sessionId: options.sessionId,
      evidenceClusterHash: options.evidenceCluster.clusterHash,
      hypothesisIds: Object.freeze(hypothesisIds),
      telemetrySampleHashes: Object.freeze(sortedTelemetryHashes),
      invariantEvidenceHashes: Object.freeze(sortedInvariantHashes),
      driftEvidenceHashes: Object.freeze(sortedDriftHashes),
      alertFingerprints: Object.freeze(sortedAlertFingerprints),
      parentProvenanceHash: options.parentProvenanceHash,
      timestamp: ts,
      signature,
    };
  }
}

export const globalDiagnosisProvenanceEngine = new DiagnosisProvenanceEngine();
