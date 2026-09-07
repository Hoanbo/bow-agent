import type { AllowedRemoteCapability, RemoteAuthorizationContext, PlanRiskLevel } from './remoteTypes.js';
export interface CreateAuthContextParams {
    readonly peerId: string;
    readonly remoteSessionId: string;
    readonly scopeKey: string;
    readonly isAuthenticated: boolean;
    readonly authorizedCapabilities: readonly AllowedRemoteCapability[];
    readonly riskLevel: PlanRiskLevel;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable RemoteAuthorizationContext.
 * VI: Khởi tạo một RemoteAuthorizationContext bất biến.
 */
export declare function createRemoteAuthorizationContext(params: CreateAuthContextParams): Readonly<RemoteAuthorizationContext>;
/**
 * EN: Asserts whether a remote peer is authorized for a specific non-cognitive capability.
 * VI: Khẳng định máy khách từ xa có được phân quyền cho một quyền năng phi nhận thức cụ thể hay không.
 */
export declare function isPeerAuthorizedForCapability(context: Readonly<RemoteAuthorizationContext>, capability: AllowedRemoteCapability): boolean;
/**
 * EN: Validates authorization for a requested capability or throws descriptive error.
 * VI: Xác thực phân quyền cho một quyền năng được yêu cầu hoặc ném lỗi mô tả.
 */
export declare function assertPeerAuthorized(context: Readonly<RemoteAuthorizationContext>, capability: AllowedRemoteCapability): void;
