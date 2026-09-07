import type { VerificationResult } from './verificationTypes.js';
/**
 * EN: Deeply freezes an object and all its nested properties.
 * VI: Đóng băng sâu một đối tượng và toàn bộ các thuộc tính lồng nhau của nó.
 */
export declare function deepFreeze<T>(obj: T): Readonly<T>;
/**
 * EN: Creates a deeply frozen, authoritative VerificationResult.
 * VI: Tạo một VerificationResult bất biến sâu, có thẩm quyền.
 */
export declare function createVerificationResult(params: VerificationResult): Readonly<VerificationResult>;
