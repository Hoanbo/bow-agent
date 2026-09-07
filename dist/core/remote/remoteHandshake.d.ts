import type { RemoteHandshake, RemoteHandshakeResult, RemoteGatewayIdentity, ScopedRemoteIdentity, RemoteCapability, PlanRiskLevel } from './remoteTypes.js';
export interface CreateRemoteHandshakeParams {
    readonly gatewayId: string;
    readonly peerId: string;
    readonly scope: ScopedRemoteIdentity;
    readonly protocolVersion: string;
    readonly requestedCapabilities: readonly RemoteCapability[];
    readonly riskLevel: PlanRiskLevel;
    readonly authToken?: string;
    readonly governanceMetadata?: Readonly<Record<string, unknown>>;
    readonly continuityMetadata?: Readonly<Record<string, unknown>>;
    readonly timestamp?: number;
}
/**
 * EN: Creates an immutable, validated RemoteHandshake request.
 * VI: Khởi tạo một yêu cầu RemoteHandshake bất biến, đã được xác thực.
 */
export declare function createRemoteHandshake(params: CreateRemoteHandshakeParams): Readonly<RemoteHandshake>;
/**
 * EN: Evaluates a handshake against gateway identity and security policies.
 * Strictly rejects any forbidden cognitive/execution capabilities.
 *
 * VI: Đánh giá bắt tay so với danh tính cổng và chính sách bảo mật.
 * Nghiêm ngặt từ chối mọi quyền năng nhận thức/thực thi bị cấm.
 */
export declare function evaluateRemoteHandshake(handshake: Readonly<RemoteHandshake>, gateway: Readonly<RemoteGatewayIdentity>, timestamp?: number): Readonly<RemoteHandshakeResult>;
