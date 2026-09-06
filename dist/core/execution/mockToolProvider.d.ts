import type { ToolCapability } from './capabilityTypes.js';
import type { CapabilityRegistry } from './capabilityRegistry.js';
export declare const mockEchoCapability: ToolCapability;
export declare const mockCalculateCapability: ToolCapability;
export declare const mockLookupCapability: ToolCapability;
export declare const mockHighRiskCapability: ToolCapability;
export declare const mockCriticalRiskCapability: ToolCapability;
/**
 * EN: Registers all standard deterministic mock capabilities into a registry.
 * VI: Đăng ký tất cả các mock capability tất định tiêu chuẩn vào registry.
 */
export declare function registerMockCapabilities(registry: CapabilityRegistry): void;
