export interface DesktopActionResult {
    success: boolean;
    action: string;
    appName?: string;
    payload?: any;
    message?: string;
    error?: string;
}
