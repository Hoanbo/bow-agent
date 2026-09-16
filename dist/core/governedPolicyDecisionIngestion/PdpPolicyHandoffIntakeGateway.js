// src/core/governedPolicyDecisionIngestion/PdpPolicyHandoffIntakeGateway.ts
// Component 1169: PdpPolicyHandoffIntakeGateway (REAL)
//
// Ingests, validates, and admits non-authoritative PdpPolicyHandoffPackage records from MS-1.5.19.
// Defends against replay, expired handoffs, malformed schemas, and tenant crossing.
// Tiếp nhận, xác thực và ghi nhận gói bàn giao chính sách phi thẩm quyền từ MS-1.5.19;
// bảo vệ chống phát lại (replay), hết hạn, sai cấu trúc và vượt ranh giới tenant.
import { MAX_HANDOFFS_IN_FLIGHT, MAX_DELTAS_PER_PROPOSAL, MAX_POLICY_SIZE_BYTES, MAX_HANDOFF_TTL_MS, PolicyHandoffSchemaValidationError, PolicyHandoffReplayError, PolicyTenantIsolationError, PolicyIngestionInterlockActiveError, computeHandoffIntakeHash, computeCanonicalPolicyDeltaHash, } from './GovernedPolicyDecisionIngestionTypes.js';
export class PdpPolicyHandoffIntakeGateway {
    // In-memory replay & consumption tracking
    consumedHandoffIds = new Set();
    consumedProposalIds = new Set();
    inFlightHandoffs = new Map(); // tenantId -> count
    validatedIntakeRecords = new Map();
    // Interlock providers
    isUserStopActiveFn;
    isEmergencyStopActiveFn;
    constructor(options) {
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.isEmergencyStopActiveFn = options?.isEmergencyStopActive;
    }
    /**
     * Validate and admit an incoming PdpPolicyHandoffPackage from MS-1.5.19.
     * Xác thực và tiếp nhận gói PdpPolicyHandoffPackage gửi từ MS-1.5.19.
     */
    ingestHandoff(handoff, callingTenantContext) {
        // 0. Base Object Validation
        if (!handoff || typeof handoff !== 'object') {
            throw new PolicyHandoffSchemaValidationError('Malformed handoff package: expected non-null object.');
        }
        // 1. Interlock Check (USER_STOP / EMERGENCY_STOP)
        this.assertInterlocksInactive(handoff.tenantId, handoff.policyDomain);
        // 2. Tenant Context Binding
        if (callingTenantContext && callingTenantContext !== handoff.tenantId) {
            throw new PolicyTenantIsolationError(`TENANT_MISMATCH: Calling tenant '${callingTenantContext}' does not match handoff tenant '${handoff.tenantId}'.`);
        }
        // 3. Schema Completeness & Sanitization
        this.validateHandoffSchema(handoff);
        // 4. Non-Authoritative Invariant Verification
        // MS-1.5.20 receives non-authoritative packages; handoff must explicitly state isAuthoritativePolicy === false
        if (handoff.isAuthoritativePolicy !== false) {
            throw new PolicyHandoffSchemaValidationError('AUTHORITY_ELEVATION_REJECTED: Handoff package must declare isAuthoritativePolicy: false.');
        }
        if (handoff.humanApprovalCertified !== true) {
            throw new PolicyHandoffSchemaValidationError('HUMAN_APPROVAL_UNCERTIFIED: Handoff package must have humanApprovalCertified: true.');
        }
        // 5. Replay Defense
        if (this.consumedHandoffIds.has(handoff.handoffId)) {
            throw new PolicyHandoffReplayError(`REPLAY_REJECTED: Handoff ID '${handoff.handoffId}' has already been consumed and cannot be re-ingested.`);
        }
        if (this.consumedProposalIds.has(handoff.proposalId)) {
            throw new PolicyHandoffReplayError(`REPLAY_REJECTED: Proposal ID '${handoff.proposalId}' has already been ingested in this lifecycle epoch.`);
        }
        // 6. In-Flight Concurrency Ceiling
        const currentInFlight = this.inFlightHandoffs.get(handoff.tenantId) || 0;
        if (currentInFlight >= MAX_HANDOFFS_IN_FLIGHT) {
            throw new PolicyHandoffSchemaValidationError(`CONCURRENCY_LIMIT_EXCEEDED: Tenant '${handoff.tenantId}' has reached the maximum of ${MAX_HANDOFFS_IN_FLIGHT} in-flight handoffs.`);
        }
        // 7. Compute deterministic intake hash and record validated intake
        const intakeId = `intake_${handoff.handoffId}_${Date.now()}`;
        const intakeHash = computeHandoffIntakeHash(handoff);
        const record = {
            intakeId,
            handoffId: handoff.handoffId,
            proposalId: handoff.proposalId,
            dossierId: handoff.dossierId,
            tenantId: handoff.tenantId,
            policyDomain: handoff.policyDomain,
            deltasCount: handoff.proposedChanges.length,
            dossierProvenanceHash: handoff.dossierProvenanceHash,
            policyDeltaHash: handoff.policyDeltaHash,
            intakeHash,
            receivedAt: Date.now(),
            lifecycleStatus: 'INTAKE_VALIDATED',
        };
        // Mark as consumed & in-flight
        this.consumedHandoffIds.add(handoff.handoffId);
        this.consumedProposalIds.add(handoff.proposalId);
        this.inFlightHandoffs.set(handoff.tenantId, currentInFlight + 1);
        this.validatedIntakeRecords.set(intakeId, record);
        return Object.freeze(record);
    }
    /**
     * Release in-flight counter once ratification or rejection completes.
     */
    releaseInFlight(tenantId) {
        const current = this.inFlightHandoffs.get(tenantId) || 0;
        if (current > 0) {
            this.inFlightHandoffs.set(tenantId, current - 1);
        }
    }
    getIntakeRecord(intakeId) {
        return this.validatedIntakeRecords.get(intakeId);
    }
    isConsumed(handoffId) {
        return this.consumedHandoffIds.has(handoffId);
    }
    // --- Private Validation Subroutines ---
    validateHandoffSchema(handoff) {
        if (!handoff || typeof handoff !== 'object') {
            throw new PolicyHandoffSchemaValidationError('Malformed handoff package: expected non-null object.');
        }
        if (!handoff.handoffId || typeof handoff.handoffId !== 'string' || handoff.handoffId.trim().length === 0) {
            throw new PolicyHandoffSchemaValidationError('Invalid handoffId: must be a non-empty string.');
        }
        if (!handoff.proposalId || typeof handoff.proposalId !== 'string' || handoff.proposalId.trim().length === 0) {
            throw new PolicyHandoffSchemaValidationError('Invalid proposalId: must be a non-empty string.');
        }
        if (!handoff.dossierId || typeof handoff.dossierId !== 'string' || handoff.dossierId.trim().length === 0) {
            throw new PolicyHandoffSchemaValidationError('Invalid dossierId: must be a non-empty string.');
        }
        // Tenant ID validation & Windows reserved path defense
        this.assertValidTenantId(handoff.tenantId);
        if (!handoff.policyDomain || typeof handoff.policyDomain !== 'string') {
            throw new PolicyHandoffSchemaValidationError('Invalid policyDomain: must be a valid domain string.');
        }
        // Timestamp & Freshness
        const now = Date.now();
        if (typeof handoff.packagedAt !== 'number' || isNaN(handoff.packagedAt)) {
            throw new PolicyHandoffSchemaValidationError('Invalid packagedAt: must be a valid epoch timestamp.');
        }
        if (handoff.packagedAt > now + 5000) {
            throw new PolicyHandoffSchemaValidationError('CLOCK_SKEW_REJECTED: packagedAt is in the future.');
        }
        if (now - handoff.packagedAt > MAX_HANDOFF_TTL_MS) {
            throw new PolicyHandoffSchemaValidationError(`EXPIRED_HANDOFF: Handoff was packaged ${now - handoff.packagedAt}ms ago, exceeding TTL of ${MAX_HANDOFF_TTL_MS}ms.`);
        }
        // Provenance Hash Format
        if (!handoff.dossierProvenanceHash || !/^[a-f0-9]{64}$/i.test(handoff.dossierProvenanceHash)) {
            throw new PolicyHandoffSchemaValidationError('INVALID_PROVENANCE_HASH: dossierProvenanceHash must be a 64-character hex string.');
        }
        if (!handoff.policyDeltaHash || !/^[a-f0-9]{64}$/i.test(handoff.policyDeltaHash)) {
            throw new PolicyHandoffSchemaValidationError('INVALID_POLICY_DELTA_HASH: policyDeltaHash must be a 64-character hex string.');
        }
        // Delta Limits & Content
        if (!Array.isArray(handoff.proposedChanges) || handoff.proposedChanges.length === 0) {
            throw new PolicyHandoffSchemaValidationError('EMPTY_DELTAS: proposedChanges must contain at least 1 policy delta.');
        }
        if (handoff.proposedChanges.length > MAX_DELTAS_PER_PROPOSAL) {
            throw new PolicyHandoffSchemaValidationError(`DELTA_LIMIT_EXCEEDED: proposedChanges contains ${handoff.proposedChanges.length} deltas (max ${MAX_DELTAS_PER_PROPOSAL}).`);
        }
        // Payload Size Ceiling
        const serializedSize = Buffer.byteLength(JSON.stringify(handoff), 'utf8');
        if (serializedSize > MAX_POLICY_SIZE_BYTES) {
            throw new PolicyHandoffSchemaValidationError(`PAYLOAD_CEILING_EXCEEDED: Handoff size ${serializedSize} bytes exceeds maximum ${MAX_POLICY_SIZE_BYTES} bytes.`);
        }
        // Validate each delta structure
        for (const delta of handoff.proposedChanges) {
            if (!delta.fieldPath || typeof delta.fieldPath !== 'string') {
                throw new PolicyHandoffSchemaValidationError('Invalid delta: fieldPath must be a non-empty string.');
            }
            // Scrub prompt injection markers from rationales
            if (delta.rationale && typeof delta.rationale === 'string') {
                const lower = delta.rationale.toLowerCase();
                if (lower.includes('ignore all previous instructions') || lower.includes('system prompt:') || lower.includes('<script>')) {
                    throw new PolicyHandoffSchemaValidationError('ADVERSARIAL_PAYLOAD_DETECTED: Prompt injection markers in delta rationale.');
                }
            }
        }
        if (computeCanonicalPolicyDeltaHash(handoff.proposedChanges) !== handoff.policyDeltaHash) {
            throw new PolicyHandoffSchemaValidationError('TOCTOU_HASH_MISMATCH: canonical PolicyDelta commitment does not match handoff.');
        }
    }
    assertValidTenantId(tenantId) {
        if (!tenantId || typeof tenantId !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(tenantId)) {
            throw new PolicyTenantIsolationError(`INVALID_TENANT_ID: Tenant ID '${tenantId}' must be 1-64 alphanumeric, underscore, or hyphen characters.`);
        }
        // Windows reserved device names
        const upper = tenantId.toUpperCase();
        const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'LPT1', 'LPT2', 'LPT3'];
        if (reserved.includes(upper)) {
            throw new PolicyTenantIsolationError(`RESERVED_DEVICE_NAME_BLOCKED: Tenant ID '${tenantId}' is a reserved OS device name.`);
        }
    }
    assertInterlocksInactive(tenantId, domain) {
        if (this.isUserStopActiveFn && this.isUserStopActiveFn(tenantId)) {
            throw new PolicyIngestionInterlockActiveError(`USER_STOP_ACTIVE: Operations suspended by USER_STOP supremacy for tenant '${tenantId}'.`);
        }
        if (!this.isEmergencyStopActiveFn) {
            throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: intake fails closed.');
        }
        let emergencyStopActive;
        try {
            emergencyStopActive = this.isEmergencyStopActiveFn(domain);
        }
        catch {
            throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: intake fails closed.');
        }
        if (typeof emergencyStopActive !== 'boolean') {
            throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_INVALID: intake fails closed.');
        }
        if (emergencyStopActive) {
            throw new PolicyIngestionInterlockActiveError(`EMERGENCY_STOP_ACTIVE: Domain kill switch engaged for domain '${domain || 'global'}'.`);
        }
    }
}
