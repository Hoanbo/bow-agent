// src/core/brain/brainTools.ts
// BOWCON V4.0 — MS-1.3.30: BRAIN FILESYSTEM TOOLS
//
// Registers real, governed filesystem tools with the ToolRegistry.
// These are the FIRST REAL TOOLS that the BOWCON Brain can execute.
//
// INVARIANTS:
// All tools remain inside the execution workspace (bow-agent/).
// Protected workspace (C:\BOW\shopofbow) is ABSOLUTELY forbidden.
// All paths are resolved and validated before any I/O.
// Tools are governed by PDP before execution.
// EXECUTED != VERIFIED — tools return results; Brain observes independently.
//
// SECURITY:
// eval / Function / child_process / exec / spawn — FORBIDDEN
// Shell execution — FORBIDDEN in this module
// Path traversal above workspace root — FORBIDDEN
// Access to C:\BOW\shopofbow — FORBIDDEN

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { ToolDefinition } from '../../tools/registry.js';
import { BrainError } from './brainFailure.js';

// ---------------------------------------------------------------------------
// Workspace Boundary
// ---------------------------------------------------------------------------
const EXECUTION_WORKSPACE = path.resolve(process.cwd());
const BRAIN_DATA_DIR = path.join(EXECUTION_WORKSPACE, 'data', 'brain');

/** Absolute protected workspace path — must NEVER be touched. */
const PROTECTED_WORKSPACE = path.resolve('C:\\BOW\\shopofbow');

/**
 * Validates and resolves a path, enforcing:
 * 1. Stays within EXECUTION_WORKSPACE
 * 2. Never reaches PROTECTED_WORKSPACE
 * 3. No path traversal (.. tricks)
 */
function resolveAndValidatePath(userPath: string): string {
  if (!userPath || typeof userPath !== 'string') {
    throw new BrainError('BRAIN_TOOL_EXECUTION_FAILED', 'Path must be a non-empty string.');
  }

  // Resolve relative to brain data dir for safety
  let resolved: string;
  if (path.isAbsolute(userPath)) {
    resolved = path.normalize(userPath);
  } else {
    resolved = path.resolve(BRAIN_DATA_DIR, userPath);
  }

  // Enforce workspace boundary
  if (!resolved.startsWith(EXECUTION_WORKSPACE)) {
    throw new BrainError(
      'BRAIN_TOOL_EXECUTION_FAILED',
      `Path "${resolved}" is outside the execution workspace. Access denied.`
    );
  }

  // Enforce protected workspace isolation (absolute invariant)
  if (resolved.toLowerCase().startsWith(PROTECTED_WORKSPACE.toLowerCase())) {
    throw new BrainError(
      'BRAIN_TOOL_EXECUTION_FAILED',
      'Access to the protected workspace (C:\\BOW\\shopofbow) is absolutely forbidden.'
    );
  }

  return resolved;
}

/**
 * Ensures the directory for a file path exists, creating it if needed.
 * Only creates directories inside the execution workspace.
 */
function ensureDirectory(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---------------------------------------------------------------------------
// Tool Definitions
// ---------------------------------------------------------------------------

/** Write a text file */
export const brainFsWriteTool: ToolDefinition = {
  name: 'brain_fs_write',
  description: 'Creates or overwrites a text file inside the Brain execution workspace.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative or absolute file path within workspace' },
      content: { type: 'string', description: 'Text content to write' },
    },
    required: ['path', 'content'],
  },
  execute: async (args: { path: string; content: string }) => {
    const resolved = resolveAndValidatePath(args.path);
    ensureDirectory(resolved);
    fs.writeFileSync(resolved, args.content, 'utf-8');
    const stat = fs.statSync(resolved);
    return {
      success: true,
      toolName: 'brain_fs_write',
      path: resolved,
      bytesWritten: stat.size,
      existsAfterWrite: fs.existsSync(resolved),
    };
  },
};

/** Read a text file */
export const brainFsReadTool: ToolDefinition = {
  name: 'brain_fs_read',
  description: 'Reads the text content of a file inside the Brain execution workspace.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative or absolute file path within workspace' },
    },
    required: ['path'],
  },
  execute: async (args: { path: string }) => {
    const resolved = resolveAndValidatePath(args.path);
    if (!fs.existsSync(resolved)) {
      return { success: false, toolName: 'brain_fs_read', path: resolved, error: 'File not found.' };
    }
    const content = fs.readFileSync(resolved, 'utf-8');
    return {
      success: true,
      toolName: 'brain_fs_read',
      path: resolved,
      content,
      byteSize: Buffer.byteLength(content, 'utf-8'),
    };
  },
};

