export interface RevocationCheckResult {
    readonly revoked: boolean;
    readonly reason?: string;
    readonly revokedAt?: number;
}
export declare class AdmissionRevocationRegistry {
    private readonly revokedDevices;
    private readonly revokedKeys;
    revokeDevice(deviceId: string, reason?: string, now?: number): void;
    revokeKey(keyId: string, reason?: string, now?: number): void;
    isDeviceRevoked(deviceId: string): boolean;
    getRevocationEntry(deviceId: string): {
        reason: string;
        revokedAt: number;
    } | undefined;
    checkDeviceRevocation(deviceId: string): RevocationCheckResult;
    isKeyRevoked(keyId: string): boolean;
    size(): number;
    clear(): void;
}
