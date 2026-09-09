// src/core/delegation/federatedDeviceRegistry.ts
// BOWCON V4.0 — MS-1.3.45: FEDERATED DEVICE IDENTITY & TRUST REGISTRY
//
// INVARIANTS:
// - DEVICE_ID != MASTER_OWNER_ID
// - DEVICE_TRUST != EXECUTION_AUTHORITY
// - No device may create an alternative authority root.
// - Devices are bounded to Master Owner governance.

import {
  MASTER_OWNER_ID,
  AUTHORIZED_MASTER_OWNER_ALIASES,
  isMasterOwner,
  type FederatedDeviceIdentity,
  type DeviceTrustState,
} from './delegationTypes.js';

export class FederatedDeviceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'FederatedDeviceError';
  }
}

export interface RegisterDeviceInput {
  deviceId: string;
  ownerId?: string;
  platform?: string;
  hostMode?: string;
  capabilitiesSummary?: readonly string[];
}

export class FederatedDeviceRegistry {
  private devices = new Map<string, FederatedDeviceIdentity>();

  /**
   * Registers a device in the federation registry.
   */
  public registerDevice(input: RegisterDeviceInput): FederatedDeviceIdentity {
    const rawId = input.deviceId.trim();
    const normalized = rawId.toLowerCase();

    // Invariant: DEVICE_ID != MASTER_OWNER_ID
    if (
      normalized === MASTER_OWNER_ID.toLowerCase() ||
      AUTHORIZED_MASTER_OWNER_ALIASES.some((alias) => alias.toLowerCase() === normalized) ||
      isMasterOwner(rawId)
    ) {
      throw new FederatedDeviceError(
        'FORBIDDEN_OWNER_DEVICE_IMPERSONATION',
        `Device cannot be registered with Master Owner identity: "${rawId}". DEVICE != MASTER_OWNER.`
      );
    }

    if (this.devices.has(rawId)) {
      throw new FederatedDeviceError(
        'DEVICE_ALREADY_REGISTERED',
        `Device "${rawId}" is already registered in federation registry.`
      );
    }

    const device: FederatedDeviceIdentity = {
      deviceId: rawId,
      ownerId: input.ownerId?.trim() || MASTER_OWNER_ID,
      platform: input.platform || 'unknown',
      hostMode: input.hostMode || 'UNKNOWN',
      trustState: 'REGISTERED',
      capabilitiesSummary: input.capabilitiesSummary ? [...input.capabilitiesSummary] : [],
      lastSeenAt: Date.now(),
      federationStatus: 'ACTIVE',
      isMasterOwner: false,
    };

    this.devices.set(rawId, device);
    return device;
  }

  /**
   * Updates trust state of a federated device.
   * INVARIANT: Promoting to TRUSTED requires Master Owner authority.
   */
  public setTrustState(
    deviceId: string,
    newState: DeviceTrustState,
    actorId: string
  ): FederatedDeviceIdentity {
    const device = this.devices.get(deviceId);
    if (!device) {
      throw new FederatedDeviceError(
        'DEVICE_NOT_FOUND',
        `Device "${deviceId}" not found in federation registry.`
      );
    }

    if (newState === 'TRUSTED' && !isMasterOwner(actorId)) {
      throw new FederatedDeviceError(
        'UNAUTHORIZED_DEVICE_TRUST',
        `Actor "${actorId}" cannot promote device "${deviceId}" to TRUSTED. Only Master Owner authority can grant trust.`
      );
    }

    const updated: FederatedDeviceIdentity = {
      ...device,
      trustState: newState,
      lastSeenAt: Date.now(),
      federationStatus: newState === 'REVOKED' || newState === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
    };

    this.devices.set(deviceId, updated);
    return updated;
  }

  public getDevice(deviceId: string): FederatedDeviceIdentity | undefined {
    return this.devices.get(deviceId);
  }

  public hasDevice(deviceId: string): boolean {
    return this.devices.has(deviceId);
  }

  public isDeviceTrusted(deviceId: string): boolean {
    const device = this.devices.get(deviceId);
    return device?.trustState === 'TRUSTED';
  }

  public clear(): void {
    this.devices.clear();
  }
}

export const globalFederatedDeviceRegistry = new FederatedDeviceRegistry();
