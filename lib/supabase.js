import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Debug information about Supabase configuration
console.log('DEBUG - Supabase URL:', supabaseUrl);
console.log('DEBUG - Supabase Anon Key exists:', supabaseAnonKey ? 'Yes' : 'No');
console.log('DEBUG - Supabase Service Key exists:', supabaseServiceKey ? 'Yes' : 'No');

// Check if the environment variables are defined
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase URL or anon key not defined. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
  );
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
  const configured = Boolean(supabaseUrl && supabaseAnonKey);
  console.log('DEBUG - isSupabaseConfigured:', configured);
  return configured;
};

/**
 * Perform a diagnostic test on the Supabase connection
 * This can be called from API routes to help debug connection issues
 */
export async function testSupabaseConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // 1. Test basic connection by selecting a record from air_quality
    const { data: record, error: recordError } = await supabaseAdmin
      .from('air_quality')
      .select('id')
      .limit(1);
    
    if (recordError) {
      return {
        success: false,
        stage: 'connection',
        error: recordError.message,
        details: recordError
      };
    }
    
    // If we got here, everything works!
    return {
      success: true,
      record
    };
    
  } catch (error) {
    return {
      success: false,
      stage: 'unexpected',
      error: error.message,
      details: error
    };
  }
} 