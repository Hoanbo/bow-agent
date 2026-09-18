/**
 * Retrieves or lazily initializes the persistent Body Pre-Shared Key (PSK).
 *
 * Priority:
 * 1. Environment variable: `BOW_BODY_PSK` or `BOW_BRAIN_PSK`
 * 2. Stored configuration file: `data/config/body-psk.local`
 * 3. Automatically generated 32-byte cryptographically secure random PSK (persisted to file)
 */
export declare function getBodyPsk(): string;
/**
 * Validates a client-provided Bearer token against the authoritative Body PSK using constant-time comparison.
 * Uses SHA-256 digest before timingSafeEqual to guarantee equal length buffers, preventing both length and value timing leaks.
 */
export declare function validateBodyPsk(providedToken?: string): boolean;
/**
 * Resets cached PSK in memory (useful for testing).
 */
export declare function _resetCachedPskForTesting(): void;
