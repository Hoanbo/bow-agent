import type { NetworkFrame } from './networkTypes.js';
export interface NetworkCodecOptions {
    readonly maxRawSizeBytes?: number;
}
export declare class NetworkCodec {
    private readonly maxRawSizeBytes;
    constructor(options?: NetworkCodecOptions);
    /**
     * EN: Encodes a NetworkFrame into a deterministic JSON string.
     * VI: Mã hóa một NetworkFrame thành chuỗi JSON tất định.
     */
    encode(frame: Readonly<NetworkFrame>): string;
    /**
     * EN: Decodes a raw string into an immutable, validated NetworkFrame.
     * VI: Giải mã một chuỗi thô thành một NetworkFrame bất biến đã được xác thực.
     */
    decode(raw: string): Readonly<NetworkFrame>;
    /**
     * EN: Validates encoded raw string without throwing.
     * VI: Xác thực chuỗi thô đã mã hóa mà không ném lỗi.
     */
    validateEncodedFrame(raw: string): boolean;
    /**
     * EN: Validates a decoded frame in memory.
     * VI: Xác thực một khung đã giải mã trong bộ nhớ.
     */
    validateDecodedFrame(frame: Readonly<NetworkFrame>): boolean;
}
