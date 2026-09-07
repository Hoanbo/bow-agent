import type { NetworkFrame, NetworkDirection } from './networkTypes.js';
export interface CreateNetworkFrameParams {
    readonly protocolVersion?: string;
    readonly networkConnectionId: string;
    readonly gatewayId: string;
    readonly transportId: string;
    readonly surfaceId: string;
    readonly sequence: number;
    readonly direction: NetworkDirection;
    readonly messageType: string;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly createdState?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly timestamp?: number;
}
/**
 * EN: Constructs an authoritative immutable NetworkFrame.
 * VI: Khởi tạo một NetworkFrame bất biến có thẩm quyền.
 */
export declare function createNetworkFrame(params: CreateNetworkFrameParams): Readonly<NetworkFrame>;
/**
 * EN: Validates frame integrity, checksum matching, and structure.
 * VI: Xác thực tính toàn vẹn của khung, khớp checksum và cấu trúc.
 */
export declare function validateNetworkFrame(frame: unknown): boolean;
/**
 * EN: Asserts valid network frame or throws descriptive error.
 * VI: Khẳng định khung mạng hợp lệ hoặc ném lỗi mô tả.
 */
export declare function assertValidNetworkFrame(frame: unknown): asserts frame is Readonly<NetworkFrame>;
