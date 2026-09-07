import type { ScopedNetworkIdentity } from './networkTypes.js';
import type { NetworkAdapter } from './networkAdapter.js';
import type { NetworkConnectionSnapshot } from './networkConnection.js';
export declare class NetworkRegistry {
    private readonly adapters;
    private readonly connections;
    private readonly connectionsByScopeKey;
    private readonly surfaceToConnection;
    /**
     * EN: Registers an adapter instance.
     * VI: Đăng ký một thực thể adapter.
     */
    registerAdapter(adapter: NetworkAdapter): void;
    /**
     * EN: Retrieves an adapter by ID.
     * VI: Lấy adapter theo ID.
     */
    getAdapter(adapterId: string): NetworkAdapter | undefined;
    /**
     * EN: Registers a new active connection snapshot under 7-tuple scope.
     * VI: Đăng ký một snapshot kết nối hoạt động mới dưới phạm vi bộ 7.
     */
    registerConnection(snapshot: Readonly<NetworkConnectionSnapshot>): void;
    /**
     * EN: Retrieves a connection by its connection ID, validating that the requesting scope matches.
     * VI: Lấy kết nối theo ID kết nối, xác thực rằng phạm vi yêu cầu phải khớp.
     */
    getConnection(connectionId: string, requestingScope?: ScopedNetworkIdentity): Readonly<NetworkConnectionSnapshot> | undefined;
    /**
     * EN: Retrieves connection ID by surface ID, validating requesting userId and brainId.
     * VI: Lấy ID kết nối theo ID bề mặt, xác thực userId và brainId yêu cầu.
     */
    getConnectionBySurface(surfaceId: string, requestingUserId?: string, requestingBrainId?: string): Readonly<NetworkConnectionSnapshot> | undefined;
    /**
     * EN: Removes a connection from the registry.
     * VI: Xóa một kết nối khỏi sổ đăng ký.
     */
    unregisterConnection(connectionId: string): void;
    /**
     * EN: Returns all active registered adapters.
     * VI: Trả về tất cả các adapter đang hoạt động đã đăng ký.
     */
    listAdapters(): readonly NetworkAdapter[];
    /**
     * EN: Returns total count of active connections.
     * VI: Trả về tổng số lượng kết nối đang hoạt động.
     */
    getActiveConnectionCount(): number;
    /**
     * EN: Clears all entries from the registry.
     * VI: Xóa toàn bộ mục khỏi sổ đăng ký.
     */
    clear(): void;
}
