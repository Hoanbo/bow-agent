import type { BrainEvent, CreateBrainEventParams } from './eventTypes.js';
/**
 * EN: Deeply freezes an object, its nested objects, and arrays.
 * VI: Đóng băng sâu một đối tượng, các đối tượng lồng nhau và mảng.
 */
export declare function deepFreeze<T>(obj: T): T;
/**
 * EN: Creates an authoritative, deeply immutable BrainEvent envelope.
 * VI: Tạo một phong bì BrainEvent có thẩm quyền, bất biến sâu.
 */
export declare function createBrainEventEnvelope(params: CreateBrainEventParams): BrainEvent;
