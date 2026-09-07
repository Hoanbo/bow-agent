import type { RemoteGatewayIdentity, RemotePeerIdentity, RemoteHandshake, RemoteHandshakeResult, RemoteRequest, RemoteResponse, RemoteGatewayContract } from './remoteTypes.js';
import type { RemoteSessionSnapshot } from './remoteSession.js';
import type { RemoteAuditRecord } from './remoteAudit.js';
export interface RemoteGatewayOptions {
    readonly name?: string;
    readonly version?: string;
    readonly maxCapacity?: number;
}
export declare class RemoteGateway implements RemoteGatewayContract {
    readonly identity: Readonly<RemoteGatewayIdentity>;
    readonly gatewayId: string;
    private readonly maxCapacity;
    private readonly peers;
    private readonly sessions;
    private readonly requestsById;
    private readonly requestsBySessionSeq;
    private readonly audits;
    constructor(options?: RemoteGatewayOptions);
    /**
     * EN: Registers an external remote peer identity.
     * VI: Đăng ký một định danh máy khách từ xa bên ngoài.
     */
    registerPeer(peer: Readonly<RemotePeerIdentity>): Promise<{
        success: boolean;
        peerId: string;
        error?: string;
    }>;
    /**
     * EN: Retrieves registered peer identity by peerId.
     * VI: Lấy định danh máy khách đã đăng ký theo peerId.
     */
    getPeer(peerId: string): Readonly<RemotePeerIdentity> | undefined;
    /**
     * EN: Handles pure-data handshake negotiation with an incoming peer.
     * VI: Xử lý đàm phán bắt tay thuần dữ liệu với máy khách đến.
     */
    handleHandshake(handshake: Readonly<RemoteHandshake>): Promise<Readonly<RemoteHandshakeResult>>;
    /**
     * EN: Handles an incoming protocol request from a remote peer.
     * Enforces session active check, rate limit, replay protection, sequence ordering, and authorization.
     *
     * VI: Xử lý yêu cầu giao thức đến từ một máy khách từ xa.
     * Thực thi kiểm tra phiên hoạt động, giới hạn tốc độ, chống phát lại, thứ tự chuỗi và phân quyền.
     */
    handleRequest(request: Readonly<RemoteRequest>): Promise<Readonly<RemoteResponse>>;
    /**
     * EN: Retrieves remote session snapshot by remoteSessionId.
     * VI: Lấy snapshot phiên từ xa theo remoteSessionId.
     */
    getSession(remoteSessionId: string): Readonly<RemoteSessionSnapshot> | undefined;
    /**
     * EN: Retrieves all registered remote sessions.
     * VI: Lấy tất cả các phiên làm việc từ xa đã đăng ký.
     */
    getActiveSessions(): ReadonlyArray<Readonly<RemoteSessionSnapshot>>;
    /**
     * EN: Disconnects a remote session cleanly without shutting down the Brain.
     * VI: Ngắt kết nối phiên từ xa một cách sạch sẽ mà không làm tắt Não bộ.
     */
    disconnectSession(remoteSessionId: string, reason?: string): boolean;
    /**
     * EN: Reconnects an existing remote session preserving sequence and continuity.
     * VI: Kết nối lại một phiên từ xa hiện có bảo toàn số thứ tự và tính liên tục.
     */
    reconnectSession(remoteSessionId: string, lastAckSequence: number): {
        success: boolean;
        session?: Readonly<RemoteSessionSnapshot>;
        error?: string;
    };
    /**
     * EN: Returns immutable audit records.
     * VI: Trả về danh sách bản ghi kiểm tra bất biến.
     */
    getAuditRecords(): ReadonlyArray<Readonly<RemoteAuditRecord>>;
    private recordAudit;
}
