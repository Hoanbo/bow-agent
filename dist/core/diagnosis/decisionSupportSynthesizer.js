// src/core/diagnosis/decisionSupportSynthesizer.ts
// BOWCON V4.0 — MS-1.3.54: GOVERNED AUTONOMOUS SELF-DIAGNOSIS, INCIDENT CLASSIFICATION & SUPERVISOR DECISION-SUPPORT SYNTHESIS
//
// Supervisor Decision-Support Package Synthesizer.
// Assembles correlated evidence, ranked hypotheses, dissenting views, and inert remediation recommendations
// into an immutable, cryptographically verifiable decision package for human supervisor evaluation.
// Bộ tổng hợp gói hỗ trợ quyết định giám sát viên.
// Lắp ráp bằng chứng tương quan, các giả thuyết đã xếp hạng, các quan điểm bất đồng và các khuyến nghị khắc phục trơ
// thành một gói quyết định bất biến, có thể xác minh bằng mật mã để người giám sát đánh giá.
//
// STRICT INVARIANTS / CÁC BẤT BIẾN NGHIÊM NGẶT:
// - DECISION_PACKAGE != OWNER_DECISION: Package is strictly advisory and awaiting human decision.
// - ZERO AUTONOMOUS REMEDIATION: Proposed actions are inert DTOs with isAutomatedExecutionPermitted: false.
// - IMMUTABLE BOUNDARY: autonomousExecutionBoundary === 'STRICT_NO_AUTONOMOUS_EXECUTION_ENFORCED'.
// - CONFIDENCE_UNCERTAINTY_SUM: aggregateConfidence + aggregateUncertainty === 1.0.
//
// Bilingual Comment Rule (Rule 1):
// All explanatory comments must provide English and Vietnamese explanations.
// Quy tắc chú thích song ngữ (Quy tắc 1):
// Tất cả các chú thích giải thích phải cung cấp phần tiếng Anh và tiếng Việt.
import crypto from 'node:crypto';
import { createDecisionPackageId } from './diagnosisTypes.js';
import { globalDiagnosisSanitizer } from './diagnosisSanitizer.js';
import { globalDiagnosisProvenanceEngine } from './diagnosisProvenanceEngine.js';
export class DecisionSupportSynthesizer {
    /**
     * Synthesizes the complete, immutable Supervisor Decision-Support Package.
     * Tổng hợp gói hỗ trợ quyết định giám sát viên đầy đủ, bất biến.
     */
    synthesize(input) {
        const ts = input.timestamp ?? Date.now();
        const dissenting = input.dissentingViews ?? [];
        // Calculate aggregate confidence and uncertainty
        // If dissenting views exist, aggregate confidence is capped at <= 0.40
        let aggregateConfidence = 0.50;
        if (input.hypotheses.length > 0) {
            aggregateConfidence = input.hypotheses[0].confidenceScore;
        }
        if (dissenting.length > 0) {
            aggregateConfidence = Math.min(0.40, aggregateConfidence);
        }
        aggregateConfidence = Number(Math.max(0.05, Math.min(0.95, aggregateConfidence)).toFixed(4));
        const aggregateUncertainty = Number((1.0 - aggregateConfidence).toFixed(4));
        // Formulate inert proposed remediation actions based on hypotheses & severity
        const { recommendedActions, alternativeActions } = this.generateRemediationActions(input.hypotheses, input.classification);
        // Formulate impact assessment
        const impactAssessment = this.buildImpactAssessment(input.hypotheses, input.classification);
        // Formulate required decision type
        let requiredDecisionType = 'APPROVAL_REQUIRED';
        if (input.classification.severity === 'CRITICAL' || dissenting.length > 0) {
            requiredDecisionType = 'APPROVAL_REQUIRED';
        }
        else if (input.classification.severity === 'INFORMATIONAL' || input.classification.severity === 'LOW') {
            requiredDecisionType = 'ADVISORY_ACKNOWLEDGMENT';
        }
        else {
            requiredDecisionType = 'APPROVAL_REQUIRED';
        }
        const packageId = createDecisionPackageId(`pkg_${input.classification.incidentId}_${crypto.randomBytes(4).toString('hex')}`);
        // Compute evidenceHash and packageHash
        const evidenceHash = input.cluster.clusterHash;
        const packageHash = globalDiagnosisProvenanceEngine.computePackageHash({
            incidentId: input.classification.incidentId,
            evidenceHash,
            hypotheses: input.hypotheses,
            severity: input.classification.severity,
            timestamp: ts,
        });
        // Compute provenance signature
        const provenanceRecord = globalDiagnosisProvenanceEngine.buildProvenance({
            packageId,
            incidentId: input.classification.incidentId,
            sessionId: input.cluster.sessionId,
            evidenceCluster: input.cluster,
            hypotheses: input.hypotheses,
            telemetrySampleHashes: input.telemetrySampleHashes,
            invariantEvidenceHashes: input.invariantEvidenceHashes,
            driftEvidenceHashes: input.driftEvidenceHashes,
            alertFingerprints: input.alertFingerprints,
            parentProvenanceHash: input.parentProvenanceHash,
            timestamp: ts,
        });
        const autonomousExecutionBoundary = 'STRICT_NO_AUTONOMOUS_EXECUTION_ENFORCED';
        const decisionPackage = {
            packageId,
            incidentId: input.classification.incidentId,
            sessionId: input.cluster.sessionId,
            timestamp: ts,
            severity: input.classification.severity,
            blastRadius: input.classification.blastRadius,
            currentHealth: input.currentHealth,
            correlatedEvidence: input.cluster,
            rankedHypotheses: input.hypotheses,
            dissentingViews: Object.freeze([...dissenting]),
            aggregateConfidence,
            aggregateUncertainty,
            impactAssessment,
            recommendedActions: Object.freeze(recommendedActions),
            alternativeActions: Object.freeze(alternativeActions),
            evidenceHash,
            packageHash,
            provenanceSignature: provenanceRecord.signature,
            requiredDecisionType,
            autonomousExecutionBoundary,
            toJSON() {
                return globalDiagnosisSanitizer.sanitize({
                    packageId: this.packageId,
                    incidentId: this.incidentId,
                    sessionId: this.sessionId,
                    timestamp: this.timestamp,
                    severity: this.severity,
                    blastRadius: this.blastRadius,
                    currentHealth: this.currentHealth,
                    aggregateConfidence: this.aggregateConfidence,
                    aggregateUncertainty: this.aggregateUncertainty,
                    primaryHypothesis: this.rankedHypotheses.length > 0 ? this.rankedHypotheses[0] : null,
                    allHypothesesCount: this.rankedHypotheses.length,
                    dissentingViewsCount: this.dissentingViews.length,
                    impactAssessment: this.impactAssessment,
                    recommendedActions: this.recommendedActions,
                    alternativeActions: this.alternativeActions,
                    evidenceHash: this.evidenceHash,
                    packageHash: this.packageHash,
                    provenanceSignature: this.provenanceSignature,
                    requiredDecisionType: this.requiredDecisionType,
                    autonomousExecutionBoundary: this.autonomousExecutionBoundary,
                });
            },
            toMarkdownSummary() {
                const lines = [];
                lines.push(`# SUPERVISOR DECISION-SUPPORT PACKAGE`);
                lines.push(`**Package ID:** \`${this.packageId}\` | **Incident ID:** \`${this.incidentId}\``);
                lines.push(`**Severity:** **${this.severity}** | **Blast Radius:** \`${this.blastRadius}\` | **Health:** \`${this.currentHealth}\``);
                lines.push(`**Confidence:** ${(this.aggregateConfidence * 100).toFixed(1)}% | **Uncertainty:** ${(this.aggregateUncertainty * 100).toFixed(1)}%`);
                lines.push(`**Boundary:** \`${this.autonomousExecutionBoundary}\`\n`);
                lines.push(`## 1. Ranked Root-Cause Hypotheses`);
                if (this.rankedHypotheses.length === 0) {
                    lines.push(`_No specific failure hypothesis formulated._`);
                }
                else {
                    for (let i = 0; i < this.rankedHypotheses.length; i++) {
                        const h = this.rankedHypotheses[i];
                        lines.push(`### ${i + 1}. [${h.category}] ${h.title} ${h.isPrimary ? '(PRIMARY)' : '(ALTERNATIVE)'}`);
                        lines.push(`- **Description:** ${h.description}`);
                        lines.push(`- **Subsystem:** \`${h.primarySubsystem}\``);
                        lines.push(`- **Confidence:** ${(h.confidenceScore * 100).toFixed(1)}% | **Uncertainty:** ${(h.uncertaintyScore * 100).toFixed(1)}%`);
                        lines.push(`- **Supporting Evidence:** ${h.supportingEvidenceIds.join(', ') || 'None'}`);
                    }
                }
                if (this.dissentingViews.length > 0) {
                    lines.push(`\n## 2. Dissenting Viewpoints (Anti-Majority Voting Preserved)`);
                    for (const d of this.dissentingViews) {
                        lines.push(`- **Agent:** \`${d.agentId}\` | **Asserted:** ${d.assertedCause}`);
                        lines.push(`  - **Reasoning:** ${d.reasoning}`);
                        lines.push(`  - **Confidence:** ${(d.confidenceScore * 100).toFixed(1)}%`);
                    }
                }
                lines.push(`\n## 3. Recommended Remediation Options (Human Review Only)`);
                for (const action of this.recommendedActions) {
                    lines.push(`### Option: ${action.title} [Risk: ${action.riskLevel} (${action.riskScore}/10)]`);
                    lines.push(`- **Type:** \`${action.remediationType}\``);
                    lines.push(`- **Description:** ${action.description}`);
                    lines.push(`- **Suggested Operator Commands:**`);
                    for (const cmd of action.suggestedCommands) {
                        lines.push(`  \`\`\`bash\n  ${cmd}\n  \`\`\``);
                    }
                    lines.push(`- **Automated Execution Permitted:** ${action.isAutomatedExecutionPermitted ? 'YES' : 'NO'}`);
                    lines.push(`- **Requires Human Approval:** ${action.requiresHumanApproval ? 'YES' : 'NO'}`);
                }
                lines.push(`\n## 4. Cryptographic Provenance`);
                lines.push(`- **Evidence Hash:** \`${this.evidenceHash}\``);
                lines.push(`- **Package Hash:** \`${this.packageHash}\``);
                lines.push(`- **Provenance Signature:** \`${this.provenanceSignature}\``);
                return lines.join('\n');
            },
        };
        return Object.freeze(decisionPackage);
    }
    generateRemediationActions(hypotheses, classification) {
        const recommended = [];
        const alternative = [];
        const primaryCategory = hypotheses.length > 0 ? hypotheses[0].category : 'UNKNOWN_PATTERN';
        switch (primaryCategory) {
            case 'UNAUTHORIZED_MUTATION':
                recommended.push(this.buildAction({
                    actionId: 'act_restore_manifest',
                    title: 'Verify Filesystem Integrity & Rollback Unauthorized Files',
                    description: 'Inspect modified filesystem paths against signed release manifest and restore canonical checksums.',
                    remediationType: 'ROLLBACK_RECOMMENDATION',
                    riskLevel: 'HIGH',
                    riskScore: 8,
                    estimatedBlastRadius: 'SUBSYSTEM',
                    suggestedCommands: ['git status', 'git checkout -- .', 'npm run verify:manifest'],
                }));
                break;
            case 'CANARY_REGRESSION':
                recommended.push(this.buildAction({
                    actionId: 'act_drain_canary',
                    title: 'Halt Canary Traffic & Rollback Deployment Ring',
                    description: 'Drain canary traffic back to baseline ring and restore previous stable deployment version.',
                    remediationType: 'ROLLBACK_RECOMMENDATION',
                    riskLevel: 'MEDIUM',
                    riskScore: 6,
                    estimatedBlastRadius: 'SUBSYSTEM',
                    suggestedCommands: ['node ./scripts/rollback_canary.mjs --target ring_0'],
                }));
                break;
            case 'RESOURCE_EXHAUSTION':
                recommended.push(this.buildAction({
                    actionId: 'act_restart_worker',
                    title: 'Restart Exhausted Worker Process & Flush Cache',
                    description: 'Perform a graceful rolling restart of degraded worker instances to clear memory starvation.',
                    remediationType: 'SERVICE_RESTART',
                    riskLevel: 'LOW',
                    riskScore: 4,
                    estimatedBlastRadius: 'COMPONENT',
                    suggestedCommands: ['systemctl restart bow-worker', 'redis-cli flushdb'],
                }));
                break;
            case 'CONFIGURATION_DRIFT':
                recommended.push(this.buildAction({
                    actionId: 'act_reapply_config',
                    title: 'Reapply Canonical Release Configuration',
                    description: 'Overhaul drifted configuration variables with canonical deployment parameters.',
                    remediationType: 'CONFIG_CORRECTION',
                    riskLevel: 'LOW',
                    riskScore: 3,
                    estimatedBlastRadius: 'COMPONENT',
                    suggestedCommands: ['node ./scripts/sync_config.mjs --verify'],
                }));
                break;
            default:
                recommended.push(this.buildAction({
                    actionId: 'act_manual_inspect',
                    title: 'Manual Operator Diagnostic Inspection',
                    description: 'Inspect detailed telemetry logs and execute synthetic probe diagnostics before taking corrective action.',
                    remediationType: 'MANUAL_INSPECTION',
                    riskLevel: 'LOW',
                    riskScore: 1,
                    estimatedBlastRadius: 'COMPONENT',
                    suggestedCommands: ['npm run probe:inspect', 'node ./scratch/check_health.mjs'],
                }));
                break;
        }
        // Secondary fallback action
        alternative.push(this.buildAction({
            actionId: 'act_drain_and_isolate',
            title: 'Drain Traffic & Isolate Target for Forensic Analysis',
            description: 'Shift traffic to healthy redundant instances and preserve degraded instance for post-mortem analysis.',
            remediationType: 'TRAFFIC_DRAIN',
            riskLevel: 'MEDIUM',
            riskScore: 5,
            estimatedBlastRadius: 'SUBSYSTEM',
            suggestedCommands: ['node ./scripts/traffic_drain.mjs --isolate'],
        }));
        return { recommendedActions: recommended, alternativeActions: alternative };
    }
    buildAction(args) {
        return {
            actionId: args.actionId,
            title: args.title,
            description: args.description,
            remediationType: args.remediationType,
            riskLevel: args.riskLevel,
            riskScore: args.riskScore,
            estimatedBlastRadius: args.estimatedBlastRadius,
            suggestedCommands: Object.freeze([...args.suggestedCommands]),
            requiresHumanApproval: true,
            isAutomatedExecutionPermitted: false,
        };
    }
    buildImpactAssessment(hypotheses, classification) {
        const affected = new Set();
        for (const h of hypotheses) {
            affected.add(h.primarySubsystem);
        }
        const isCritical = classification.severity === 'CRITICAL';
        const isHigh = classification.severity === 'HIGH';
        return {
            affectedSubsystems: Object.freeze(Array.from(affected)),
            userFacingImpact: isCritical || isHigh,
            slaBreached: isCritical,
            cascadeRisk: isCritical ? 'HIGH' : isHigh ? 'MEDIUM' : 'NONE',
        };
    }
}
export const globalDecisionSupportSynthesizer = new DecisionSupportSynthesizer();
