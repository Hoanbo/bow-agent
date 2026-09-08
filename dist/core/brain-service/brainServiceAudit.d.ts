import { type BrainServiceAuditEvent, type BrainServiceAuditEventType, type BrainServiceId } from './brainServiceTypes.js';
import type { BrainId } from '../brain/brainTypes.js';
export declare class BrainServiceAuditLedger {
    private readonly _events;
    readonly serviceId: BrainServiceId;
    readonly brainId: BrainId;
    constructor(serviceId: BrainServiceId, brainId: BrainId);
    record(type: BrainServiceAuditEventType, data?: Record<string, unknown>, requestId?: string): BrainServiceAuditEvent;
    getEvents(): readonly BrainServiceAuditEvent[];
    get count(): number;
}
