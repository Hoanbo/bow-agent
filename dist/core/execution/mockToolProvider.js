// src/core/execution/mockToolProvider.ts
// BOWCON V4.0 — MILESTONE 1.3.12: DETERMINISTIC MOCK TOOL PROVIDER
//
// EN:
// Test-only deterministic tools for execution verification.
// Zero network calls, zero filesystem access, zero shell execution, zero dynamic code (INV-7, INV-8).
//
// VI:
// Các tool tất định chỉ dùng cho kiểm thử để xác minh thực thi.
// Không kết nối mạng, không truy cập hệ thống tệp, không gọi shell, không code động (INV-7, INV-8).
export const mockEchoCapability = Object.freeze({
    name: 'mock.echo',
    description: 'Deterministic echo capability for execution testing.',
    domain: 'mock',
    risk: 'LOW',
    parameters: Object.freeze([
        { name: 'message', type: 'string', required: true, description: 'Message to echo back' },
    ]),
    handler: (args) => {
        return {
            echoed: String(args.message || ''),
        };
    },
});
export const mockCalculateCapability = Object.freeze({
    name: 'mock.calculate',
    description: 'Deterministic arithmetic calculation capability without dynamic eval.',
    domain: 'mock',
    risk: 'LOW',
    parameters: Object.freeze([
        { name: 'a', type: 'number', required: true, description: 'First number' },
        { name: 'b', type: 'number', required: true, description: 'Second number' },
        { name: 'operation', type: 'string', required: true, description: 'Operation: add or subtract' },
    ]),
    handler: (args) => {
        const a = Number(args.a);
        const b = Number(args.b);
        const op = String(args.operation || '').toLowerCase();
        if (op === 'add') {
            return { result: a + b };
        }
        if (op === 'subtract') {
            return { result: a - b };
        }
        throw new Error(`UNSUPPORTED_OPERATION: Only "add" and "subtract" are supported.`);
    },
});
export const mockLookupCapability = Object.freeze({
    name: 'mock.lookup',
    description: 'Deterministic dictionary lookup capability.',
    domain: 'catalog',
    risk: 'MEDIUM',
    parameters: Object.freeze([
        { name: 'query', type: 'string', required: true, description: 'Lookup query' },
    ]),
    handler: (args) => {
        const database = {
            'order_1234': 'COMPLETED',
            'product_alpha': 'IN_STOCK',
            'user_vip': 'GOLD_TIER',
            'sku_123': 'AVAILABLE',
            'order_999': 'PENDING',
        };
        const query = String(args.query || args.key || '');
        const found = Object.prototype.hasOwnProperty.call(database, query);
        return {
            query,
            found,
            details: {
                id: query,
                status: found ? database[query] : 'UNKNOWN',
            },
            value: found ? database[query] : undefined,
        };
    },
});
export const mockHighRiskCapability = Object.freeze({
    name: 'mock.cancel_order',
    description: 'High-risk order cancellation mock requiring operator approval.',
    domain: 'orders',
    risk: 'HIGH',
    parameters: Object.freeze([
        { name: 'orderId', type: 'string', required: true, description: 'Order ID to cancel' },
        { name: 'reason', type: 'string', required: false, description: 'Cancellation reason' },
    ]),
    handler: (args) => {
        return {
            orderId: String(args.orderId),
            status: 'cancelled',
        };
    },
});
export const mockCriticalRiskCapability = Object.freeze({
    name: 'mock.delete_data',
    description: 'Critical-risk destructive data deletion mock requiring strict approval.',
    domain: 'storage',
    risk: 'CRITICAL',
    parameters: Object.freeze([
        { name: 'targetId', type: 'string', required: true, description: 'Target data identifier' },
        { name: 'confirm', type: 'boolean', required: false, description: 'Confirmation flag' },
    ]),
    handler: (args) => {
        return {
            targetId: String(args.targetId),
            status: 'deleted',
            deleted: true,
        };
    },
});
/**
 * EN: Registers all standard deterministic mock capabilities into a registry.
 * VI: Đăng ký tất cả các mock capability tất định tiêu chuẩn vào registry.
 */
export function registerMockCapabilities(registry) {
    registry.register(mockEchoCapability);
    registry.register(mockCalculateCapability);
    registry.register(mockLookupCapability);
    registry.register(mockHighRiskCapability);
    registry.register(mockCriticalRiskCapability);
}
