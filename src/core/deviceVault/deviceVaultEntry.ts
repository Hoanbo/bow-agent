// src/core/deviceVault/deviceVaultEntry.ts
// BOWCON V4.0 — SECURE DEVICE CREDENTIAL VAULT & DURABLE TRUST PERSISTENCE RUNTIME (MS-1.3.25)
//
// Immutable credential entry factory and validation.
// STRICT INVARIANT: Contains opaque `privateKeyRef`, NEVER raw private key material.

import type { VaultEntry, VaultEntryStatus } from './deviceVaultTypes.js';
import type { ScopedDeviceIdentity } from '../pairing/pairingTypes.js';
import { createDeviceScope } from '../pairing/pairingScope.js';
import { computeVaultDigest, deepFreezeVault } from './deviceVaultFingerprint.js';
import { generateVaultEntryId } from './deviceVaultIdentity.js';
import { assertValidPrivateKeyRef, assertNoRawPrivateKey } from './deviceVaultKeyRef.js';

export interface CreateVaultEntryInput {
  readonly deviceId: string;
  readonly keyId: string;
  readonly keyVersion: number;
  readonly publicKey: string;
  readonly algorithm: string;
  readonly status?: VaultEntryStatus;
  readonly scope: ScopedDeviceIdentity;
  readonly privateKeyRef: string;
  readonly timestamp?: number;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

/**
 * Creates an immutable, validated VaultEntry.
 * Fails closed if raw private keys are detected or if privateKeyRef is invalid.
 */
export function createVaultEntry(input: CreateVaultEntryInput): VaultEntry {
  assertNoRawPrivateKey(input, 'createVaultEntry input');
  assertValidPrivateKeyRef(input.privateKeyRef);

  const now = input.timestamp ?? Date.now();
  const scopeString = createDeviceScope(input.scope);
  const entryId = generateVaultEntryId(input.deviceId, input.keyId, input.keyVersion);
  const status = input.status ?? 'ACTIVE';

  const fingerprint = computeVaultDigest({
    entryId,
    deviceId: input.deviceId,
    keyId: input.keyId,
    keyVersion: input.keyVersion,
    publicKey: input.publicKey,
    algorithm: input.algorithm,
    status,
    scopeString,
    privateKeyRef: input.privateKeyRef,
  });

  const entry: VaultEntry = {
    entryId,
    deviceId: input.deviceId,
    keyId: input.keyId,
    keyVersion: input.keyVersion,
    publicKey: input.publicKey,
    algorithm: input.algorithm,
    status,
    scope: { ...input.scope },
    scopeString,
    fingerprint,
    privateKeyRef: input.privateKeyRef,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata ? { ...input.metadata } : undefined,
  };

  return deepFreezeVault(entry);
}

/**
 * Updates the status of an existing VaultEntry, recalculating its fingerprint.
 */
export function updateVaultEntryStatus(
  entry: VaultEntry,
  newStatus: VaultEntryStatus,
  timestamp?: number
): VaultEntry {
  const now = timestamp ?? Date.now();
  const updatedFingerprint = computeVaultDigest({
    entryId: entry.entryId,
    deviceId: entry.deviceId,
    keyId: entry.keyId,
    keyVersion: entry.keyVersion,
    publicKey: entry.publicKey,
    algorithm: entry.algorithm,
    status: newStatus,
    scopeString: entry.scopeString,
    privateKeyRef: entry.privateKeyRef,
  });

  const updated: VaultEntry = {
    ...entry,
    status: newStatus,
    fingerprint: updatedFingerprint,
    updatedAt: now,
  };

  return deepFreezeVault(updated);
}
