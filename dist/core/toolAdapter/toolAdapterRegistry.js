// src/core/toolAdapter/toolAdapterRegistry.ts
// BOWCON V4.0 — MS-1.4.06: TOOL ADAPTER REGISTRY
//
// EN:
// Deterministic registry of approved tool adapters.
// Responsible for registering, resolving, enabling, and disabling adapters.
// Rejects unknown or disabled adapters fail-closed.
// Exposes ZERO authorization capability.
//
// VI:
// Sổ đăng ký xác định các adapter công cụ đã được phê duyệt.
// Chịu trách nhiệm đăng ký, phân giải, kích hoạt và vô hiệu hóa các adapter.
// Từ chối các adapter không xác định hoặc bị vô hiệu hóa theo dạng đóng (fail-closed).
// Tuyệt đối KHÔNG có khả năng cấp phép ủy quyền.
import { ToolAdapterNotFoundError, ToolAdapterDisabledError, ToolSecurityViolationError, } from './toolAdapterTypes.js';
export class ToolAdapterRegistry {
    adapters = new Map();
    disabledTools = new Set();
    /**
     * Registers a governed tool adapter.
     * Fails closed if adapter definition is invalid or conflicting.
     */
    register(adapter) {
        if (!adapter || typeof adapter !== 'object') {
            throw new ToolSecurityViolationError('INVALID_ADAPTER: Tool adapter definition must be an object.');
        }
        if (!adapter.toolName || typeof adapter.toolName !== 'string' || !adapter.toolName.trim()) {
            throw new ToolSecurityViolationError('INVALID_TOOL_NAME: Tool name must be a non-empty string.');
        }
        const normalizedName = adapter.toolName.trim();
        if (!adapter.domain || !['shop', 'desktop', 'robot', 'dynamic_code'].includes(adapter.domain)) {
            throw new ToolSecurityViolationError(`INVALID_DOMAIN: Tool adapter "${normalizedName}" must declare a valid domain (shop, desktop, robot, dynamic_code).`);
        }
        if (typeof adapter.execute !== 'function') {
            throw new ToolSecurityViolationError(`INVALID_EXECUTE: Tool adapter "${normalizedName}" must provide an executable function.`);
        }
        if (this.adapters.has(normalizedName)) {
            throw new ToolSecurityViolationError(`CONFLICTING_REGISTRATION: Tool adapter "${normalizedName}" is already registered. Conflicting re-registration is prohibited.`);
        }
        this.adapters.set(normalizedName, Object.freeze({ ...adapter, toolName: normalizedName }));
        if (adapter.enabled === false) {
            this.disabledTools.add(normalizedName);
        }
    }
    /**
     * Unregisters a tool adapter by name.
     */
    unregister(toolName) {
        const normalized = toolName.trim();
        this.disabledTools.delete(normalized);
        return this.adapters.delete(normalized);
    }
    /**
     * Resolves a registered tool adapter.
     * Throws ToolAdapterNotFoundError if tool is not registered.
     * Throws ToolAdapterDisabledError if tool is disabled.
     */
    resolveAdapter(toolName) {
        if (!toolName || typeof toolName !== 'string') {
            throw new ToolAdapterNotFoundError('INVALID_TOOL_NAME: Tool name must be a non-empty string.');
        }
        const normalized = toolName.trim();
        const adapter = this.adapters.get(normalized);
        if (!adapter) {
            throw new ToolAdapterNotFoundError(`TOOL_NOT_FOUND: Tool adapter "${normalized}" is not registered in the ToolAdapterRegistry.`);
        }
        if (this.disabledTools.has(normalized)) {
            throw new ToolAdapterDisabledError(`TOOL_DISABLED: Tool adapter "${normalized}" is currently disabled in the ToolAdapterRegistry.`);
        }
        return adapter;
    }
    /**
     * Checks if an adapter is registered.
     */
    has(toolName) {
        return this.adapters.has(toolName.trim());
    }
    /**
     * Checks if an adapter is currently enabled.
     */
    isEnabled(toolName) {
        const normalized = toolName.trim();
        return this.adapters.has(normalized) && !this.disabledTools.has(normalized);
    }
    /**
     * Disables an adapter.
     */
    disable(toolName) {
        const normalized = toolName.trim();
        if (!this.adapters.has(normalized)) {
            throw new ToolAdapterNotFoundError(`TOOL_NOT_FOUND: Cannot disable unregistered tool "${normalized}".`);
        }
        this.disabledTools.add(normalized);
    }
    /**
     * Enables an adapter.
     */
    enable(toolName) {
        const normalized = toolName.trim();
        if (!this.adapters.has(normalized)) {
            throw new ToolAdapterNotFoundError(`TOOL_NOT_FOUND: Cannot enable unregistered tool "${normalized}".`);
        }
        this.disabledTools.delete(normalized);
    }
    /**
     * Returns all registered adapters.
     */
    getAll() {
        return Array.from(this.adapters.values());
    }
    /**
     * Resolves domain for a tool name.
     */
    resolveDomain(toolName) {
        const normalized = toolName.trim();
        const adapter = this.adapters.get(normalized);
        if (adapter) {
            return adapter.domain;
        }
        if (normalized.startsWith('desktop_'))
            return 'desktop';
        if (normalized.startsWith('robot_'))
            return 'robot';
        if (normalized.includes('skill') || normalized.includes('code'))
            return 'dynamic_code';
        return 'shop';
    }
    /**
     * Clears all registrations (primarily for clean test isolation).
     */
    clear() {
        this.adapters.clear();
        this.disabledTools.clear();
    }
}
export const globalToolAdapterRegistry = new ToolAdapterRegistry();
