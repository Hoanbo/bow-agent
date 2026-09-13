import { type ToolAdapter, type ToolAdapterDomain } from './toolAdapterTypes.js';
export declare class ToolAdapterRegistry {
    private readonly adapters;
    private readonly disabledTools;
    /**
     * Registers a governed tool adapter.
     * Fails closed if adapter definition is invalid or conflicting.
     */
    register(adapter: ToolAdapter): void;
    /**
     * Unregisters a tool adapter by name.
     */
    unregister(toolName: string): boolean;
    /**
     * Resolves a registered tool adapter.
     * Throws ToolAdapterNotFoundError if tool is not registered.
     * Throws ToolAdapterDisabledError if tool is disabled.
     */
    resolveAdapter(toolName: string): ToolAdapter;
    /**
     * Checks if an adapter is registered.
     */
    has(toolName: string): boolean;
    /**
     * Checks if an adapter is currently enabled.
     */
    isEnabled(toolName: string): boolean;
    /**
     * Disables an adapter.
     */
    disable(toolName: string): void;
    /**
     * Enables an adapter.
     */
    enable(toolName: string): void;
    /**
     * Returns all registered adapters.
     */
    getAll(): readonly ToolAdapter[];
    /**
     * Resolves domain for a tool name.
     */
    resolveDomain(toolName: string): ToolAdapterDomain;
    /**
     * Clears all registrations (primarily for clean test isolation).
     */
    clear(): void;
}
export declare const globalToolAdapterRegistry: ToolAdapterRegistry;
