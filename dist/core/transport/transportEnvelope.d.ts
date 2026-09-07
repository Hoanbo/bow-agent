import type { BrainTransportMessage, CreateTransportMessageParams } from './transportTypes.js';
/**
 * EN: Constructs a deeply immutable, validated BrainTransportMessage envelope.
 * VI: Khởi tạo một phong bì BrainTransportMessage được xác thực và bất biến sâu.
 */
export declare function createTransportMessageEnvelope(params: CreateTransportMessageParams): Readonly<BrainTransportMessage>;
