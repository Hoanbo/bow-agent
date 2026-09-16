// src/core/governedPolicyRemediation/DeterministicPolicyRootCauseEngine.ts
// Component 1200: DeterministicPolicyRootCauseEngine (REAL)
//
// Pure graph-based deterministic causal diagnosis engine tracing failures to specific rules,
// deltas, or environmental changes, classifying within a 10-category failure root-cause taxonomy.
// Động cơ chẩn đoán nguyên nhân gốc tiền định dựa trên đồ thị, truy vết các lỗi về các quy tắc,
// delta cụ thể hoặc thay đổi môi trường, phân loại theo hệ thống 10 nhóm nguyên nhân gốc chuẩn.
import { asRootCauseDiagnosisId, computeDiagnosisHash, DeterministicDiagnosisError, EmergencyStopActiveError, CrossTenantAccessForbiddenError, } from './GovernedPolicyRemediationTypes.js';
export class DeterministicPolicyRootCauseEngine {
    emergencyStopProvider;
    constructor(emergencyStopProvider) {
        this.emergencyStopProvider = emergencyStopProvider;
    }
    assertEmergencyStopInactive() {
        if (!this.emergencyStopProvider) {
            throw new EmergencyStopActiveError('Emergency stop provider is missing or undefined (fail-closed)');
        }
        let active;
        try {
            active = this.emergencyStopProvider.isEmergencyStopActive();
        }
        catch (err) {
            throw new EmergencyStopActiveError(`Emergency stop provider threw error: ${err instanceof Error ? err.message : String(err)}`);
        }
        if (typeof active !== 'boolean') {
            throw new EmergencyStopActiveError('Emergency stop provider returned non-boolean value (fail-closed)');
        }
        if (active === true) {
            throw new EmergencyStopActiveError('Emergency stop is currently ACTIVE (fail-closed)');
        }
    }
    /**
     * Detects graph cycles using Depth-First Search with recursion stack tracking.
     */
    detectGraphCycle(nodes) {
        const nodeMap = new Map();
        for (const node of nodes) {
            nodeMap.set(node.nodeId, node);
        }
        const visited = new Set();
        const recStack = new Set();
        const dfs = (nodeId) => {
            visited.add(nodeId);
            recStack.add(nodeId);
            const node = nodeMap.get(nodeId);
            if (node && node.parentNodeIds) {
                for (const parentId of node.parentNodeIds) {
                    if (!visited.has(parentId)) {
                        if (dfs(parentId))
                            return true;
                    }
                    else if (recStack.has(parentId)) {
                        return true; // Cycle detected
                    }
                }
            }
            recStack.delete(nodeId);
            return false;
        };
        for (const node of nodes) {
            if (!visited.has(node.nodeId)) {
                if (dfs(node.nodeId))
                    return true;
            }
        }
        return false;
    }
    diagnoseRootCause(tenantId, policyDomain, context) {
        this.assertEmergencyStopInactive();
        if (!tenantId || tenantId.trim() === '') {
            throw new CrossTenantAccessForbiddenError('Tenant ID must be non-empty and well-formed');
        }
        if (context.envelope.tenantId !== tenantId) {
            throw new CrossTenantAccessForbiddenError(`Cross-tenant envelope injection: expected '${tenantId}', got '${context.envelope.tenantId}'`);
        }
        // 1. Check for Lineage Graph cycles if lineage nodes are provided
        if (context.lineageNodes && context.lineageNodes.length > 0) {
            if (this.detectGraphCycle(context.lineageNodes)) {
                throw new DeterministicDiagnosisError('Lineage DAG cycle detected; causal history is corrupted');
            }
        }
        const evidenceTrail = [];
        let detectedCategory = 'UNKNOWN_ANOMALOUS_MUTATION';
        let confidence = 0.5;
        let diagnosedRuleId;
        let diagnosedParameter;
        // 2. Check Environmental Precondition Collapse
        if (context.environmentTelemetry) {
            const hostHealthy = context.environmentTelemetry.hostHealthy !== false;
            const networkConnected = context.environmentTelemetry.networkConnected !== false;
            const clockSkewMs = typeof context.environmentTelemetry.clockSkewMs === 'number'
                ? context.environmentTelemetry.clockSkewMs
                : 0;
            if (clockSkewMs > 60_000) {
                detectedCategory = 'TEMPORAL_CLOCK_DESYNCHRONIZATION';
                confidence = 0.95;
                evidenceTrail.push(`Detected excessive clock skew: ${clockSkewMs}ms exceeds tolerance threshold 60000ms`);
            }
            else if (!hostHealthy || !networkConnected) {
                detectedCategory = 'ENVIRONMENTAL_PRECONDITION_COLLAPSE';
                confidence = 0.92;
                evidenceTrail.push(`Host or network environment precondition collapsed: hostHealthy=${hostHealthy}, networkConnected=${networkConnected}`);
            }
        }
        // 3. Check violations if category not yet determined by environmental signals
        if (detectedCategory === 'UNKNOWN_ANOMALOUS_MUTATION' && context.violations && context.violations.length > 0) {
            for (const violation of context.violations) {
                const ruleId = violation.evidenceDetails?.ruleId ?? 'rule_general';
                const observedValue = violation.evidenceDetails?.observedValue ?? violation.description;
                evidenceTrail.push(`Violation [${violation.category}] at rule '${ruleId}': ${String(observedValue)}`);
                switch (violation.category) {
                    case 'AUTHORIZATION_VIOLATION':
                        detectedCategory = 'AUTHORIZATION_TOKEN_EXHAUSTION';
                        diagnosedRuleId = ruleId;
                        confidence = 0.90;
                        break;
                    case 'TENANT_BOUNDARY_VIOLATION':
                        detectedCategory = 'TENANT_DOMAIN_MISALLOCATION';
                        diagnosedRuleId = ruleId;
                        confidence = 0.99;
                        break;
                    case 'POLICY_RULE_VIOLATION':
                        if (typeof observedValue === 'string' && observedValue.includes('exceeds')) {
                            detectedCategory = 'PARAMETER_LIMIT_MISMATCH';
                            diagnosedRuleId = ruleId;
                            diagnosedParameter = 'limit';
                            confidence = 0.88;
                        }
                        else {
                            detectedCategory = 'RULE_OVER_RESTRICTION';
                            diagnosedRuleId = ruleId;
                            confidence = 0.85;
                        }
                        break;
                    case 'BEHAVIORAL_DRIFT':
                        detectedCategory = 'BEHAVIORAL_DRIFT_CASCADE';
                        confidence = 0.82;
                        break;
                    case 'LIFECYCLE_STATE_VIOLATION':
                        detectedCategory = 'LIFECYCLE_STATE_TIMING_RACE';
                        confidence = 0.80;
                        break;
                    case 'SAFETY_INTERLOCK_VIOLATION':
                        detectedCategory = 'CROSS_DOMAIN_INVARIANT_CONFLICT';
                        confidence = 0.86;
                        break;
                    default:
                        break;
                }
                if (detectedCategory !== 'UNKNOWN_ANOMALOUS_MUTATION') {
                    break; // Stop at highest priority primary violation
                }
            }
        }
        // 4. Fallback if empty violations or unclassified anomaly
        if (evidenceTrail.length === 0) {
            evidenceTrail.push('No discrete violation records bound; falling back to anomalous anomaly baseline');
            confidence = 0.20;
        }
        const diagnosisId = asRootCauseDiagnosisId(`diag_${tenantId}_${Date.now()}_${Math.random().toString(16).substring(2, 8)}`);
        const diagnosisHash = computeDiagnosisHash({
            correlationId: context.envelope.correlationId,
            tenantId,
            policyDomain,
            primaryCategory: detectedCategory,
            confidence,
            activePolicyHash: context.activePolicyHash,
            causalEvidenceTrail: evidenceTrail,
        });
        return Object.freeze({
            diagnosisId,
            correlationId: context.envelope.correlationId,
            tenantId,
            policyDomain,
            primaryCategory: detectedCategory,
            confidence: Math.max(0.0, Math.min(1.0, confidence)),
            causalEvidenceTrail: Object.freeze([...evidenceTrail]),
            activePolicyHash: context.activePolicyHash,
            diagnosedRuleId,
            diagnosedParameter,
            diagnosedTimestamp: new Date().toISOString(),
            diagnosisHash,
        });
    }
}
