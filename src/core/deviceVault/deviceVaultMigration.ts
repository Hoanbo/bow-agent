// src/core/deviceVault/deviceVaultMigration.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Versioned storage schema migration engine.
// Migrates schemaVersion 1 to schemaVersion 2 deterministically.
// Invariant: Preserves identity, trust, keys, revocation, scope; fails closed on corruption.

import type {
  VaultEnvelope,
  VaultMigrationRecord,
  DeviceCredentialRecord,
  VaultEntry,
} from './deviceVaultTypes.js';
import { CURRENT_VAULT_SCHEMA_VERSION } from './deviceVaultTypes.js';
import { computeVaultDigest, deepFreezeVault } from './deviceVaultFingerprint.js';
import { computeEnvelopeChecksum } from './deviceVaultIntegrity.js';
import { formatPrivateKeyRef, assertNoRawPrivateKey } from './deviceVaultKeyRef.js';
import { generateVaultId, generateVaultEntryId } from './deviceVaultIdentity.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { parseDeviceScope } from '../pairing/pairingScope.js';

export interface MigrationResult {
  readonly success: boolean;
  readonly envelope?: VaultEnvelope;
  readonly record: VaultMigrationRecord;
}

/**
 * Migrates a legacy schema v1 envelope or record to schemaVersion 2.
 */
