import type { WireFrame, WireFrameType } from './wireTypes.js';
export declare const MAX_WIRE_FRAME_SIZE = 1048576;
export declare function computeWireFrameChecksum(payload: string): string;
export declare function createWireFrame(options: {
    frameId?: string;
    frameType: WireFrameType;
    sequence: number;
    payload: string;
    timestamp?: number;
}): WireFrame;
export declare function serializeWireFrame(frame: WireFrame): string;
export declare function deserializeWireFrame(raw: string): WireFrame;
export declare function validateWireFrame(frame: WireFrame): void;
