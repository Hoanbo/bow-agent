// src/core/diagnosis/diagnosisContradictionEngine.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Multi-Agent Diagnostic Contradiction & Dissent Preservation Engine.
// Explicitly rejects majority voting; preserves all dissenting agent viewpoints verbatim,
// degrades aggregate confidence, and forces escalation to the SupervisorHumanGate.
// Động cơ mâu thuẫn chẩn đoán đa tác nhân & bảo toàn dị ý.
// Bác bỏ rõ ràng việc bỏ phiếu đa số; bảo toàn nguyên văn mọi quan điểm bất đồng của tác nhân,
// giảm độ tin cậy tổng hợp và buộc leo thang lên SupervisorHumanGate.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - AGENT_COUNT != AUTHORITY_COUNT: Consensus cannot override human review when dissent is present.
// - NO MAJORITY VOTING: N opinions cannot suppress 1 dissenting opinion.
// - DISSENT PRESERVATION: Every dissenting assertion is preserved in the final decision package.
// - CONFIDENCE DEGRADATION: Disagreement caps maximum confidence at 0.40.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.

import type { ObservabilityContradictionRecord } from '../observability/observabilityTypes.js';
import type {
  AgentDiagnosticAssertion,
  DiagnosisContradictionResult,
  DissentingView,
} from './diagnosisTypes.js';

export class DiagnosisContradictionEngine {
  public static readonly CONTRADICTION_CONFIDENCE_CAP = 0.40;

  /**
   * Evaluates a set of multi-agent diagnostic assertions and existing observability contradictions.
   * Preserves all dissenting views without majority filtering.
   * Đánh giá tập hợp các khẳng định chẩn đoán đa tác nhân và các mâu thuẫn quan sát hiện có.
   * Bảo toàn mọi quan điểm dị ý mà không lọc theo đa số.
   */
  public evaluateAssertions(
    assertions: readonly AgentDiagnosticAssertion[],
    observabilityContradictions?: readonly ObservabilityContradictionRecord[]
  ): DiagnosisContradictionResult {
    const conflictingFields = new Set<string>();
    const dissentingViews: DissentingView[] = [];

    // 1. Check existing observability contradictions
    // 1. Kiểm tra các mâu thuẫn quan sát hiện có
    if (observabilityContradictions && observabilityContradictions.length > 0) {
      for (const rec of observabilityContradictions) {
        if (rec.status !== 'NO_CONFLICT') {
          for (const field of rec.conflictingFields) {
            conflictingFields.add(`observability.${field}`);
          }
        }
      }
    }

    // 2. Check diagnostic assertion agreement across agents
    // 2. Kiểm tra sự đồng thuận khẳng định chẩn đoán giữa các tác nhân
    if (assertions.length > 1) {
      const firstCategory = assertions[0].assertedCategory;
      const firstHealth = assertions[0].assertedHealthState;
      const firstSeverity = assertions[0].assertedSeverity;

      for (let i = 1; i < assertions.length; i++) {
        const current = assertions[i];

        if (current.assertedCategory !== firstCategory) {
          conflictingFields.add('assertedCategory');
        }
        if (current.assertedHealthState !== firstHealth) {
          conflictingFields.add('assertedHealthState');
        }
        if (current.assertedSeverity !== firstSeverity) {
          conflictingFields.add('assertedSeverity');
        }
      }

      // If any field conflicts, preserve ALL distinct viewpoints
      if (conflictingFields.size > 0) {
        for (const assertion of assertions) {
          dissentingViews.push({
            agentId: assertion.agentId,
            assertedCause: `${assertion.assertedCategory} (${assertion.assertedSeverity}) - Health: ${assertion.assertedHealthState}`,
            evidenceHash: assertion.evidenceHash,
            confidenceScore: assertion.confidenceScore,
            reasoning: assertion.reasoning,
          });
        }
      }
    }

    const hasContradiction = conflictingFields.size > 0;
    const isConflicted = hasContradiction;
    const confidenceCap = hasContradiction ? DiagnosisContradictionEngine.CONTRADICTION_CONFIDENCE_CAP : 0.95;

    return {
      hasContradiction,
      isConflicted,
      conflictingFields: Object.freeze(Array.from(conflictingFields)),
      dissentingViews: Object.freeze(dissentingViews),
      confidenceCap,
    };
  }
}

export const globalDiagnosisContradictionEngine = new DiagnosisContradictionEngine();
