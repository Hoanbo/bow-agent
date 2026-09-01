// src/config.ts
// BOW AGENT V3.3 — CENTRALIZED ENVIRONMENT & RUNTIME CONFIGURATION
function getEnvValue(key, defaultValue = '') {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key].trim();
    }
    try {
        const metaEnv = import.meta?.env;
        if (metaEnv && metaEnv[key]) {
            return String(metaEnv[key]).trim();
        }
    }
    catch { }
    return defaultValue;
}
export const CONFIG = {
    env: getEnvValue('NODE_ENV', 'development'),
    port: parseInt(getEnvValue('BOW_AGENT_PORT', getEnvValue('PORT', '4000')), 10),
    host: getEnvValue('BOW_AGENT_HOST', '0.0.0.0'),
    geminiApiKey: getEnvValue('GEMINI_API_KEY') || getEnvValue('VITE_GEMINI_API_KEY') || null,
    geminiModel: getEnvValue('GEMINI_MODEL', 'gemini-3.6-flash'),
    desktopAuthToken: getEnvValue('BOW_DESKTOP_AUTH_TOKEN', 'bow-desktop-secure-token-v3'),
    robotGatewaySecret: getEnvValue('ROBOT_GATEWAY_SECRET', 'bow-robot-secure-key-v3'),
    edgeTtsVoiceFemale: getEnvValue('EDGE_TTS_VOICE_FEMALE', 'vi-VN-HoaiMyNeural'),
    edgeTtsVoiceMale: getEnvValue('EDGE_TTS_VOICE_MALE', 'vi-VN-NamMinhNeural'),
    fasterWhisperUrl: getEnvValue('FASTER_WHISPER_URL', 'http://127.0.0.1:8000/v1/audio/transcriptions'),
    openaiApiKey: getEnvValue('OPENAI_API_KEY') || null,
};
export function isDesktopAuthValid(token) {
    if (!token)
        return false;
    return token.trim() === CONFIG.desktopAuthToken;
}
export function isRobotSecretValid(secret) {
    if (!secret)
        return false;
    return secret.trim() === CONFIG.robotGatewaySecret;
}
