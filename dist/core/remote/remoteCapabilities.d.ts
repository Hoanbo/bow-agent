import type { RemoteCapability, AllowedRemoteCapability, RemoteFailureCode } from './remoteTypes.js';
export interface RemoteCapabilityNegotiationResult {
    readonly success: boolean;
    readonly grantedCapabilities: readonly AllowedRemoteCapability[];
    readonly failureCode?: RemoteFailureCode;
    readonly error?: string;
}
/**
 * EN: Negotiates capabilities between remote peer request and gateway safety policies.
 * VI: Đàm phán quyền năng giữa yêu cầu của máy khách và chính sách an toàn của cổng.
 */
export declare function negotiateRemoteCapabilities(requested: readonly RemoteCapability[]): Readonly<RemoteCapabilityNegotiationResult>;
