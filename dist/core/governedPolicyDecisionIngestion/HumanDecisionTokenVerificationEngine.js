// Component 1170: sole-human cryptographic decision verification.
import { createHmac, timingSafeEqual } from 'crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { dirname, resolve } from 'path';
import { CriticalAffirmationVerificationError, HumanDecisionVerificationError, PolicyIngestionInterlockActiveError, MAX_CRITICAL_TTL_MS, MAX_HANDOFF_TTL_MS, computeHumanDecisionTokenHash } from './GovernedPolicyDecisionIngestionTypes.js';
export class HumanDecisionTokenVerificationEngine {
    consumedNonces = new Set();
    keyProvider;
    isUserStopActiveFn;
    isEmergencyStopActiveFn;
    criticalTtlMs;
    nonceRegistryPath;
    constructor(options) {
        const configuredSecret = options?.signingSecret ?? process.env.BOW_GOVERNANCE_HMAC_SECRET;
        this.keyProvider = options?.keyProvider ?? { resolveKey: (keyId) => keyId === 'bow-gov-sec-v1' ? configuredSecret : undefined };
        this.criticalTtlMs = options?.criticalTtlMs ?? MAX_CRITICAL_TTL_MS;
        if (!Number.isFinite(this.criticalTtlMs) || this.criticalTtlMs <= 0 || this.criticalTtlMs > MAX_HANDOFF_TTL_MS)
            throw new Error('Invalid critical governance TTL configuration');
        this.isUserStopActiveFn = options?.isUserStopActive;
        this.isEmergencyStopActiveFn = options?.isEmergencyStopActive;
        this.nonceRegistryPath = resolve(options?.nonceRegistryPath ?? 'data/governance_nonce_registry.json');
        this.loadNonceRegistry();
    }
    verifyDecisionToken(token, record, dossierProvenanceHash, requirements) {
        if (!token || !record)
            throw new HumanDecisionVerificationError('Missing token or decision record for verification.');
        if (this.hasSecondaryAuthorityClaim(token) || this.hasSecondaryAuthorityClaim(record)) {
            throw new HumanDecisionVerificationError('SECONDARY_HUMAN_AUTHORITY_CLAIM_REJECTED');
        }
        if (this.isUserStopActiveFn?.(record.tenantId))
            throw new PolicyIngestionInterlockActiveError(`USER_STOP_ACTIVE: Verification aborted for tenant '${record.tenantId}'.`);
        const policyDomain = token.policyDomain;
        const proposalId = token.proposalId;
        const dossierId = token.dossierId;
        if (!policyDomain || !proposalId || !dossierId)
            throw new HumanDecisionVerificationError('TOKEN_BINDING_MISSING: token must bind domain, proposal, and dossier.');
        this.assertEmergencyStopInactive(policyDomain);
        if (proposalId !== record.proposalId)
            throw new HumanDecisionVerificationError('TOKEN_RECORD_BINDING_MISMATCH: PROPOSAL_ID_MISMATCH');
        if (dossierId !== record.dossierId)
            throw new HumanDecisionVerificationError('TOKEN_RECORD_BINDING_MISMATCH: DOSSIER_ID_MISMATCH');
        if (token.operatorId !== record.operatorId)
            throw new HumanDecisionVerificationError('TOKEN_RECORD_BINDING_MISMATCH: OPERATOR_ID_MISMATCH');
        if (token.decision !== record.decision)
            throw new HumanDecisionVerificationError('TOKEN_RECORD_BINDING_MISMATCH: DECISION_MISMATCH');
        if (record.provenanceHash !== dossierProvenanceHash)
            throw new HumanDecisionVerificationError('DOSSIER_HASH_MISMATCH');
        if (!/^[a-f0-9]{64}$/i.test(dossierProvenanceHash) || !/^[a-f0-9]{64}$/i.test(token.policyDeltaHash))
            throw new HumanDecisionVerificationError('INVALID_COMMITMENT_HASH');
        if (!token.nonce || !token.keyId || !Number.isFinite(token.timestamp))
            throw new HumanDecisionVerificationError('MALFORMED_TOKEN');
        if (this.isSyntheticIdentity(token.operatorId))
            throw new HumanDecisionVerificationError('AGENT_SELF_APPROVAL_REJECTED');
        const now = Date.now();
        if (token.timestamp > now)
            throw new HumanDecisionVerificationError('FUTURE_TIMESTAMP_REJECTED');
        const critical = requirements?.elevatedSingleHumanAffirmationRequired === true || requirements?.riskLevel === 'CRITICAL';
        const ttl = critical ? this.criticalTtlMs : MAX_HANDOFF_TTL_MS;
        if (now - token.timestamp > ttl || (token.expiresAt && token.expiresAt < now))
            throw new HumanDecisionVerificationError('TOKEN_EXPIRED');
        if (critical && token.decision !== 'APPROVE')
            throw new CriticalAffirmationVerificationError('CRITICAL_APPROVE_REQUIRED');
        const nonceKey = `${record.tenantId}:${token.nonce}`;
        const lockPath = this.acquireNonceLock(nonceKey);
        try {
            // Re-read while holding an exclusive OS lock so separate local processes cannot
            // both validate the same nonce between check and durable consume.
            this.loadNonceRegistry();
            if (this.consumedNonces.has(nonceKey))
                throw new HumanDecisionVerificationError('NONCE_REPLAY_REJECTED');
            const secret = this.keyProvider.resolveKey(token.keyId);
            if (!secret || Buffer.byteLength(secret, 'utf8') !== 32)
                throw new HumanDecisionVerificationError('GOVERNANCE_KEY_UNAVAILABLE');
            if (!/^[a-f0-9]{64}$/i.test(token.operatorSignature))
                throw new HumanDecisionVerificationError('CRYPTOGRAPHIC_SIGNATURE_INVALID');
            const payload = `BOW-GOV-TOKEN-V1:${record.tenantId}:${policyDomain}:${proposalId}:${dossierId}:${dossierProvenanceHash}:${token.policyDeltaHash}:${token.decision}:${token.nonce}:${token.timestamp}:${token.operatorId}:${token.keyId}`;
            const expected = createHmac('sha256', Buffer.from(secret, 'utf8')).update(payload, 'utf8').digest();
            const actual = Buffer.from(token.operatorSignature, 'hex');
            if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
                throw new HumanDecisionVerificationError('CRYPTOGRAPHIC_SIGNATURE_INVALID');
            this.consumedNonces.add(nonceKey);
            this.persistNonceRegistry();
            return Object.freeze({ verified: true, operatorId: token.operatorId, proposalId, dossierProvenanceHash, policyDeltaHash: token.policyDeltaHash, criticalAffirmed: critical, verificationTimestamp: now, tokenHash: computeHumanDecisionTokenHash(token.operatorId, proposalId, dossierProvenanceHash, token.nonce, token.policyDeltaHash) });
        }
        finally {
            try {
                unlinkSync(lockPath);
            }
            catch { /* a failed cleanup remains fail-closed */ }
        }
    }
    isNonceConsumed(nonce, tenantId) { return tenantId ? this.consumedNonces.has(`${tenantId}:${nonce}`) : [...this.consumedNonces].some((value) => value.endsWith(`:${nonce}`)); }
    loadNonceRegistry() {
        if (!existsSync(this.nonceRegistryPath))
            return;
        try {
            const parsed = JSON.parse(readFileSync(this.nonceRegistryPath, 'utf8'));
            if (!Array.isArray(parsed) || !parsed.every((value) => typeof value === 'string'))
                throw new Error('malformed registry');
            for (const value of parsed)
                this.consumedNonces.add(value);
        }
        catch {
            throw new HumanDecisionVerificationError('NONCE_REGISTRY_CORRUPTED');
        }
    }
    persistNonceRegistry() {
        mkdirSync(dirname(this.nonceRegistryPath), { recursive: true });
        const temporaryPath = `${this.nonceRegistryPath}.tmp`;
        writeFileSync(temporaryPath, JSON.stringify([...this.consumedNonces].sort()), { encoding: 'utf8', mode: 0o600 });
        renameSync(temporaryPath, this.nonceRegistryPath);
    }
    acquireNonceLock(nonceKey) {
        const lockPath = `${this.nonceRegistryPath}.${createHash('sha256').update(nonceKey, 'utf8').digest('hex')}.lock`;
        mkdirSync(dirname(lockPath), { recursive: true });
        try {
            const descriptor = openSync(lockPath, 'wx', 0o600);
            closeSync(descriptor);
            return lockPath;
        }
        catch {
            // A stale lock after a crash intentionally prevents reuse until an operator
            // resolves it; availability must not weaken the single-use guarantee.
            throw new HumanDecisionVerificationError('NONCE_CONSUMPTION_LOCK_UNAVAILABLE');
        }
    }
    assertEmergencyStopInactive(policyDomain) {
        if (!this.isEmergencyStopActiveFn)
            throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: verification fails closed.');
        let active;
        try {
            active = this.isEmergencyStopActiveFn(policyDomain);
        }
        catch {
            throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_UNAVAILABLE: verification fails closed.');
        }
        if (typeof active !== 'boolean')
            throw new PolicyIngestionInterlockActiveError('EMERGENCY_STOP_PROVIDER_INVALID: verification fails closed.');
        if (active)
            throw new PolicyIngestionInterlockActiveError(`EMERGENCY_STOP_ACTIVE: Verification aborted for domain '${policyDomain}'.`);
    }
    isSyntheticIdentity(operatorId) {
        if (typeof operatorId !== 'string')
            return true;
        const normalized = operatorId.normalize('NFKC').trim().toLocaleLowerCase('en-US');
        if (!normalized)
            return true;
        const forbidden = ['agent', 'bot', 'synthetic', 'system', 'model', 'assistant', 'autonomous', 'ai'];
        return forbidden.some((term) => normalized === term || normalized.startsWith(`${term}_`) || normalized.startsWith(`${term}-`));
    }
    hasSecondaryAuthorityClaim(value) {
        const explicitlyForbidden = new Set([
            'twoPersonRuleRequired', 'twoPersonVerifierId', 'twoPersonVerifierSignature', 'twoPersonVerifierNonce', 'isTwoPersonVerified',
            'secondaryVerifier', 'secondaryVerifierId', 'secondaryVerifierSignature', 'secondaryVerifierNonce', 'dualCustody',
            'secondHuman', 'secondHumanAuthority', 'additionalHumanAuthority', 'verifierId', 'verifierSignature', 'verifierNonce',
        ].map((field) => field.toLocaleLowerCase('en-US')));
        return Object.keys(value).some((field) => {
            const normalized = field.normalize('NFKC').toLocaleLowerCase('en-US');
            return explicitlyForbidden.has(normalized)
                || /(?:secondary|second|additional).*(?:human|authority|verifier|custody)|(?:human|authority|verifier|custody).*(?:secondary|second|additional)/.test(normalized);
        });
    }
}
