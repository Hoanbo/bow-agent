export interface BowAgentEnvConfig {
    env: 'development' | 'production' | 'test';
    port: number;
    host: string;
    geminiApiKey: string | null;
    geminiModel: string;
    desktopAuthToken: string;
    robotGatewaySecret: string;
    edgeTtsVoiceFemale: string;
    edgeTtsVoiceMale: string;
    fasterWhisperUrl: string;
    openaiApiKey: string | null;
    localLlmUrl: string;
    localLlmModel: string;
    localWhisperUrl: string;
    speechPreferLocal: boolean;
}
export declare const CONFIG: BowAgentEnvConfig;
export declare function isDesktopAuthValid(token?: string): boolean;
export declare function isRobotSecretValid(secret?: string): boolean;
