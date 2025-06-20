import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if the environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase not configured. Using local storage fallback.');
}

/**
 * Create a Supabase client if environment variables are available
 * For client-side usage (browser)
 */
export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
);

/**
 * Create a Supabase admin client using the service role key
 * Only use this on the server side, never expose to the client
 */
export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: true,
    }
  }
);

// Helper function to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

/**
 * Test Supabase connection for fire management data
 */
export async function testSupabaseConnection() {
  try {
    // Test connection with fire_data table
    const { data, error } = await supabaseAdmin
      .from('fire_data')
      .select('id, burn_unit, status')
      .limit(1);
    
    if (error) {
      // If fire_data doesn't exist, fall back to air_quality for backward compatibility
      const { data: fallbackData, error: fallbackError } = await supabaseAdmin
        .from('air_quality')
        .select('id')
        .limit(1);
      
      return fallbackError 
        ? { success: false, error: `No compatible tables found: ${error.message}` }
        : { success: true, data: fallbackData, table: 'air_quality' };
    }
    
    return { success: true, data, table: 'fire_data' };
  } catch (error) {
    return { success: false, error: error.message };
  }
} 