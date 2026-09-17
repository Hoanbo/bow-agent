// src/core/governedPolicyDistribution/NodePolicyAttestationVerifier.ts
// Component 1222: NodePolicyAttestationVerifier
//
// Deterministic receipt and proof verification with strict nonce replay protection and tenant binding.
import * as fs from 'fs';
import * as path from 'path';
import { assertValidIdentifier, assertValidDomain, assertEmergencyStopInactive, computePepBindingHash, computeReceiptProofPayload, hmacSha256, timingSafeEqualHex, canonicalJson, DistributionTenantIsolationError, DistributionAttestationVerificationError, DistributionNonceReplayError, DistributionLockTimeoutError, DistributionPersistenceCorruptionError, } from './GovernedPolicyDistributionTypes.js';
export class NodePolicyAttestationVerifier {
    keyResolver;
    baseStorageDir;
    registry;
    auditLedger;
    emergencyStopProvider;
    constructor(keyResolverOrOptions, baseStorageDir, registry, auditLedger, emergencyStopProvider) {
        if ('keyResolver' in keyResolverOrOptions) {
            this.keyResolver = keyResolverOrOptions.keyResolver;
            this.baseStorageDir = keyResolverOrOptions.baseStorageDir || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
            this.registry = keyResolverOrOptions.registry;
            this.auditLedger = keyResolverOrOptions.auditLedger;
            this.emergencyStopProvider = keyResolverOrOptions.emergencyStopProvider;
        }
        else {
            this.keyResolver = keyResolverOrOptions;
            this.baseStorageDir = baseStorageDir || path.resolve(process.cwd(), 'data', 'partitions_policy_distribution');
            this.registry = registry;
            this.auditLedger = auditLedger;
            this.emergencyStopProvider = emergencyStopProvider;
        }
    }
    getPartitionDir(tenantId, domain) {
        assertValidIdentifier(tenantId, 'tenantId');
        assertValidDomain(domain);
        return path.join(this.baseStorageDir, tenantId, domain);
    }
    getNoncesFilePath(tenantId, domain) {
        return path.join(this.getPartitionDir(tenantId, domain), 'nonces.json');
    }
    async acquireLock(filePath, timeoutMs = 5000) {
        const lockPath = `${filePath}.lock`;
        const start = Date.now();
        const pollInterval = 50;
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        while (Date.now() - start < timeoutMs) {
            try {
                const fd = fs.openSync(lockPath, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_RDWR);
                fs.closeSync(fd);
                return () => {
                    try {
                        if (fs.existsSync(lockPath)) {
                            fs.unlinkSync(lockPath);
                        }
                    }
                    catch {
                        // Ignore unlock error
                    }
                };
            }
            catch (err) {
                if (err.code === 'EEXIST') {
                    await new Promise(r => setTimeout(r, pollInterval));
                }
                else {
                    throw new DistributionPersistenceCorruptionError(`Failed to acquire lock: ${err.message}`);
                }
            }
        }
        throw new DistributionLockTimeoutError(`Timeout waiting for lock on ${filePath}`);
    }
    loadNoncesUnderLock(filePath) {
        if (!fs.existsSync(filePath)) {
            return {};
        }
        try {
            const raw = fs.readFileSync(filePath, 'utf-8');
            if (!raw.trim())
                return {};
            return JSON.parse(raw);
        }
        catch (err) {
            throw new DistributionPersistenceCorruptionError(`Failed to load nonces file: ${err.message}`);
        }
    }
    saveNoncesUnderLock(filePath, nonces) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const tmpPath = `${filePath}.tmp`;
        const serialized = canonicalJson(nonces);
        try {
            const fd = fs.openSync(tmpPath, 'w');
            fs.writeFileSync(fd, serialized, 'utf-8');
            fs.fsyncSync(fd);
            fs.closeSync(fd);
            fs.renameSync(tmpPath, filePath);
        }
        catch (err) {
            try {
                if (fs.existsSync(tmpPath))
                    fs.unlinkSync(tmpPath);
            }
            catch {
                // Ignore tmp cleanup error
            }
            throw new DistributionPersistenceCorruptionError(`Failed to save nonces file: ${err.message}`);
        }
    }
    /**
     * Verifies a NodePolicyAttestationReceipt.
     */
    async verifyReceipt(receipt, manifest, nowMs) {
        assertEmergencyStopInactive(this.emergencyStopProvider);
        // 1. Tenant and domain isolation
        assertValidIdentifier(receipt.tenantId, 'tenantId');
        assertValidIdentifier(receipt.federationId, 'federationId');
        assertValidIdentifier(receipt.nodeId, 'nodeId');
        assertValidDomain(receipt.policyDomain);
        if (receipt.tenantId !== manifest.tenantId || receipt.policyDomain !== manifest.policyDomain) {
            throw new DistributionTenantIsolationError(`Cross-tenant or domain mismatch: receipt tenant/domain ${receipt.tenantId}/${receipt.policyDomain} != manifest ${manifest.tenantId}/${manifest.policyDomain}`);
        }
        if (receipt.federationId !== manifest.federationId ||
            receipt.manifestId !== manifest.manifestId) {
            throw new DistributionAttestationVerificationError('Receipt binding mismatch with manifest');
        }
        // Node staleness check (Section 4: A node is stale if nowMs - lastHeartbeatAt > 15000. Stale node cannot supply a fresh receipt)
        if (this.registry) {
            const node = this.registry.getNode(receipt.tenantId, receipt.federationId, receipt.policyDomain, receipt.nodeId);
            if (node && (nowMs - node.lastHeartbeatAt > 15000)) {
                throw new DistributionAttestationVerificationError(`Stale node heartbeat: cannot supply fresh receipt (${nowMs - node.lastHeartbeatAt}ms > 15000ms)`);
            }
        }
        // 2. Hash & Fingerprint verification
        if (receipt.manifestFingerprint !== manifest.manifestFingerprint) {
            throw new DistributionAttestationVerificationError('Manifest fingerprint mismatch in receipt');
        }
        if (receipt.canonicalPolicyHash !== manifest.canonicalPolicyHash) {
            throw new DistributionAttestationVerificationError('Canonical policy hash mismatch in receipt');
        }
        if (receipt.policyVersion !== manifest.policyVersion) {
            throw new DistributionAttestationVerificationError('Policy version mismatch in receipt');
        }
        if (receipt.epoch !== manifest.targetEpoch) {
            throw new DistributionAttestationVerificationError('Epoch mismatch in receipt');
        }
        if (receipt.distributionNonce !== manifest.distributionNonce) {
            throw new DistributionAttestationVerificationError('Distribution nonce mismatch in receipt');
        }
        // 3. PEP binding claim verification
        const expectedPepHash = computePepBindingHash({
            nodeId: receipt.nodeId,
            tenantId: receipt.tenantId,
            federationId: receipt.federationId,
            policyDomain: receipt.policyDomain,
            manifestId: receipt.manifestId,
            canonicalPolicyHash: receipt.canonicalPolicyHash,
            policyVersion: receipt.policyVersion,
            epoch: receipt.epoch,
        });
        if (receipt.pepBindingHash !== expectedPepHash) {
            throw new DistributionAttestationVerificationError('PEP binding claim hash mismatch');
        }
        // 4. Freshness check: [issuedAt - 5000, min(expiresAt, nowMs + 5000)]
        const minTimestamp = manifest.issuedAt - 5000;
        const maxTimestamp = Math.min(manifest.expiresAt, nowMs + 5000);
        if (receipt.timestamp < minTimestamp || receipt.timestamp > maxTimestamp) {
            throw new DistributionAttestationVerificationError(`Receipt timestamp ${receipt.timestamp} outside valid window [${minTimestamp}, ${maxTimestamp}]`);
        }
        // 5. Nonce replay defense under lock
        const noncesFilePath = this.getNoncesFilePath(receipt.tenantId, receipt.policyDomain);
        const unlock = await this.acquireLock(noncesFilePath);
        try {
            const nonces = this.loadNoncesUnderLock(noncesFilePath);
            const receiptNonceKey = `${receipt.nodeId}:${receipt.receiptNonce}`;
            const sessionNonceKey = `${receipt.nodeId}:${receipt.manifestId}:${receipt.status}`;
            if (nonces[receiptNonceKey]) {
                if (this.auditLedger) {
                    await this.auditLedger.append({
                        eventType: 'NONCE_REPLAY_REJECTED',
                        tenantId: receipt.tenantId,
                        policyDomain: receipt.policyDomain,
                        actorSource: `NODE:${receipt.nodeId}`,
                        data: {
                            attestationId: receipt.attestationId,
                            receiptNonce: receipt.receiptNonce,
                            status: receipt.status,
                        },
                    }, nowMs);
                }
                throw new DistributionNonceReplayError(`Nonce replay detected for node ${receipt.nodeId}`);
            }
            // 6. Cryptographic signature/HMAC verification
            let key;
            try {
                key = this.keyResolver.resolve(receipt.tenantId, receipt.federationId, receipt.nodeId, receipt.keyId);
            }
            catch (err) {
                throw new DistributionAttestationVerificationError(`Key resolution error: ${err.message}`);
            }
            if (!key) {
                throw new DistributionAttestationVerificationError(`Unknown keyId: ${receipt.keyId}`);
            }
            const proofPayload = computeReceiptProofPayload(receipt);
            const expectedProof = hmacSha256(key, proofPayload);
            if (!timingSafeEqualHex(receipt.proof, expectedProof)) {
                if (this.auditLedger) {
                    await this.auditLedger.append({
                        eventType: 'RECEIPT_REJECTED',
                        tenantId: receipt.tenantId,
                        policyDomain: receipt.policyDomain,
                        actorSource: `NODE:${receipt.nodeId}`,
                        data: {
                            attestationId: receipt.attestationId,
                            reason: 'HMAC_PROOF_MISMATCH',
                        },
                    }, nowMs);
                }
                throw new DistributionAttestationVerificationError('Invalid receipt HMAC proof');
            }
            // 7. Consume nonces and persist
            nonces[receiptNonceKey] = nowMs;
            nonces[sessionNonceKey] = nowMs;
            this.saveNoncesUnderLock(noncesFilePath, nonces);
            // 8. Update registry status
            if (this.registry) {
                const nextStatus = receipt.status === 'COMMITTED' ? 'IN_SYNC' : 'PREPARED';
                await this.registry.updateNodeSyncStatus(receipt.tenantId, receipt.federationId, receipt.policyDomain, receipt.nodeId, nextStatus, nowMs, receipt.epoch, receipt.policyVersion, receipt.canonicalPolicyHash);
            }
            // 9. Audit log
            if (this.auditLedger) {
                await this.auditLedger.append({
                    eventType: 'RECEIPT_ACCEPTED',
                    tenantId: receipt.tenantId,
                    policyDomain: receipt.policyDomain,
                    actorSource: `NODE:${receipt.nodeId}`,
                    data: {
                        attestationId: receipt.attestationId,
                        nodeId: receipt.nodeId,
                        manifestId: receipt.manifestId,
                        status: receipt.status,
                        epoch: receipt.epoch,
                        policyVersion: receipt.policyVersion,
                        timestamp: receipt.timestamp,
                    },
                }, nowMs);
            }
            return {
                receipt: Object.freeze(receipt),
                verifiedAt: nowMs,
            };
        }
        finally {
            unlock();
        }
    }
}