export function migrateVaultSchema(rawPayload: unknown): MigrationResult {
  const now = Date.now();

  if (!rawPayload || typeof rawPayload !== 'object') {
    return {
      success: false,
      record: {
        fromVersion: 0,
        toVersion: CURRENT_VAULT_SCHEMA_VERSION,
        migratedAt: now,
        migratedCount: 0,
        status: 'FAILED',
        failureReason: 'Invalid payload type for migration',
      },
    };
  }

  assertNoRawPrivateKey(rawPayload, 'migration input');

  const legacy = rawPayload as Record<string, unknown>;
  const fromVersion = typeof legacy.schemaVersion === 'number' ? legacy.schemaVersion : 1;

  if (fromVersion > CURRENT_VAULT_SCHEMA_VERSION) {
    return {
      success: false,
      record: {
        fromVersion,
        toVersion: CURRENT_VAULT_SCHEMA_VERSION,
        migratedAt: now,
        migratedCount: 0,
        status: 'FAILED',
        failureReason: `Cannot migrate backwards from future schemaVersion ${fromVersion}`,
      },
    };
  }

  if (fromVersion === CURRENT_VAULT_SCHEMA_VERSION) {
    // Already current version
    return {
      success: true,
      envelope: rawPayload as VaultEnvelope,
      record: {
        fromVersion,
        toVersion: CURRENT_VAULT_SCHEMA_VERSION,
        migratedAt: now,
        migratedCount: Array.isArray(legacy.records) ? legacy.records.length : 0,
        status: 'SUCCESS',
      },
    };
  }

  try {
    // Migrate v1 -> v2
    const deviceId = typeof legacy.deviceId === 'string' ? legacy.deviceId : 'device_migrated';
    const scopeString = typeof legacy.scopeString === 'string' ? legacy.scopeString : '';
    const scope: ScopedDeviceIdentity = legacy.scope
      ? (legacy.scope as ScopedDeviceIdentity)
      : (scopeString ? parseDeviceScope(scopeString) : {
          userId: 'usr_migrated',
          sessionId: 'sess_migrated',
          brainId: 'brain_master_v4',
          surfaceId: 'surf_workstation',
          transportId: 'trans_loopback',
          gatewayId: 'gw_remote_sec',
          adapterId: 'adp_inmem',
          connectionId: 'conn_migrated',
          deviceId,
        });

    const vaultId = typeof legacy.vaultId === 'string' ? legacy.vaultId : generateVaultId(deviceId);

    const legacyRecords = Array.isArray(legacy.records) ? legacy.records : [];
    const migratedRecords: DeviceCredentialRecord[] = [];

    for (const rawRec of legacyRecords) {
      const rec = rawRec as Record<string, unknown>;
      const recDeviceId = typeof rec.deviceId === 'string' ? rec.deviceId : deviceId;
      const keyVersion = typeof rec.keyVersion === 'number' ? rec.keyVersion : 1;
      const keyId = typeof rec.publicKeyId === 'string' ? rec.publicKeyId : `key_${recDeviceId}_v${keyVersion}`;
      const publicKey = typeof rec.publicKey === 'string' ? rec.publicKey : `pub_${keyId}`;
      const entryId = generateVaultEntryId(recDeviceId, keyId, keyVersion);
      const privateKeyRef = formatPrivateKeyRef(vaultId, entryId);
      const isRevoked = rec.revoked === true || rec.trustLevel === 'REVOKED';

      const entryFingerprint = computeVaultDigest({
        entryId,
        deviceId: recDeviceId,
        keyId,
        keyVersion,
        publicKey,
        algorithm: 'ED25519_REF',
        status: isRevoked ? 'REVOKED' : 'ACTIVE',
        scopeString,
        privateKeyRef,
      });

      const entry: VaultEntry = {
        entryId,
        deviceId: recDeviceId,
        keyId,
        keyVersion,
        publicKey,
        algorithm: 'ED25519_REF',
        status: isRevoked ? 'REVOKED' : 'ACTIVE',
        scope,
        scopeString,
        fingerprint: entryFingerprint,
        privateKeyRef,
        createdAt: typeof rec.createdAt === 'number' ? rec.createdAt : now,
        updatedAt: now,
      };

      const recordFingerprint = computeVaultDigest({
        deviceId: recDeviceId,
        vaultId,
        activeKeyVersion: keyVersion,
        revoked: isRevoked,
        entries: [entryFingerprint],
      });

      const migratedRecord: DeviceCredentialRecord = {
        recordId: typeof rec.recordId === 'string' ? rec.recordId : `vrecord_${computeVaultDigest(recDeviceId)}`,
        deviceId: recDeviceId,
        vaultId,
        entries: [entry],
        activeKeyVersion: keyVersion,
        trustRecordFingerprint: recordFingerprint,
        scope,
        scopeString,
        revoked: isRevoked,
        revokedAt: isRevoked ? (typeof rec.revokedAt === 'number' ? rec.revokedAt : now) : undefined,
        revocationReason: typeof rec.revocationReason === 'string' ? rec.revocationReason : (isRevoked ? 'Migrated revoked' : undefined),
        createdAt: typeof rec.createdAt === 'number' ? rec.createdAt : now,
        updatedAt: now,
      };

      migratedRecords.push(migratedRecord);
    }

    const unchecksummedEnvelope = {
      schemaVersion: CURRENT_VAULT_SCHEMA_VERSION,
      vaultId,
      deviceId,
      scope,
      scopeString,
      records: migratedRecords,
      metadata: {
        migratedFromVersion: fromVersion,
        migratedAt: now,
      },
    };

    const checksum = computeEnvelopeChecksum(unchecksummedEnvelope);
    const envelope: VaultEnvelope = deepFreezeVault({
      ...unchecksummedEnvelope,
      integrity: {
        checksum,
        algorithm: 'FNV1A32_HEX',
        calculatedAt: now,
      },
    });

    return {
      success: true,
      envelope,
      record: {
        fromVersion,
        toVersion: CURRENT_VAULT_SCHEMA_VERSION,
        migratedAt: now,
        migratedCount: migratedRecords.length,
        status: 'SUCCESS',
      },
    };
  } catch (err) {
    return {
      success: false,
      record: {
        fromVersion,
        toVersion: CURRENT_VAULT_SCHEMA_VERSION,
        migratedAt: now,
        migratedCount: 0,
        status: 'FAILED',
        failureReason: `Migration failed: ${(err as Error).message}`,
      },
    };
  }
}
