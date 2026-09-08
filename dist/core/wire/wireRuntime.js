// src/core/wire/wireRuntime.ts
// BOWCON V4.0 — SECURE REAL WIRE TRANSPORT & RELAY GATEWAY RUNTIME (MS-1.3.28)
//
// Central Wire Transport Runtime Facade.
//
// Provides high-level lifecycle orchestration for both client-side and server-side
// wire transports, maintaining strict separation of concerns from Brain cognitive logic.
import { RelayGatewayRuntime } from './relayGatewayRuntime.js';
import { RealWireClient } from './wireClient.js';
import { WebSocketWireServerAdapter, WebSocketWireClientAdapter } from './adapters/webSocketWireAdapter.js';
import { InMemoryWireServerAdapter, InMemoryWireClientAdapter } from './adapters/inMemoryWireAdapter.js';
export class WireTransportRuntime {
    mode;
    gatewayRuntime;
    constructor(options) {
        this.mode = options?.mode ?? 'REAL';
        if (options?.gatewayRuntime) {
            this.gatewayRuntime = options.gatewayRuntime;
        }
        else {
            const serverAdapter = this.mode === 'REAL'
                ? new WebSocketWireServerAdapter()
                : new InMemoryWireServerAdapter();
            this.gatewayRuntime = new RelayGatewayRuntime({
                serverAdapter,
            });
        }
    }
    getGatewayRuntime() {
        return this.gatewayRuntime;
    }
    getMode() {
        return this.mode;
    }
    async startGateway(port = 0, host = '127.0.0.1') {
        return await this.gatewayRuntime.start(port, host);
    }
    async stopGateway() {
        await this.gatewayRuntime.stop();
    }
    createClient(params) {
        const clientAdapter = this.mode === 'REAL'
            ? new WebSocketWireClientAdapter()
            : new InMemoryWireClientAdapter(this.gatewayRuntime.getServerAdapter());
        return new RealWireClient({
            deviceId: params.deviceId,
            surfaceId: params.surfaceId,
            surfaceType: params.surfaceType,
            tenantId: params.tenantId ?? 'tenant_bow_01',
            userId: params.userId ?? 'usr_owner_01',
            brainId: params.brainId ?? this.gatewayRuntime.brainId,
            relayId: params.relayId ?? this.gatewayRuntime.relayId,
            transportAdapter: clientAdapter,
            admissionBridge: this.gatewayRuntime.getAdmissionBridge(),
        });
    }
    getSnapshot() {
        return this.gatewayRuntime.getSnapshot();
    }
}
