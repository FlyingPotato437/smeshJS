#!/usr/bin/env node

/**
 * Supabase Setup Helper
 * This script helps set up the Supabase database tables for the SMesh Analyzer app.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

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
          rl.question('Enter your Supabase service role key (or anon key): ', (key) => {
            supabaseKey = key;
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else if (!supabaseKey) {
      rl.question('Enter your Supabase service role key (or anon key): ', (key) => {
        supabaseKey = key;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function runMigration() {
  console.log('🚀 SMesh Analyzer - Supabase Setup');
  console.log('-----------------------------------');
  
  await promptForCredentials();
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Please provide both URL and key.');
    rl.close();
    return;
  }
  
  console.log(`\nConnecting to Supabase at ${supabaseUrl}...`);
  
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
  
  try {
    // Read migration file
    const migrationPath = path.join(__dirname, 'migrations', '20240411_create_air_quality_table.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Running migration to create air_quality table...');
    
    // Execute the SQL directly via REST API
    const { data, error } = await supabase.rpc('pgrest_sql', { query: migrationSql });
    
    if (error) {
      console.error('❌ Error running migration:', error.message);
      console.log('\nAlternative: You can run this SQL directly in the Supabase SQL editor:');
      console.log('-------------------------------------------------------------------');
      console.log(migrationSql);
      console.log('-------------------------------------------------------------------');
    } else {
      console.log('✅ Migration successful! The air_quality table has been created.');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\nAlternative: Copy the SQL from migrations/20240411_create_air_quality_table.sql');
    console.log('and run it directly in the Supabase SQL editor.');
  }
  
  rl.close();
}

runMigration(); 