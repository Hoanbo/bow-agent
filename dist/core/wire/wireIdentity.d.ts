/**
 * Computes a deterministic SHA-256 fingerprint for a wire connection.
 * Returns canonical `conn_wire_<16-hex>` identifier.
 */
export declare function computeWireConnectionId(relayId: string, remoteHost: string, remotePort: number, nonce: string): string;
/**
 * Computes a deterministic SHA-256 fingerprint for a wire frame.
 */
export declare function computeWireFrameId(connectionId: string, sequence: number, checksum: string): string;
export declare function assertWireTransportDoesNotEqualDeviceIdentity(): void;
export declare function assertWireTransportDoesNotEqualDeviceTrust(): void;
export declare function assertWireTransportDoesNotEqualAuthorization(): void;
export declare function assertWireTransportDoesNotEqualExecutionAuthority(): void;
export declare function assertRelayGatewayDoesNotEqualBrain(): void;
export declare function assertRelayGatewayDoesNotEqualLlm(): void;
export declare function assertRelayGatewayDoesNotEqualMemory(): void;
export declare function assertRelayGatewayDoesNotEqualToolExecutor(): void;
export declare function assertNetworkAddressDoesNotEqualDeviceIdentity(address: string, deviceId: string): void;
export declare function assertIpDoesNotEqualDeviceIdentity(ip: string, deviceId: string): void;
export declare function assertPortDoesNotEqualDeviceIdentity(port: number | string, deviceId: string): void;
export declare function assertDnsDoesNotEqualDeviceIdentity(dns: string, deviceId: string): void;
export declare function assertSsidDoesNotEqualDeviceIdentity(ssid: string, deviceId: string): void;
export declare function assertMacDoesNotEqualDeviceIdentity(mac: string, deviceId: string): void;
export declare function assertTransportConnectionDoesNotEqualTrust(): void;
export declare function assertSocketConnectionDoesNotEqualAuthentication(): void;
export declare function assertTlsDoesNotEqualAuthorization(): void;
export declare function assertConnectedDoesNotEqualAdmitted(): void;
export declare function assertAdmittedDoesNotEqualAuthorized(): void;
export declare function assertAuthorizedDoesNotEqualExecuted(): void;
export declare function assertRelayConnectedDoesNotEqualBrainSession(): void;
export declare function assertNetworkReconnectDoesNotEqualTaskReexecution(): void;
export declare function assertSessionResumeDoesNotEqualTaskReexecution(): void;
export declare function assertTransportReconnectDoesNotEqualSessionRecreation(): void;
export declare function assertSessionIdDoesNotEqualDeviceId(sessionId: string, deviceId: string): void;
export declare function assertRelayIdDoesNotEqualDeviceId(relayId: string, deviceId: string): void;
export declare function assertRelayIdDoesNotEqualSessionId(relayId: string, sessionId: string): void;
export declare function assertBrainIdDoesNotEqualRelayId(brainId: string, relayId: string): void;
export declare function assertOneBrainEqualsOneAuthoritativeBrain(brains: readonly string[]): void;
export declare function assertMultipleSurfacesDoNotEqualMultipleBrains(): void;
export declare function assertInternetLocationDoesNotEqualTrust(): void;
export declare function assertPublicNetworkDoesNotEqualTrust(): void;
export declare function assertHomeNetworkDoesNotEqualTrust(): void;
export declare function assertKnowingRelayEndpointDoesNotGrantAccess(): void;
export declare function assertKnowingBrainEndpointDoesNotGrantAccess(): void;
export declare function assertPossessingDeviceIdDoesNotEqualPossessingDeviceKey(): void;
export declare function assertPossessingDeviceKeyDoesNotEqualExecutionAuthority(): void;
export declare function assertDeliveredDoesNotEqualTaskSuccess(): void;
export declare function assertAcknowledgedDoesNotEqualTaskSuccess(): void;
export declare function assertConnectionSuccessDoesNotEqualTaskSuccess(): void;
export declare function assertWireSuccessDoesNotEqualTaskSuccess(): void;
