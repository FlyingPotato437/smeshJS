#!/usr/bin/env node

/**
 * Supabase Connection Test Script
 * 
 * This script tests connectivity to Supabase and checks if the air_quality table exists
 * and is accessible. It also tries to insert a test record if the table exists.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables from .env.local if it exists
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  dotenv.config({ path: envPath });
}

// Get Supabase credentials from environment or arguments
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Allow overriding with command line arguments
if (process.argv.length >= 4) {
  supabaseUrl = process.argv[2];
  supabaseKey = process.argv[3];
}

console.log('Supabase URL:', supabaseUrl);
console.log('Anon Key exists:', supabaseKey ? 'Yes' : 'No');
console.log('Service Role Key exists:', serviceRoleKey ? 'Yes' : 'No');

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Missing Supabase URL or key. Please set environment variables or provide as arguments.');
  console.log('Usage: node test-supabase.js [url] [key]');
  console.log('Or set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

// Create Supabase client using anon key
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Create Supabase client using service role key if available
const adminClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
}) : null;

async function testConnection() {
  console.log('\n--- Testing Supabase Connection ---');
  
  try {
    // Test basic connection by trying to get system time
    const { data, error } = await supabase.rpc('get_system_time');
    
    if (error) {
      console.error('❌ Connection test failed:', error);
      return false;
    }
    
    console.log('✅ Connection successful! System time:', data);
    return true;
  } catch (err) {
    console.error('❌ Connection test failed:', err.message);
    return false;
  }
}

async function checkTable() {
  console.log('\n--- Checking air_quality Table ---');
  
  try {
    // Check if table exists via metadata
    console.log('Checking table existence via metadata...');
    
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'air_quality');
    
    if (tablesError) {
      console.error('❌ Error checking tables:', tablesError);
    } else if (!tables || tables.length === 0) {
      console.error('❌ The air_quality table does not exist in the public schema');
    } else {
      console.log('✅ Found air_quality table in metadata');
    }
    
    // Try direct query - this tests if policies allow access
    console.log('\nTrying direct query to test policies...');
    const { data, error } = await supabase
      .from('air_quality')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ Error accessing air_quality table:', error);
      return false;
    }
    
    console.log('✅ Successfully accessed air_quality table!');
    console.log('Data:', data);
    return true;
  } catch (err) {
    console.error('❌ Error checking table:', err.message);
    return false;
  }
}

async function checkRLS() {
  console.log('\n--- Checking Row Level Security ---');
  
  if (!adminClient) {
    console.log('⚠️ Service role key not provided, skipping RLS check');
    return;
  }
  
  try {
    // Check if RLS is enabled for the table
    const { data: rlsData, error: rlsError } = await adminClient.rpc('check_rls_enabled', {
      table_name: 'air_quality'
    });
    
    if (rlsError) {
      console.error('❌ Error checking RLS:', rlsError);
      
      // Try another method
      console.log('\nTrying alternative RLS check...');
      const { data, error } = await adminClient.from('pg_catalog.pg_class')
        .select('relname, relrowsecurity')
        .eq('relname', 'air_quality');
      
      if (error) {
        console.error('❌ Error with alternative RLS check:', error);
      } else if (data && data.length > 0) {
        console.log('RLS enabled:', data[0].relrowsecurity);
      } else {
        console.log('⚠️ Could not determine RLS status');
      }
    } else {
      console.log('RLS enabled:', rlsData);
    }
    
    // Check RLS policies
    console.log('\nChecking RLS policies...');
    const { data: policies, error: policiesError } = await adminClient.from('pg_catalog.pg_policy')
      .select('polname, polcmd')
      .eq('polrelid', 'air_quality');
    
    if (policiesError) {
      console.error('❌ Error checking policies:', policiesError);
      
      // Try simpler query
      const { data, error } = await adminClient.rpc('get_policies_for_table', {
        table_name: 'air_quality'
      });
      
      if (error) {
        console.error('❌ Error with alternative policy check:', error);
      } else {
        console.log('Policies:', data);
      }
    } else {
      console.log('Policies:', policies);
    }
  } catch (err) {
    console.error('❌ Error checking RLS:', err.message);
  }
}

async function testInsert() {
  console.log('\n--- Testing Insert Operations ---');
  
  try {
    // Create test record
    const testRecord = {
      datetime: new Date().toISOString(),
      from_node: 'test-script',
      pm25standard: 10.5,
      pm10standard: 20.3,
      temperature: 25.0,
      relativehumidity: 60.0,
      latitude: 37.7749,
      longitude: -122.4194,
      elevation: '10 ft'
    };
    
    console.log('Inserting test record:', testRecord);
    
    const { data, error } = await supabase
      .from('air_quality')
      .insert([testRecord]);
    
    if (error) {
      console.error('❌ Insert failed:', error);
      return false;
    }
    
    console.log('✅ Insert successful!');
    return true;
  } catch (err) {
    console.error('❌ Insert failed:', err.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('=== Supabase Connection Test ===');
  console.log('URL:', supabaseUrl);
  
  const connected = await testConnection();
  if (!connected) {
    console.error('\n❌ Basic connection failed. Check your Supabase URL and API key.');
    process.exit(1);
  }
  
  const tableAccessible = await checkTable();
  await checkRLS();
  
  if (tableAccessible) {
    await testInsert();
  }
  
  console.log('\n=== Test Complete ===');
}

runTests(); 