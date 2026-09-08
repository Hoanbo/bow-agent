import type { WireFrame, WireHeartbeatStatus } from './wireTypes.js';
export interface WireHeartbeatStats {
    readonly connectionId: string;
    readonly lastPingSentAt: number;
    readonly lastPongReceivedAt: number;
    readonly consecutiveMisses: number;
    readonly lastRttMs: number;
    readonly averageRttMs: number;
    readonly status: WireHeartbeatStatus;
}
export declare class WireHeartbeatCoordinator {
    private readonly degradedMissThreshold;
    private readonly unhealthyMissThreshold;
    private stats;
    constructor(degradedMissThreshold?: number, unhealthyMissThreshold?: number);
    createHeartbeatFrame(connectionId: string, sequence: number): WireFrame;
    createHeartbeatAck(heartbeatFrame: WireFrame, sequence: number): WireFrame;
    recordPingSent(connectionId: string): void;
    recordPongReceived(connectionId: string, originalPingTimestamp?: number): void;
    recordMiss(connectionId: string): void;
    getStatus(connectionId: string): WireHeartbeatStatus;
    getStats(connectionId: string): WireHeartbeatStats;
    remove(connectionId: string): void;
}
