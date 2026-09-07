import type { ConnectionChannel, ConnectionMessageType } from './connectionTypes.js';
export declare const CHANNELS: readonly ConnectionChannel[];
export declare const CHANNEL_MESSAGE_MAP: Readonly<Record<ConnectionChannel, readonly ConnectionMessageType[]>>;
/**
 * Validates whether a message type is permissible on a specific channel
 */
export declare function isValidChannelForMessageType(channel: ConnectionChannel, msgType: ConnectionMessageType): boolean;
/**
 * Asserts valid channel mapping, failing closed on mismatch
 */
export declare function assertValidChannelMapping(channel: ConnectionChannel, msgType: ConnectionMessageType): void;
