import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin, testSupabaseConnection } from '../../../lib/supabase';

/**
 * GET handler to test Supabase connection
 * This endpoint can help diagnose issues with Supabase connectivity
 */
export async function GET() {
  try {
    // 1. Check basic connection
    const connectionTest = await testSupabaseConnection();
    
    // 2. Try service role key if available
    let adminTest = { available: false };
    
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        // Try to check RLS status
        const { data, error } = await supabaseAdmin
          .from('pg_class')
          .select('relname, relrowsecurity')
          .eq('relname', 'air_quality')
          .single();
          
        adminTest = {
          available: true,
          success: !error,
          data: data || null,
          error: error ? error.message : null
        };
      } catch (e) {
        adminTest = {
          available: true,
          success: false,
          error: e.message
        };
      }
    }
    
    // 3. Try direct table insert
    let insertTest = { attempted: false };
    
    if (connectionTest.success) {
      try {
        // Create a test record
        const testRecord = {
          datetime: new Date().toISOString(),
          from_node: 'api-test',
          pm25standard: 1.0,
          pm10standard: 2.0,
          temperature: 20.0,
          relativehumidity: 50.0,
          latitude: 37.7749,
          longitude: -122.4194
        };
        
        // Attempt insert
        const { data, error } = await supabase
          .from('air_quality')
          .insert([testRecord]);
          
        insertTest = {
          attempted: true,
          success: !error,
          error: error ? error.message : null
        };
      } catch (e) {
        insertTest = {
          attempted: true,
          success: false,
          error: e.message
        };
      }
    }
    
    // Return all test results
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      connectionTest,
      adminTest,
      insertTest,
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing',
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 