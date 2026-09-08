// src/core/admission/admissionRevocation.ts
// BOWCON V4.0 — ZERO-TRUST ALWAYS-ON BRAIN CONNECTIVITY & SECURE INTERNET ADMISSION RUNTIME (MS-1.3.26)
//
// Authoritative revocation check.
// STRICT INVARIANT: REVOCATION == FAIL_CLOSED.
// Revoked devices MUST be immediately rejected regardless of network or credentials.

export interface RevocationCheckResult {
  readonly revoked: boolean;
  readonly reason?: string;
  readonly revokedAt?: number;
}

export class AdmissionRevocationRegistry {
  private readonly revokedDevices = new Map<string, { reason: string; revokedAt: number }>();
  private readonly revokedKeys = new Map<string, { reason: string; revokedAt: number }>();

  public revokeDevice(deviceId: string, reason: string = 'Administrative Revocation', now: number = Date.now()): void {
    this.revokedDevices.set(deviceId, { reason, revokedAt: now });
  }

  public revokeKey(keyId: string, reason: string = 'Key Compromise / Rotation', now: number = Date.now()): void {
    this.revokedKeys.set(keyId, { reason, revokedAt: now });
  }

  public isDeviceRevoked(deviceId: string): boolean {
    return this.revokedDevices.has(deviceId);
  }

  public getRevocationEntry(deviceId: string): { reason: string; revokedAt: number } | undefined {
    return this.revokedDevices.get(deviceId);
  }

  public checkDeviceRevocation(deviceId: string): RevocationCheckResult {
    const entry = this.revokedDevices.get(deviceId);
    if (entry) {
      return { revoked: true, reason: entry.reason, revokedAt: entry.revokedAt };
    }
    return { revoked: false };
  }

  public isKeyRevoked(keyId: string): boolean {
    return this.revokedKeys.has(keyId);
  }

  public size(): number {
    return this.revokedDevices.size;
  }

  public clear(): void {
    this.revokedDevices.clear();
    this.revokedKeys.clear();
  }
}
