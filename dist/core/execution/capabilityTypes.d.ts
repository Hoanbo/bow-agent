export type CapabilityRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CapabilityDomain = 'orders' | 'catalog' | 'payments' | 'voice' | 'storage' | 'system' | 'mock';
/**
 * EN: Explicit parameter definition for a tool capability.
 * VI: Định nghĩa tham số tường minh cho một capability của tool.
 */
export interface CapabilityParameter {
    readonly name: string;
    readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    readonly required: boolean;
    readonly description?: string;
}
/**
 * EN: Output produced by a capability handler execution.
 * VI: Kết quả đầu ra do handler của capability tạo ra.
 */
export interface CapabilityResult {
    readonly success: boolean;
    readonly data?: unknown;
    readonly error?: string;
}
/**
 * EN: Authoritative, immutable capability descriptor registered in CapabilityRegistry.
 * VI: Bộ mô tả capability có thẩm quyền, bất biến được đăng ký trong CapabilityRegistry.
 */
export interface ToolCapability {
    readonly name: string;
    readonly description: string;
    readonly domain: CapabilityDomain;
    readonly risk: CapabilityRisk;
    readonly parameters: readonly CapabilityParameter[];
    readonly handler: (args: Readonly<Record<string, unknown>>, context?: unknown) => Promise<unknown> | unknown;
}
