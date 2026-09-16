// src/core/governedPolicyDecisionIngestion/CanonicalStrategicPolicyCompiler.ts
// Component 1172: CanonicalStrategicPolicyCompiler (REAL)
//
// Deterministically compiles policy deltas into normalized, canonical policy representations.
// Guarantees that equivalent semantic inputs produce identical canonical structures and SHA-256 hashes.
// Biên dịch tất cả các thay đổi chính sách (deltas) một cách tất định thành mô hình chính sách chuẩn;
// đảm bảo dữ liệu ngữ nghĩa tương đương luôn sinh ra mã băm SHA-256 hoàn toàn trùng khớp.
import { MAX_CANONICAL_RULES, PolicyCompilationError, computeCanonicalPolicyHash, computeCanonicalPolicyDeltaHash, } from './GovernedPolicyDecisionIngestionTypes.js';
export class CanonicalStrategicPolicyCompiler {
    /**
     * Compile a ratified record and delta set into a CanonicalStrategicPolicy.
     * Biên dịch tập deltas đã được phê chuẩn thành CanonicalStrategicPolicy chuẩn.
     */
    compilePolicy(ratification, deltas, basePolicy) {
        if (!ratification) {
            throw new PolicyCompilationError('Missing ratification record for compilation.');
        }
        if (!Array.isArray(deltas) || deltas.length === 0) {
            throw new PolicyCompilationError('Cannot compile empty deltas array.');
        }
        // 1. Initialize rules from base policy or empty dictionary
        const compiledRules = {};
        if (basePolicy && basePolicy.rules) {
            for (const [key, rule] of Object.entries(basePolicy.rules)) {
                compiledRules[key] = { ...rule };
            }
        }
        // 2. Deterministic Delta Sorting (by fieldPath ascending)
        const sortedDeltas = [...deltas].sort((a, b) => {
            const cmp = a.fieldPath.localeCompare(b.fieldPath);
            if (cmp !== 0)
                return cmp;
            const opA = a.operation || '';
            const opB = b.operation || '';
            return opA.localeCompare(opB);
        });
        // 3. Sequential Deterministic Application
        for (const delta of sortedDeltas) {
            const ruleId = `rule_${delta.fieldPath.replace(/[^a-zA-Z0-9_]/g, '_')}`;
            const op = delta.operation || (delta.proposedValue === null || delta.proposedValue === undefined ? 'DELETE' : 'MODIFY');
            if (op === 'DELETE') {
                delete compiledRules[ruleId];
            }
            else {
                const val = delta.proposedValue;
                let action = 'REQUIRE_HUMAN_APPROVAL';
                if (val === 'ALLOW' || val === 'DENY' || val === 'REQUIRE_HUMAN_APPROVAL') {
                    action = val;
                }
                else if (typeof val === 'object' && val !== null && val.action) {
                    action = val.action;
                }
                compiledRules[ruleId] = {
                    ruleId,
                    fieldPath: delta.fieldPath,
                    action,
                    parameters: typeof val === 'object' && val !== null ? { ...val } : { value: val },
                    riskLevel: delta.riskLevel || 'MEDIUM',
                    immutable: false,
                };
            }
        }
        // 4. Rule Count Ceiling Check
        const ruleCount = Object.keys(compiledRules).length;
        if (ruleCount > MAX_CANONICAL_RULES) {
            throw new PolicyCompilationError(`RULE_LIMIT_EXCEEDED: Compiled policy contains ${ruleCount} rules, exceeding ceiling of ${MAX_CANONICAL_RULES}.`);
        }
        // 5. Build Canonical Policy Structure
        const policyId = `policy_${ratification.tenantId}_${ratification.policyDomain}_v${ratification.policyVersion}`;
        // Intermediate structure to compute hash
        const intermediatePolicy = {
            policyId,
            tenantId: ratification.tenantId,
            policyDomain: ratification.policyDomain,
            policyVersion: ratification.policyVersion,
            parentVersion: ratification.parentVersion,
            rules: Object.freeze(compiledRules),
            metadata: {
                ratificationId: ratification.ratificationId,
                proposalId: ratification.proposalId,
                ratifiedAt: ratification.ratifiedAt,
                provenanceHash: ratification.dossierProvenanceHash,
                policyDeltaHash: computeCanonicalPolicyDeltaHash(deltas),
                canonicalHash: '', // populated below
            },
        };
        const canonicalHash = computeCanonicalPolicyHash(intermediatePolicy);
        intermediatePolicy.metadata.canonicalHash = canonicalHash;
        return Object.freeze(intermediatePolicy);
    }
}
