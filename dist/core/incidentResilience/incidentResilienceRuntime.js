// src/core/incidentResilience/incidentResilienceRuntime.ts
// BOWCON V4.0 — MS-1.3.56: GOVERNED POST-REMEDIATION RESILIENCE, RECOVERY OUTCOME ANALYSIS & INCIDENT LIFECYCLE CLOSURE PIPELINE
//
// Governed Incident Resilience Runtime Coordinator.
// Orchestrates the post-remediation lifecycle: recurrence detection, recovery outcome scoring,
// hypothesis calibration, baseline reconciliation, fail-closed closure, post-mortem synthesis,
// cryptographic provenance, and canonical AuditLedger logging.
// Bộ điều phối thời gian chạy khả năng phục hồi sự cố có quản trị.
// Điều phối vòng đời sau khắc phục: phát hiện lặp lại, chấm điểm kết quả phục hồi,
// hiệu chuẩn giả thuyết, đối soát đường cơ sở, đóng sự cố đóng khi thất bại, tổng hợp hậu kiểm,
// nguồn gốc mật mã và ghi nhật ký AuditLedger chuẩn tắc.
//
// STRICT GOVERNANCE INVARIANTS / CÁC BẤT BIẾN QUẢN TRỊ NGHIÊM NGẶT:
// - ZERO_TOKEN_ISSUANCE: IncidentResilienceRuntime MUST NEVER issue authorization tokens (count === 0).
// - ZERO_SELF_APPROVAL: IncidentResilienceRuntime MUST NEVER approve human gate requests (count === 0).
// - ZERO_SHELL_PRIMITIVES: Absolute ban on OS subprocess primitives, shell execution, eval, Function, or raw OS pipes.
// - USER_STOP_SUPREMACY: Immediate halt and fail-closed escalation if USER_STOP signal is active.
// - CANONICAL_AUDIT: All actions and events recorded in globalAuditLedger under domain 'INCIDENT_RESILIENCE'.
// - C:\BOW\shopofbow: Zero reads, zero writes, zero touches. Fail closed with SECURITY_VIOLATION.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { globalAuditLedger } from '../auditLedger.js';
import { SandboxPathGuard } from '../sandbox/sandboxPathGuard.js';
import { IncidentClosureEngine } from './incidentClosureEngine.js';
import { RemediationEffectivenessEngine } from './remediationEffectivenessEngine.js';
import { HypothesisAccuracyScorer } from './hypothesisAccuracyScorer.js';
import { AntiOscillationDetector } from './antiOscillationDetector.js';
import { BaselineReconciliationEngine } from './baselineReconciliationEngine.js';
import { IncidentPostMortemSynthesizer } from './incidentPostMortemSynthesizer.js';
import { IncidentResilienceProvenanceEngine } from './incidentResilienceProvenanceEngine.js';
export class IncidentResilienceRuntime {
    closureEngine;
    effectivenessEngine;
    accuracyScorer;
    oscillationDetector;
    baselineEngine;
    postMortemSynthesizer;
    resilienceProvenanceEngine;
    auditLedger;
    isUserStopActive = false;
    constructor(closureEngine = new IncidentClosureEngine(), effectivenessEngine = new RemediationEffectivenessEngine(), accuracyScorer = new HypothesisAccuracyScorer(), oscillationDetector = new AntiOscillationDetector(), baselineEngine = new BaselineReconciliationEngine(), postMortemSynthesizer = new IncidentPostMortemSynthesizer(), resilienceProvenanceEngine = new IncidentResilienceProvenanceEngine(), auditLedger = globalAuditLedger) {
        this.closureEngine = closureEngine;
        this.effectivenessEngine = effectivenessEngine;
        this.accuracyScorer = accuracyScorer;
        this.oscillationDetector = oscillationDetector;
        this.baselineEngine = baselineEngine;
        this.postMortemSynthesizer = postMortemSynthesizer;
        this.resilienceProvenanceEngine = resilienceProvenanceEngine;
        this.auditLedger = auditLedger;
    }
    /**
     * Sets or unsets the emergency USER_STOP signal.
     * Thiết lập hoặc hủy tín hiệu dừng khẩn cấp USER_STOP.
     */
    setUserStop(active) {
        this.isUserStopActive = active;
        this.logAudit(active ? 'USER_STOP_ACTIVATED' : 'USER_STOP_DEACTIVATED', { id: 'OPERATOR', role: 'MASTER_HUMAN_OPERATOR' }, { id: 'RESILIENCE_RUNTIME', type: 'EMERGENCY_CONTROL' }, { active, timestamp: Date.now() }, active ? 'DENY' : 'PERMIT', active ? 'BLOCKED' : 'SUCCESS');
    }
    /**
     * Returns current status of the emergency USER_STOP signal.
     * Trả về trạng thái hiện tại của tín hiệu dừng khẩn cấp USER_STOP.
     */
    getUserStop() {
        return this.isUserStopActive;
    }
    /**
     * Executes the full governed incident resilience lifecycle.
     * Thực thi toàn bộ vòng đời phục hồi sự cố có quản trị.
     */
    executeResiliencePipeline(request) {
        const { incidentId, targetId, targetPath, decisionPackage, remediationResponse, hasContradictoryEvidence = false, preIncidentErrorRate, preIncidentLatencyP95Ms, } = request;
        // Security Gate: Verify targetPath does not point to protected workspace
        // Cổng bảo mật: Xác minh targetPath không trỏ vào không gian làm việc được bảo vệ
        if (targetPath) {
            SandboxPathGuard.assertNotProtectedWorkspace(targetPath);
        }
        // Extract execution, verification, and rollback artifacts
        // Trích xuất các tài liệu thực thi, xác minh và khôi phục
        const executionResult = request.executionResult ?? remediationResponse?.executionResult;
        const verificationResult = request.verificationResult ?? remediationResponse?.verificationResult;
        const rollbackResult = request.rollbackResult ?? remediationResponse?.rollbackResult;
        const provenanceRecord = request.provenanceRecord ?? remediationResponse?.provenanceRecord;
        const primaryHypothesis = decisionPackage?.rankedHypotheses?.[0];
        // 1. Anti-Oscillation / Recurrence Evaluation
        // 1. Đánh giá chống dao động / lặp lại
        const failureCategory = primaryHypothesis?.category ?? 'UNKNOWN';
        const primarySubsystem = primaryHypothesis?.primarySubsystem;
        const oscillationPattern = this.oscillationDetector.recordAndEvaluate({
            incidentId,
            targetId,
            category: failureCategory,
            primarySubsystem,
            timestamp: Date.now(),
        });
        this.logAudit('OSCILLATION_EVALUATED', { id: 'ANTI_OSCILLATION_DETECTOR', role: 'RESILIENCE_ENGINE' }, { id: oscillationPattern.patternId, type: 'OSCILLATION_PATTERN' }, {
            targetId,
            recurrenceCount: oscillationPattern.recurrenceCount,
            isFlapping: oscillationPattern.isFlapping,
            riskLevel: oscillationPattern.riskLevel,
        });
        // 2. Remediation Effectiveness Evaluation
        // 2. Đánh giá hiệu quả khắc phục
        const effectivenessMetrics = this.effectivenessEngine.evaluateEffectiveness({
            executionResult,
            verificationResult,
            rollbackResult,
            preIncidentErrorRate,
            preIncidentLatencyP95Ms,
        });
        this.logAudit('EFFECTIVENESS_EVALUATED', { id: 'REMEDIATION_EFFECTIVENESS_ENGINE', role: 'RESILIENCE_ENGINE' }, { id: incidentId, type: 'INCIDENT' }, {
            recoveryScore: effectivenessMetrics.recoveryScore,
            errorRateImprovement: effectivenessMetrics.errorRateImprovement,
            meanTimeToRecoveryMs: effectivenessMetrics.meanTimeToRecoveryMs,
            verificationOutcome: effectivenessMetrics.verificationOutcome,
        });
        // 3. Hypothesis Accuracy Scoring (if diagnostic hypothesis is available)
        // 3. Chấm điểm độ chính xác giả thuyết (nếu có giả thuyết chẩn đoán)
        let hypothesisAccuracy;
        if (primaryHypothesis) {
            hypothesisAccuracy = this.accuracyScorer.scoreHypothesis({
                hypothesis: primaryHypothesis,
                actionClass: executionResult?.actionClass,
                verificationResult,
                rollbackResult,
                hasContradictoryEvidence,
            });
            this.logAudit('HYPOTHESIS_CALIBRATED', { id: 'HYPOTHESIS_ACCURACY_SCORER', role: 'RESILIENCE_ENGINE' }, { id: primaryHypothesis.hypothesisId, type: 'HYPOTHESIS' }, {
                classification: hypothesisAccuracy.classification,
                calibrationWeight: hypothesisAccuracy.calibrationWeight,
            });
        }
        // 4. Baseline Reconciliation (Safely update baseline if verified)
        // 4. Đối soát đường cơ sở (Cập nhật an toàn đường cơ sở nếu đã xác minh)
        const baselineReconciliation = this.baselineEngine.reconcileBaseline({
            targetId,
            verificationResult,
            rollbackResult,
            isUserStopActive: this.isUserStopActive,
            hasSecurityViolation: false,
            hasContradictoryEvidence,
        });
        this.logAudit('BASELINE_RECONCILED', { id: 'BASELINE_RECONCILIATION_ENGINE', role: 'RESILIENCE_ENGINE' }, { id: baselineReconciliation.reconciliationId, type: 'BASELINE_RECONCILIATION' }, {
            targetId,
            status: baselineReconciliation.status,
        });
        // 5. Incident Closure Determination
        // 5. Xác định trạng thái đóng sự cố
        const forceEscalationReason = oscillationPattern.isFlapping
            ? oscillationPattern.advisoryRecommendation
            : undefined;
        const closureRecord = this.closureEngine.evaluateClosure({
            incidentId,
            remediationPlanId: executionResult?.planId,
            executionId: executionResult?.executionId,
            verificationResult,
            rollbackResult,
            isUserStopActive: this.isUserStopActive,
            forceEscalationReason,
        });
        this.logAudit('INCIDENT_CLOSED', { id: 'INCIDENT_CLOSURE_ENGINE', role: 'RESILIENCE_ENGINE' }, { id: closureRecord.closureId, type: 'INCIDENT_CLOSURE' }, {
            incidentId,
            status: closureRecord.status,
            closureReason: closureRecord.closureReason,
            certificateHash: closureRecord.closureCertificateHash,
        }, closureRecord.status === 'CLOSED_RESOLVED' ? 'PERMIT' : 'DENY', closureRecord.status === 'CLOSED_RESOLVED' ? 'SUCCESS' : 'BLOCKED');
        // 6. Post-Mortem Synthesis
        // 6. Tổng hợp hậu kiểm sự cố
        const postMortemReport = this.postMortemSynthesizer.synthesizePostMortem({
            incidentId,
            targetId,
            evidenceClusterId: decisionPackage?.correlatedEvidence?.clusterId,
            primaryHypothesis,
            hypothesisAccuracy,
            decisionPackageId: decisionPackage?.packageId,
            authorizationTokenReference: provenanceRecord?.tokenId,
            remediationPlanId: executionResult?.planId,
            executionId: executionResult?.executionId,
            verificationSummary: verificationResult?.verificationSummary,
            rollbackOutcome: rollbackResult ? rollbackResult.reason : undefined,
            effectivenessMetrics,
            oscillationSummary: oscillationPattern,
            baselineReconciliation,
            closureRecord,
            upstreamProvenanceHash: provenanceRecord?.provenanceHash,
        });
        this.logAudit('POST_MORTEM_SYNTHESIZED', { id: 'INCIDENT_POST_MORTEM_SYNTHESIZER', role: 'RESILIENCE_ENGINE' }, { id: postMortemReport.reportId, type: 'POST_MORTEM_REPORT' }, {
            incidentId,
            reportHash: postMortemReport.postMortemSha256,
        });
        // 7. Cryptographic Resilience Provenance
        // 7. Nguồn gốc mật mã khả năng phục hồi
        const resilienceProvenance = this.resilienceProvenanceEngine.buildProvenance({
            incidentId,
            closureRecord,
            postMortemReport,
            upstreamRemediationHash: provenanceRecord?.provenanceHash,
        });
        this.logAudit('RESILIENCE_PROVENANCE_SEALED', { id: 'INCIDENT_RESILIENCE_PROVENANCE_ENGINE', role: 'RESILIENCE_ENGINE' }, { id: resilienceProvenance.resilienceProvenanceHash, type: 'PROVENANCE_RECORD' }, {
            incidentId,
            closureId: closureRecord.closureId,
            postMortemId: postMortemReport.reportId,
        });
        return Object.freeze({
            incidentId,
            closureRecord,
            effectivenessMetrics,
            hypothesisAccuracy,
            oscillationPattern,
            baselineReconciliation,
            postMortemReport,
            resilienceProvenance,
        });
    }
    /**
     * Helper to append an immutable event to the canonical AuditLedger.
     * Trợ giúp ghi một sự kiện bất biến vào AuditLedger chuẩn tắc.
     */
    logAudit(toolName, actor, resource, details, policyDecision = 'PERMIT', executionStatus = 'SUCCESS') {
        const rawPayload = JSON.stringify({ toolName, actor, resource, details });
        const argumentsHash = crypto.createHash('sha256').update(rawPayload).digest('hex');
        this.auditLedger.record({
            timestamp: new Date().toISOString(),
            actor: {
                userId: actor.id,
                role: actor.role,
                channel: 'INTERNAL',
            },
            domain: 'INCIDENT_RESILIENCE',
            toolName,
            classification: toolName.includes('VIOLATION') || toolName.includes('USER_STOP') || toolName.includes('ESCALAT')
                ? 'SAFETY'
                : 'OBSERVATION',
            argumentsHash,
            policyDecision,
            executionStatus,
        });
    }
}
