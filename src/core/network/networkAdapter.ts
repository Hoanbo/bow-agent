// src/core/network/networkAdapter.ts
// BOWCON V4.0 — MILESTONE 1.3.21: AUTHORITATIVE NETWORK ADAPTER CONTRACT
//
// EN:
// Authoritative NetworkAdapter interface and base contract.
// Connects physical/logical network layers to the BOWCON architecture without cognitive authority.
// STRICTLY PROHIBITED from calling ToolRegistry, ToolExecutor, PDP, CommitService, or LLM.
//
// VI:
// Giao diện và hợp đồng cơ sở NetworkAdapter có thẩm quyền.
// Kết nối các tầng mạng vật lý/logic vào kiến trúc BOWCON mà không nắm giữ thẩm quyền nhận thức.
// NGHIÊM CẤM gọi ToolRegistry, ToolExecutor, PDP, CommitService hay LLM.

import type {
  NetworkAdapterType,
  ScopedNetworkIdentity,
  NetworkFrame,
  NetworkOperationResult,
} from './networkTypes.js';
import type { NetworkAdapterState } from './networkStates.js';
import type { NetworkConnectionSnapshot } from './networkConnection.js';

export interface NetworkAdapterMetrics {
  readonly totalSent: number;
  readonly totalReceived: number;
  readonly activeConnections: number;
}

/**
 * EN: The authoritative contract for all network adapters (in-memory, local, LAN, future remote).
 * VI: Hợp đồng có thẩm quyền cho toàn bộ các bộ điều hợp mạng.
 */
export interface NetworkAdapter {
  readonly adapterId: string;
  readonly adapterType: NetworkAdapterType;

  /**
   * EN: Returns current adapter lifecycle state.
   * VI: Trả về trạng thái vòng đời adapter hiện tại.
   */
  getState(): NetworkAdapterState;

  /**
   * EN: Opens a new network connection bound to a 7-tuple scope.
   * VI: Mở một kết nối mạng mới được ràng buộc vào phạm vi bộ 7.
   */
  open(scope: ScopedNetworkIdentity): Promise<Readonly<NetworkConnectionSnapshot>>;

  /**
   * EN: Closes an existing connection.
   * VI: Đóng một kết nối hiện có.
   */
  close(connectionId: string, reason?: string): Promise<void>;

  /**
   * EN: Sends a validated network frame through this adapter.
   * VI: Gửi một khung mạng đã xác thực qua adapter này.
   */
  send(frame: Readonly<NetworkFrame>): Promise<Readonly<NetworkOperationResult>>;

  /**
   * EN: Receives the next available frame for a connection (if buffered).
   * VI: Tiếp nhận khung khả dụng tiếp theo cho một kết nối (nếu có đệm).
   */
  receive(connectionId: string): Promise<Readonly<NetworkFrame> | undefined>;

  /**
   * EN: Retrieves an active connection snapshot by ID.
   * VI: Lấy snapshot kết nối đang hoạt động theo ID.
   */
  getConnection(connectionId: string): Readonly<NetworkConnectionSnapshot> | undefined;

  /**
   * EN: Returns current adapter health evaluation.
   * VI: Trả về đánh giá sức khỏe hiện tại của adapter.
   */
  getHealth(): 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';

  /**
   * EN: Returns runtime traffic metrics.
   * VI: Trả về chỉ số lưu lượng runtime.
   */
  getMetrics(): Readonly<NetworkAdapterMetrics>;
}
