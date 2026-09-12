// src/core/policyEvolution/governedPolicyRolloutEngine.ts
// BOWCON V4.0 — MS-1.3.58: GOVERNED OPERATIONAL POLICY EVOLUTION, GUARDRAIL CALIBRATION & COUNTERFACTUAL RESILIENCE VERIFICATION PIPELINE
//
// Governed transactional policy rollout engine.
// Applies human-authorized policy evolution packages transactionally with pre-rollout snapshots,
// single-use cryptographic token consumption, post-mutation verification, and immediate rollback triggers on failure.
// Authority Invariant: Level 2 Controlled Execution — Strictly gated by Master Human Operator authorization.
// Zero autonomous token issuance, zero self-approval.
// Động cơ triển khai chính sách có giao dịch và quản trị.
// Áp dụng các gói tiến hóa chính sách được con người ủy quyền theo cơ chế giao dịch.
import crypto from 'node:crypto';
import { createRolloutId, createEvolutionVersionId, } from './policyEvolutionTypes.js';
import { PolicySnapshotStore } from './policySnapshotStore.js';
import { globalWorldActionAuth } from '../world-action/worldActionAuthorization.js';
export class GovernedPolicyRolloutEngine {
    snapshotStore;
    authEngine;
    constructor(snapshotStore = new PolicySnapshotStore(), authEngine = globalWorldActionAuth) {
        this.snapshotStore = snapshotStore;
        this.authEngine = authEngine;
    }
    /**
     * Applies an authorized policy evolution transactionally.
     * Consumes authorization token atomically to guarantee single-use anti-replay enforcement.
     * Áp dụng tiến hóa chính sách được ủy quyền theo cơ chế giao dịch.
     */
    executeRollout(input) {
        const { proposal, reviewRecord, provenanceSha256, userId } = input;
        // 1. Verify approval state
        if (reviewRecord.decision !== 'APPROVED') {
            throw new Error(`ROLLOUT_REJECTED: Proposal ${proposal.proposalId} was not approved by human reviewer.`);
        }
        // 2. Verify authorization token existence & consume it atomically
        const token = reviewRecord.authorizationToken;
        if (!token || !token.tokenId) {
            throw new Error('ROLLOUT_REJECTED: Missing required AuthorizationToken.');
        }
        // Atomic consumption of authorization token (enforces single-use anti-replay)
        this.authEngine.consumeToken(token.tokenId, `rollout_${proposal.proposalId}`);
        // 3. Retrieve active configuration & verify base version match
        const activeConfig = this.snapshotStore.getActiveConfiguration(userId);
        if (activeConfig.versionId !== proposal.baseVersionId) {
            throw new Error(`VERSION_MISMATCH: Active policy version '${activeConfig.versionId}' does not match proposal baseVersion '${proposal.baseVersionId}'. Rollout blocked.`);
        }
        // 4. Capture pre-change snapshot
        const preRolloutSnapshot = this.snapshotStore.getActiveSnapshot(userId);
        // 5. Apply diff transactionally to generate new configuration
        const diff = proposal.candidatePolicyDiff;
        const newClassifications = {
            ...activeConfig.actionClassifications,
            ...diff.addedClassifications,
            ...diff.modifiedClassifications,
        };
        const newGuardrails = {
            ...activeConfig.guardrails,
            ...diff.modifiedGuardrails,
            allowAutonomousDegradation: false,
        };
        const newVersionNumber = Date.now();
        const newVersionId = createEvolutionVersionId(`v_${newVersionNumber}_evolved`);
        const payload = JSON.stringify({
            versionId: newVersionId,
            classifications: newClassifications,
            guardrails: newGuardrails,
            provenance: provenanceSha256,
        });
        const checksum = crypto.createHash('sha256').update(payload).digest('hex');
        const newConfig = {
            versionId: newVersionId,
            actionClassifications: Object.freeze(newClassifications),
            guardrails: Object.freeze(newGuardrails),
            activeSince: Date.now(),
            checksum,
        };
        // 6. Post-mutation structural verification
        const verificationOutcome = this.verifyConfigIntegrity(newConfig);
        if (!verificationOutcome) {
            throw new Error('POST_VERIFICATION_FAILED: Resulting policy configuration failed structural integrity verification.');
        }
        // 7. Commit new snapshot to durable store
        this.snapshotStore.commitSnapshot(newConfig, userId);
        const rolloutId = createRolloutId(`rollout_${Date.now()}_${newVersionId.slice(-8)}`);
        const rolloutRecord = {
            rolloutId,
            proposalId: proposal.proposalId,
            fromVersionId: activeConfig.versionId,
            toVersionId: newVersionId,
            preRolloutSnapshotId: preRolloutSnapshot.snapshotId,
            verificationOutcome: true,
            appliedAt: Date.now(),
        };
        return {
            rolloutRecord: Object.freeze(rolloutRecord),
            updatedConfiguration: newConfig,
        };
    }
    /**
     * Structural integrity verification of a policy configuration.
     * Xác minh tính toàn vẹn cấu trúc của cấu hình chính sách.
     */
    verifyConfigIntegrity(config) {
        if (!config || !config.versionId || !config.checksum)
            return false;
        if (!config.actionClassifications || typeof config.actionClassifications !== 'object')
            return false;
        // Verify hard forbidden barriers exist and remain FORBIDDEN
        if (config.actionClassifications['transfer_funds'] !== 'FORBIDDEN')
            return false;
        if (config.actionClassifications['delete_database'] !== 'FORBIDDEN')
            return false;
        return true;
    }
}
