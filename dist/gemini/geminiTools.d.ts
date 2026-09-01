import { FunctionDeclaration } from '@google/generative-ai';
import type { AgentContext, ProductItemResult } from '../core/types.js';
/**
 * 1. Khai báo Function Declarations (Tools) cho Gemini
 */
export declare const geminiToolDeclarations: FunctionDeclaration[];
/**
 * Interface kết quả thực thi Tool dành cho V3 Orchestrator
 */
export interface GeminiToolExecutionOutput {
    toolName: string;
    success: boolean;
    data: any;
    message?: string;
    actionData?: {
        type: 'product_detail' | 'products_list' | 'wallet' | 'orders' | 'vouchers' | 'tickets' | 'support' | 'warranty_ticket' | 'warranty_rejected';
        product?: ProductItemResult;
        products?: ProductItemResult[];
        balance?: number;
        orders?: any[];
        vouchers?: any[];
        tickets?: any[];
        order?: any;
        reason?: string;
    };
}
/**
 * 2. Cầu nối thực thi Tool an toàn (Deterministic Safe Execution)
 */
export declare function executeGeminiTool(toolName: string, rawArgs: Record<string, any> | undefined | null, context: AgentContext, requestText?: string): Promise<GeminiToolExecutionOutput>;
