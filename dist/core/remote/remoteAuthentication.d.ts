import type { RemoteAuthenticationState } from './remoteStates.js';
export interface RemoteAuthenticationResult {
    readonly state: RemoteAuthenticationState;
    readonly authenticated: boolean;
    readonly error?: string;
    readonly fingerprint: string;
}
/**
 * EN: Evaluates authentication state purely from token contract parameters.
 * VI: Đánh giá trạng thái xác thực thuần túy từ các tham số hợp đồng token.
 */
export declare function evaluateRemoteAuthentication(token?: string): Readonly<RemoteAuthenticationResult>;
