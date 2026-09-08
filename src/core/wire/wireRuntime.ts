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
import type { WireTransportSnapshot, WireEndpointMetadata, WireSurfaceType } from './wireTypes.js';

export interface WireTransportRuntimeOptions {
  readonly mode?: 'REAL' | 'IN_MEMORY';
  readonly gatewayRuntime?: RelayGatewayRuntime;
}

export class WireTransportRuntime {
  private readonly mode: 'REAL' | 'IN_MEMORY';
  private readonly gatewayRuntime: RelayGatewayRuntime;

  constructor(options?: WireTransportRuntimeOptions) {
    this.mode = options?.mode ?? 'REAL';

    if (options?.gatewayRuntime) {
      this.gatewayRuntime = options.gatewayRuntime;
    } else {
      const serverAdapter =
        this.mode === 'REAL'
          ? new WebSocketWireServerAdapter()
          : new InMemoryWireServerAdapter();

      this.gatewayRuntime = new RelayGatewayRuntime({
        serverAdapter,
      });
    }
  }

  public getGatewayRuntime(): RelayGatewayRuntime {
    return this.gatewayRuntime;
  }

  public getMode(): 'REAL' | 'IN_MEMORY' {
    return this.mode;
  }

  public async startGateway(port = 0, host = '127.0.0.1'): Promise<WireEndpointMetadata> {
    return await this.gatewayRuntime.start(port, host);
  }

  public async stopGateway(): Promise<void> {
    await this.gatewayRuntime.stop();
  }

  public createClient(params: {
    deviceId: string;
    surfaceId: string;
    surfaceType: WireSurfaceType;
    tenantId?: string;
    userId?: string;
    brainId?: string;
    relayId?: string;
  }): RealWireClient {
    const clientAdapter =
      this.mode === 'REAL'
        ? new WebSocketWireClientAdapter()
        : new InMemoryWireClientAdapter(
            this.gatewayRuntime.getServerAdapter() as InMemoryWireServerAdapter
          );

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

  public getSnapshot(): WireTransportSnapshot {
    return this.gatewayRuntime.getSnapshot();
  }
}