/** Append content to a file */
export const brainFsAppendTool: ToolDefinition = {
  name: 'brain_fs_append',
  description: 'Appends text content to an existing file in the Brain execution workspace.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'Relative or absolute file path within workspace' },
      content: { type: 'string', description: 'Content to append' },
    },
    required: ['path', 'content'],
  },
  execute: async (args: { path: string; content: string }) => {
    const resolved = resolveAndValidatePath(args.path);
    ensureDirectory(resolved);
    fs.appendFileSync(resolved, '\n' + args.content, 'utf-8');
    const stat = fs.statSync(resolved);
    return {
      success: true,
      toolName: 'brain_fs_append',
      path: resolved,
      newByteSize: stat.size,
    };
  },
};

/** List files in a directory */
export const brainFsListTool: ToolDefinition = {
  name: 'brain_fs_list',
  description: 'Lists files and directories inside a Brain workspace directory.',
  parameters: {
    type: 'object',
    properties: {
      directory: { type: 'string', description: 'Directory path to list' },
    },
    required: ['directory'],
  },
  execute: async (args: { directory: string }) => {
    const resolved = resolveAndValidatePath(args.directory);
    if (!fs.existsSync(resolved)) {
      return { success: true, toolName: 'brain_fs_list', directory: resolved, entries: [] };
    }
    const entries = fs.readdirSync(resolved, { withFileTypes: true }).map(e => ({
      name: e.name,
      isDirectory: e.isDirectory(),
      isFile: e.isFile(),
    }));
    return { success: true, toolName: 'brain_fs_list', directory: resolved, entries };
  },
};

/** Delete a file */
export const brainFsDeleteTool: ToolDefinition = {
  name: 'brain_fs_delete',
  description: 'Deletes a file inside the Brain execution workspace.',
  parameters: {
    type: 'object',
    properties: {
      path: { type: 'string', description: 'File path to delete' },
    },
    required: ['path'],
  },
  execute: async (args: { path: string }) => {
    const resolved = resolveAndValidatePath(args.path);
    const existed = fs.existsSync(resolved);
    if (existed) {
      fs.unlinkSync(resolved);
    }
    return {
      success: true,
      toolName: 'brain_fs_delete',
      path: resolved,
      wasPresent: existed,
      existsAfterDelete: fs.existsSync(resolved),
    };
  },
};

/** Echo — identity tool used for test/observe tasks */
export const brainEchoTool: ToolDefinition = {
  name: 'brain_echo',
  description: 'Returns the input unchanged. Used for observation and testing.',
  parameters: {
    type: 'object',
    properties: {
      input: { type: 'string', description: 'Text to echo' },
    },
    required: ['input'],
  },
  execute: async (args: { input: string }) => ({
    success: true,
    toolName: 'brain_echo',
    echo: args.input,
    timestamp: Date.now(),
  }),
};

/** All brain tools for bulk registration */
export const ALL_BRAIN_TOOLS: readonly ToolDefinition[] = Object.freeze([
  brainFsWriteTool,
  brainFsReadTool,
  brainFsAppendTool,
  brainFsListTool,
  brainFsDeleteTool,
  brainEchoTool,
]);

/**
 * Validates that a proposed tool path is within the execution workspace.
 * Used by the Brain's observation layer to independently verify filesystem claims.
 */
export function verifyFileExists(filePath: string): { exists: boolean; resolvedPath: string; error?: string } {
  try {
    const resolved = resolveAndValidatePath(filePath);
    return { exists: fs.existsSync(resolved), resolvedPath: resolved };
  } catch (e: any) {
    return { exists: false, resolvedPath: '', error: e.message };
  }
}

export function readFileContent(filePath: string): { content?: string; error?: string; resolvedPath: string } {
  try {
    const resolved = resolveAndValidatePath(filePath);
    if (!fs.existsSync(resolved)) return { error: 'File not found', resolvedPath: resolved };
    return { content: fs.readFileSync(resolved, 'utf-8'), resolvedPath: resolved };
  } catch (e: any) {
    return { error: e.message, resolvedPath: '' };
  }
}

export { EXECUTION_WORKSPACE, BRAIN_DATA_DIR };
