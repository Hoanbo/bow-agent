import type { ToolDefinition } from '../../tools/registry.js';
declare const EXECUTION_WORKSPACE: string;
declare const BRAIN_DATA_DIR: string;
/** Write a text file */
export declare const brainFsWriteTool: ToolDefinition;
/** Read a text file */
export declare const brainFsReadTool: ToolDefinition;
/** Append content to a file */
export declare const brainFsAppendTool: ToolDefinition;
/** List files in a directory */
export declare const brainFsListTool: ToolDefinition;
/** Delete a file */
export declare const brainFsDeleteTool: ToolDefinition;
/** Echo — identity tool used for test/observe tasks */
export declare const brainEchoTool: ToolDefinition;
/** All brain tools for bulk registration */
export declare const ALL_BRAIN_TOOLS: readonly ToolDefinition[];
/**
 * Validates that a proposed tool path is within the execution workspace.
 * Used by the Brain's observation layer to independently verify filesystem claims.
 */
export declare function verifyFileExists(filePath: string): {
    exists: boolean;
    resolvedPath: string;
    error?: string;
};
export declare function readFileContent(filePath: string): {
    content?: string;
    error?: string;
    resolvedPath: string;
};
export { EXECUTION_WORKSPACE, BRAIN_DATA_DIR };
