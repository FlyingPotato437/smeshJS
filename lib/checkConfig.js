/**
 * Utility functions to check configuration
 */

import { isSupabaseConfigured } from './supabase';

/**
 * Check if all required environment variables are configured
 */
export function checkEnvironmentVariables() {
  const config = {
    supabase: {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      isConfigured: isSupabaseConfigured(),
    },
    ai: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL,
      maxUploadSize: process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE,
    }
  };
  
  return config;
}

/**
 * Get a readable configuration status message
 */
export function getConfigStatus() {
  const config = checkEnvironmentVariables();
  
  return {
    supabase: config.supabase.isConfigured ? 'configured' : 'not configured',
    openai: config.ai.openai ? 'configured' : 'not configured',
    gemini: config.ai.gemini ? 'configured' : 'not configured',
    appUrl: config.app.url || 'default',
    maxUploadSize: config.app.maxUploadSize || '10'
  };
} 