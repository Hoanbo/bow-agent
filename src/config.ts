// src/config.ts
// BOW AGENT V3.3 — CENTRALIZED ENVIRONMENT & RUNTIME CONFIGURATION

// In Node.js server environments, dotenv is loaded in server.ts

// ESM evaluates imported modules before the body of server.ts. Load dotenv in
// this module so CONFIG always sees .env, regardless of the entrypoint.
import 'dotenv/config';

export interface BowAgentEnvConfig {
  env: 'development' | 'production' | 'test';
  port: number;
  host: string;
  geminiApiKey: string | null;
  geminiModel: string;
  desktopAuthToken: string;
  robotGatewaySecret: string;
  shopWebhookSecret: string;
  webhookMaxAgeSeconds: number;
  dynamicCodeEnabled: boolean;
  edgeTtsVoiceFemale: string;
  edgeTtsVoiceMale: string;
  fasterWhisperUrl: string;
  openaiApiKey: string | null;
  localLlmUrl: string;
  localLlmModel: string;
  localWhisperUrl: string;
  speechPreferLocal: boolean;
  corsAllowedOrigins: string[];
  maxRequestBodyBytes: number;
}

function getEnvValue(key: string, defaultValue: string = ''): string {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!.trim();
  }
  try {
    const metaEnv = (import.meta as any)?.env;
    if (metaEnv && metaEnv[key]) {
      return String(metaEnv[key]).trim();
    }
  } catch {}
  return defaultValue;
}

const runtimeEnv = getEnvValue('NODE_ENV', 'development') as BowAgentEnvConfig['env'];

export const CONFIG: BowAgentEnvConfig = {
  env: runtimeEnv,
  port: parseInt(getEnvValue('BOW_AGENT_PORT', getEnvValue('PORT', '4000')), 10),
  host: getEnvValue('BOW_AGENT_HOST', runtimeEnv === 'production' ? '127.0.0.1' : '0.0.0.0'),
  geminiApiKey: getEnvValue('GEMINI_API_KEY') || getEnvValue('VITE_GEMINI_API_KEY') || null,
  geminiModel: getEnvValue('GEMINI_MODEL', 'gemini-3.6-flash'),
  // Legacy defaults are retained only for local development/test compatibility.
  // A production instance with missing secrets therefore denies privileged access.
  desktopAuthToken: getEnvValue('BOW_DESKTOP_AUTH_TOKEN', runtimeEnv === 'production' ? '' : 'bow-desktop-secure-token-v3'),
  robotGatewaySecret: getEnvValue('ROBOT_GATEWAY_SECRET', runtimeEnv === 'production' ? '' : 'bow-robot-secure-key-v3'),
  // Keep webhook and robot credentials independent to contain a credential leak.
  shopWebhookSecret: getEnvValue('BOW_SHOP_WEBHOOK_SECRET'),
  webhookMaxAgeSeconds: Math.max(30, parseInt(getEnvValue('BOW_WEBHOOK_MAX_AGE_SECONDS', '300'), 10) || 300),
  // AsyncFunction is not a security boundary. Dynamic code is therefore opt-in
  // and disabled by default in production.
  dynamicCodeEnabled: getEnvValue('BOW_ENABLE_DYNAMIC_CODE', runtimeEnv === 'production' ? 'false' : 'true') === 'true',
  edgeTtsVoiceFemale: getEnvValue('EDGE_TTS_VOICE_FEMALE', 'vi-VN-HoaiMyNeural'),
  edgeTtsVoiceMale: getEnvValue('EDGE_TTS_VOICE_MALE', 'vi-VN-NamMinhNeural'),
  fasterWhisperUrl: getEnvValue('FASTER_WHISPER_URL', 'http://127.0.0.1:8000/v1/audio/transcriptions'),
  openaiApiKey: getEnvValue('OPENAI_API_KEY') || null,
  localLlmUrl: getEnvValue('LOCAL_LLM_URL', 'http://127.0.0.1:11434/v1'),
  localLlmModel: getEnvValue('LOCAL_LLM_MODEL', 'qwen2.5:1.5b'),
  localWhisperUrl: getEnvValue('LOCAL_WHISPER_URL', 'http://127.0.0.1:8080/v1/audio/transcriptions'),
  speechPreferLocal: getEnvValue('SPEECH_PREFER_LOCAL', 'true') === 'true',
  corsAllowedOrigins: getEnvValue('BOW_CORS_ALLOWED_ORIGINS')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean),
  maxRequestBodyBytes: Math.max(1024, parseInt(getEnvValue('BOW_MAX_REQUEST_BODY_BYTES', '1048576'), 10) || 1048576),
};




export function isDesktopAuthValid(token?: string): boolean {
  if (!token) return false;
  return token.trim() === CONFIG.desktopAuthToken;
}

export function isRobotSecretValid(secret?: string): boolean {
  if (!secret) return false;
  return secret.trim() === CONFIG.robotGatewaySecret;
}
