#!/usr/bin/env node

/**
 * Supabase RLS Policy Fix Script
 * 
 * This script applies RLS policies to the air_quality table in case
 * the table exists but has RLS enabled without proper policies.
 */

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Create interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Check if .env.local exists and read it
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    } else if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseKey = line.split('=')[1].trim();
    } else if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !supabaseKey) {
      supabaseKey = line.split('=')[1].trim();
    }
  }
}

async function promptForCredentials() {
  return new Promise((resolve) => {
    if (!supabaseUrl) {
      rl.question('Enter your Supabase URL: ', (url) => {
        supabaseUrl = url;
        if (!supabaseKey) {
          rl.question('Enter your Supabase service role key (preferred) or anon key: ', (key) => {
            supabaseKey = key;
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else if (!supabaseKey) {
      rl.question('Enter your Supabase service role key (preferred) or anon key: ', (key) => {
        supabaseKey = key;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function fixRLSPolicies() {
  console.log('🔧 SMesh Analyzer - Supabase RLS Policy Fix');
  console.log('------------------------------------------');
  
  await promptForCredentials();
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Please provide both URL and key.');
    rl.close();
    return;
  }
  
  console.log(`\nConnecting to Supabase at ${supabaseUrl}...`);
  
  // Create a Supabase client with the service role key if possible
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
  
  // SQL to check if the table exists
  const checkTableSQL = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = 'air_quality'
    );
  `;
  
  // SQL to fix RLS policies
  const fixRLSSQL = `
    -- Enable RLS on the table if not already enabled
    ALTER TABLE IF EXISTS air_quality ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Allow public read access on air_quality" ON air_quality;
    DROP POLICY IF EXISTS "Allow insert for authenticated users on air_quality" ON air_quality;
    DROP POLICY IF EXISTS "Allow public insert on air_quality" ON air_quality;
    
    -- Create policies
    CREATE POLICY "Allow public read access on air_quality"
    ON air_quality FOR SELECT
    USING (true);
    
    CREATE POLICY "Allow insert for authenticated users on air_quality"
    ON air_quality FOR INSERT
    WITH CHECK (true);
    
    CREATE POLICY "Allow public insert on air_quality"
    ON air_quality FOR INSERT
    WITH CHECK (true);
  `;
  
  try {
    console.log('Checking if the air_quality table exists...');
    
    // Check if the table exists first
    const { data: existsData, error: existsError } = await supabase.rpc('pgrest_sql', { query: checkTableSQL });
    
    if (existsError) {
      console.error('❌ Error checking table existence:', existsError.message);
      rl.close();
      return;
    }
    
    // Parse the response to see if the table exists
    const tableExists = existsData && existsData.length > 0 && existsData[0].exists;
    
    if (!tableExists) {
      console.error('❌ The air_quality table does not exist. Please run the migration script first.');
      console.log('\nRun this command to create the table:');
      console.log('npm run supabase:setup');
      rl.close();
      return;
    }
    
    console.log('✅ The air_quality table exists. Fixing RLS policies...');
    
    // Apply the RLS policies
    const { error: rlsError } = await supabase.rpc('pgrest_sql', { query: fixRLSSQL });
    
    if (rlsError) {
      console.error('❌ Error applying RLS policies:', rlsError.message);
      console.log('\nYou can try running this SQL manually in the Supabase SQL editor:');
      console.log('-------------------------------------------------------------------');
      console.log(fixRLSSQL);
      console.log('-------------------------------------------------------------------');
      rl.close();
      return;
    }
    
    console.log('✅ Successfully applied RLS policies to the air_quality table!');
    console.log('\nYou should now be able to access the table from your application.');
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  } finally {
    rl.close();
  }
}

// Run the script
fixRLSPolicies(); 