#!/usr/bin/env node

/**
 * Simple Supabase Insert Test Script
 * Attempts to insert a single record into the air_quality table
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local if available
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim();
    }
  });
}

// Get credentials (use command line args if provided)
const supabaseUrl = process.argv[2] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.argv[3] || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('API Key exists:', !!supabaseKey);

// Create client
const supabase = createClient(supabaseUrl, supabaseKey);

// Test record
const testRecord = {
  datetime: new Date().toISOString(),
  from_node: 'test-node',
  pm25standard: 5.0,
  pm10standard: 10.0,
  temperature: 22.0,
  relativehumidity: 45.0,
  latitude: 37.7749,
  longitude: -122.4194
};

// Run test
async function runTest() {
  try {
    console.log('1. Checking table structure...');
    
    // Check table schema
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type')
      .eq('table_schema', 'public')
      .eq('table_name', 'air_quality');
      
    if (columnsError) {
      console.error('Error checking schema:', columnsError);
      return;
    }
    
    console.log('Table columns:');
    columns.forEach(col => {
      console.log(`- ${col.column_name} (${col.data_type})`);
    });
    
    console.log('\n2. Inserting test record...');
    
    // Attempt insert
    const { data, error } = await supabase
      .from('air_quality')
      .insert([testRecord]);
      
    if (error) {
      console.error('Error inserting record:', error);
      return;
    }
    
    console.log('Success! Record inserted.');
    
    // Retrieve latest record
    console.log('\n3. Retrieving latest record...');
    const { data: latestData, error: latestError } = await supabase
      .from('air_quality')
      .select('*')
      .order('datetime', { ascending: false })
      .limit(1);
      
    if (latestError) {
      console.error('Error retrieving record:', latestError);
      return;
    }
    
    console.log('Latest record:');
    console.log(JSON.stringify(latestData[0], null, 2));
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

runTest(); 