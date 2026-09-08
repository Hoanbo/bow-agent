export interface RecoveryMarker {
    readonly targetPath: string;
    readonly tmpPath: string;
    readonly checksum: string;
    readonly timestamp: number;
}
/**
 * Performs an atomic write of payload to destination file.
 * 1. Write payload to temporary file (<dest>.tmp.<hash>)
 * 2. Write recovery marker (<dest>.marker)
 * 3. Atomic rename temporary file to destination
 * 4. Clean up recovery marker
 */
export declare function atomicWriteFileSync(destPath: string, payload: string): void;
/**
 * Checks for and parses an existing recovery marker for a target file.
 */
export declare function readRecoveryMarkerSync(destPath: string): RecoveryMarker | null;
/**
 * Cleans up orphaned temporary and marker files for a given target path.
 */
export declare function cleanupAtomicArtifactsSync(destPath: string): void;
