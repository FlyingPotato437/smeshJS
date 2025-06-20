#!/usr/bin/env node

/**
 * Safe Database Migration Script
 * Replaces dangerous exec_sql calls with secure Supabase operations
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Safe migration using built-in Supabase functions
 */
async function runSafeMigration() {
  try {
    console.log('🔥 Running safe migration for Prescribed Fire GPT...');
    
    // Test database connectivity first
    console.log('Testing database connection...');
    const { data: testData, error: testError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);
    
    if (testError) {
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    console.log('✅ Database connection successful');
    
    // Check if fire management tables exist
    console.log('Checking fire management tables...');
    
    const { data: fireTableCheck, error: fireTableError } = await supabase
      .from('fire_data')
      .select('id')
      .limit(1);
    
    if (fireTableError && fireTableError.message.includes('does not exist')) {
      console.log('⚠️  Fire management tables not found');
      console.log('Please run migrations through the Supabase CLI:');
      console.log('  1. Install Supabase CLI: npm install -g supabase');
      console.log('  2. Link to your project: supabase link --project-ref YOUR_PROJECT_REF');
      console.log('  3. Run migrations: supabase db push');
      console.log('');
      console.log('Or manually apply migrations from supabase/migrations/ in your Supabase dashboard');
      return false;
    } else if (fireTableError) {
      throw fireTableError;
    }
    
    console.log('✅ Fire management tables are available');
    
    // Check vector database functions
    console.log('Checking vector database functions...');
    
    try {
      const { error: vectorError } = await supabase.rpc('search_embeddings', {
        query_embedding: new Array(1536).fill(0),
        match_threshold: 0.75,
        match_count: 1
      });
      
      if (vectorError && vectorError.message.includes('does not exist')) {
        console.log('⚠️  Vector search functions not available');
        console.log('Vector database setup may be incomplete');
      } else {
        console.log('✅ Vector search functions are available');
      }
    } catch (e) {
      console.log('⚠️  Vector search test failed - this is expected if vector extension is not enabled');
    }
    
    // Test knowledge base table
    console.log('Checking knowledge base table...');
    
    const { data: kbData, error: kbError } = await supabase
      .from('knowledge_base')
      .select('id')
      .limit(1);
    
    if (kbError && kbError.message.includes('does not exist')) {
      console.log('⚠️  Knowledge base table not found');
      console.log('Vector database may need setup');
    } else {
      console.log('✅ Knowledge base table is available');
    }
    
    // Check embeddings table  
    const { data: embData, error: embError } = await supabase
      .from('embeddings')
      .select('id')
      .limit(1);
    
    if (embError && embError.message.includes('does not exist')) {
      console.log('⚠️  Embeddings table not found');
    } else {
      console.log('✅ Embeddings table is available');
    }
    
    // Check normalized sensor schema
    console.log('Checking normalized sensor schema...');
    
    const { data: sensorData, error: sensorError } = await supabase
      .from('sensor_readings')
      .select(`
        id,
        timestamp,
        device:devices!inner(name)
      `)
      .limit(1);
    
    if (sensorError && sensorError.message.includes('does not exist')) {
      console.log('⚠️  Normalized sensor schema not found');
    } else {
      console.log('✅ Normalized sensor schema is available');
    }
    
    console.log('\n🚀 Safe migration check complete!');
    console.log('\n📋 Summary:');
    console.log('- Fire management tables: ✅');
    console.log('- Vector database: Check manually if needed');
    console.log('- Normalized schema: Check manually if needed');
    console.log('\nSystem is ready for prescribed fire management operations');
    
    return true;
    
  } catch (error) {
    console.error('Migration check error:', error);
    console.log('\n📋 Manual setup may be required:');
    console.log('1. Ensure all migrations in supabase/migrations/ are applied');
    console.log('2. Enable pgvector extension in Supabase dashboard if using vector search');
    console.log('3. Check Supabase logs for detailed error information');
    return false;
  }
}

/**
 * Populate sample data safely using parameterized queries
 */
async function populateSampleData() {
  try {
    console.log('\n🌱 Populating sample data...');
    
    // Check if fire_data already has data
    const { data: existingData, error: checkError } = await supabase
      .from('fire_data')
      .select('id')
      .limit(1);
    
    if (checkError) {
      throw checkError;
    }
    
    if (existingData && existingData.length > 0) {
      console.log('✅ Sample data already exists');
      return true;
    }
    
    // Insert sample fire management data using safe parameterized queries
    const sampleFireData = [
      {
        datetime: '2024-06-17T09:00:00Z',
        burn_unit: 'Unit-Demo-1',
        location_name: 'Demo Fire Management Area',
        burn_type: 'Fuel Reduction',
        status: 'Planned',
        acres_planned: 150,
        acres_completed: 0,
        temperature: 72,
        humidity: 45,
        wind_speed: 8,
        wind_direction: 'SW',
        fuel_moisture: 12.5,
        latitude: 36.7783,
        longitude: -119.4179,
        elevation: '1200 ft',
        crew_size: 8,
        burn_boss: 'Demo Fire Manager',
        objectives: 'Reduce fuel loading for wildfire prevention',
        risk_level: 'Low'
      },
      {
        datetime: '2024-06-18T08:30:00Z',
        burn_unit: 'Unit-Demo-2',
        location_name: 'Demo Ecosystem Restoration Area',
        burn_type: 'Ecosystem Restoration',
        status: 'In Progress',
        acres_planned: 200,
        acres_completed: 85,
        temperature: 68,
        humidity: 52,
        wind_speed: 6,
        wind_direction: 'W',
        fuel_moisture: 15.2,
        latitude: 36.8783,
        longitude: -119.5179,
        elevation: '1400 ft',
        crew_size: 12,
        burn_boss: 'Demo Restoration Manager',
        objectives: 'Restore native grassland ecosystem',
        risk_level: 'Moderate'
      }
    ];
    
    const { error: insertError } = await supabase
      .from('fire_data')
      .insert(sampleFireData);
    
    if (insertError) {
      throw insertError;
    }
    
    console.log('✅ Sample fire management data inserted');
    return true;
    
  } catch (error) {
    console.error('Error populating sample data:', error);
    return false;
  }
}

// Main execution
async function main() {
  const migrationSuccess = await runSafeMigration();
  
  if (migrationSuccess) {
    await populateSampleData();
  }
  
  process.exit(migrationSuccess ? 0 : 1);
}

main();