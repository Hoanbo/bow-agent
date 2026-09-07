import type { ScopedConnectionIdentity, ConnectionDirection, ConnectionChannel, ConnectionMessageType } from './connectionTypes.js';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export declare const RISK_LEVEL_PRECEDENCE: Readonly<Record<RiskLevel, number>>;
export declare const MAX_CONNECTION_PAYLOAD_BYTES: number;
export declare const MAX_CORRELATION_DEPTH = 10;
export interface ConnectionMessageRisk {
    readonly level: RiskLevel;
    readonly reason?: string;
}
export interface ConnectionMessage {
    readonly messageId: string;
    readonly scope: string;
    readonly scopeIdentity: ScopedConnectionIdentity;
    readonly channel: ConnectionChannel;
    readonly direction: ConnectionDirection;
    readonly sequence: number;
    readonly messageType: ConnectionMessageType;
    readonly correlationId?: string;
    readonly causationId?: string;
    readonly payload: Readonly<Record<string, unknown>>;
    readonly riskMetadata: Readonly<ConnectionMessageRisk>;
    readonly protocolVersion: string;
    readonly fingerprint: string;
}
export interface CreateConnectionMessageParams {
    readonly scopeIdentity: ScopedConnectionIdentity;
    readonly channel: ConnectionChannel;
    readonly direction: ConnectionDirection;
    readonly sequence: number;
    readonly messageType: ConnectionMessageType;
    readonly payload: Record<string, unknown>;
    readonly correlationId?: string;
    readonly causationId?: string;
    readonly riskLevel?: RiskLevel;
    readonly riskReason?: string;
}
/**
 * Asserts that childRisk does not downgrade parentRisk.
 * Risk level may stay equal or increase; MUST NEVER decrease.
 */
export declare function assertConnectionRiskNotDowngraded(parentRisk: RiskLevel, childRisk: RiskLevel): void;
export declare const assertRiskNotDowngraded: typeof assertConnectionRiskNotDowngraded;
/**
 * Creates canonical, immutable, deepFrozen ConnectionMessage
 */
export declare function createConnectionMessage(params: CreateConnectionMessageParams): Readonly<ConnectionMessage>;
