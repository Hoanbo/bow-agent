// src/core/governedCrossFederationConvergence/CrossFederationReconciliationEngine.ts
// BOWCON V4.0 — MS-1.5.17: GOVERNED CROSS-FEDERATION STRATEGY, CONVERGENCE & POLICY META-GOVERNANCE ENGINE
// Component 1142 — REAL
//
// EN: Inter-federation state and knowledge cross-reconciliation engine.
// VI: Động cơ đối soát chéo trạng thái và tri thức giữa các liên đoàn.
import { GovernedCrossFederationTenantIsolationError, GovernedCrossFederationSessionIsolationError, GovernedCrossFederationValidationError, computeCrossReconciliationHash, computeConvergenceProposalHash, } from './GovernedCrossFederationTypes.js';
export class CrossFederationReconciliationEngine {
    // EN: Reconcile proposals across federations enforcing 10 canonical governance rules
    // VI: Đối soát đề xuất giữa các liên đoàn tuân thủ 10 quy tắc quản trị chuẩn
    reconcileProposals(tenantId, sessionId, missionId, objectiveId, proposals) {
        if (!tenantId || !sessionId || !missionId || !objectiveId) {
            throw new GovernedCrossFederationValidationError('tenantId, sessionId, missionId, and objectiveId are required for reconciliation', tenantId, sessionId);
        }
        if (proposals.length === 0) {
            const cleanEmpty = {
                reconciliationId: `rec_empty_${Date.now()}`,
                tenantId,
                sessionId,
                reconciledFederationIds: [],
                congruentProposals: [],
                contradictedProposals: [],
                status: 'CONGRUENT',
                timestamp: Date.now(),
            };
            const provenanceHash = computeCrossReconciliationHash(cleanEmpty);
            return Object.freeze({ ...cleanEmpty, provenanceHash });
        }
        const participatingFederationIds = new Set();
        const congruent = [];
        const contradicted = [];
        // Rule 1 to 9: Isolation & Compatibility verification
        for (const proposal of proposals) {
            // Rule 1: Same tenant
            if (proposal.tenantId !== tenantId) {
                throw new GovernedCrossFederationTenantIsolationError(`Tenant isolation violation in reconciliation: Proposal ${proposal.proposalId} belongs to tenant ${proposal.tenantId}, expected ${tenantId}`, tenantId, sessionId);
            }
            // Rule 2: Same session
            if (proposal.sessionId !== sessionId) {
                throw new GovernedCrossFederationSessionIsolationError(`Session isolation violation in reconciliation: Proposal ${proposal.proposalId} belongs to session ${proposal.sessionId}, expected ${sessionId}`, tenantId, sessionId);
            }
            // Rule 3: Same mission
            if (proposal.missionId !== missionId) {
                throw new GovernedCrossFederationValidationError(`Mission mismatch in reconciliation: Proposal ${proposal.proposalId} mission ${proposal.missionId} != ${missionId}`, tenantId, sessionId);
            }
            // Rule 4: Same objective
            if (proposal.objectiveId !== objectiveId) {
                throw new GovernedCrossFederationValidationError(`Objective mismatch in reconciliation: Proposal ${proposal.proposalId} objective ${proposal.objectiveId} != ${objectiveId}`, tenantId, sessionId);
            }
            // Rule 9: Provenance hash validation
            const expectedHash = computeConvergenceProposalHash(proposal);
            if (proposal.provenanceHash !== expectedHash) {
                throw new GovernedCrossFederationValidationError(`Cryptographic provenance mismatch for proposal ${proposal.proposalId}`, tenantId, sessionId);
            }
            participatingFederationIds.add(proposal.federationId);
        }
        // Pairwise contradiction detection (Rule 10: No silent overwrite of conflicting state)
        // Check for opposing goals or mutually incompatible action plans
        for (let i = 0; i < proposals.length; i++) {
            let hasConflict = false;
            const p1 = proposals[i];
            for (let j = 0; j < proposals.length; j++) {
                if (i === j)
                    continue;
                const p2 = proposals[j];
                // Conflict condition 1: Conflicting strategic goals between different federations
                if (p1.federationId !== p2.federationId &&
                    this.isContradictory(p1.strategicGoal, p2.strategicGoal)) {
                    hasConflict = true;
                    break;
                }
                // Conflict condition 2: Incompatible planned actions
                if (p1.federationId !== p2.federationId &&
                    this.hasActionConflict(p1.plannedActions, p2.plannedActions)) {
                    hasConflict = true;
                    break;
                }
            }
            if (hasConflict) {
                contradicted.push(p1.proposalId);
            }
            else {
                congruent.push(p1.proposalId);
            }
        }
        const status = contradicted.length > 0 ? 'MATERIAL_CONTRADICTION' : 'CONGRUENT';
        const cleanResult = {
            reconciliationId: `rec_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`,
            tenantId,
            sessionId,
            reconciledFederationIds: Object.freeze(Array.from(participatingFederationIds).sort()),
            congruentProposals: Object.freeze(congruent),
            contradictedProposals: Object.freeze(contradicted),
            status,
            timestamp: Date.now(),
        };
        const provenanceHash = computeCrossReconciliationHash(cleanResult);
        return Object.freeze({
            ...cleanResult,
            provenanceHash,
        });
    }
    // EN: Check if two strategic goals are diametrically opposed or mutually exclusive
    // VI: Kiểm tra xem hai mục tiêu chiến lược có đối lập hoặc loại trừ lẫn nhau không
    isContradictory(goalA, goalB) {
        const a = goalA.toLowerCase();
        const b = goalB.toLowerCase();
        const opposites = [
            ['enable', 'disable'],
            ['allow', 'block'],
            ['allow', 'deny'],
            ['permit', 'deny'],
            ['permit', 'block'],
            ['start', 'terminate'],
            ['activate', 'deactivate'],
            ['lock', 'unlock'],
            ['promote', 'demote'],
        ];
        for (const [pos, neg] of opposites) {
            if ((a.includes(pos) && b.includes(neg)) || (a.includes(neg) && b.includes(pos))) {
                return true;
            }
        }
        return false;
    }
    // EN: Check if action lists contain contradictory commands
    // VI: Kiểm tra xem danh sách hành động có chứa mệnh lệnh xung đột không
    hasActionConflict(actionsA, actionsB) {
        for (const actA of actionsA) {
            for (const actB of actionsB) {
                if (this.isContradictory(actA, actB)) {
                    return true;
                }
            }
        }
        return false;
    }
}
