#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔥 Checking Supabase connection and data...\n');

async function checkSupabase() {
  // Create both anon and service role clients
  const anonClient = createClient(supabaseUrl, supabaseKey);
  const serviceClient = createClient(supabaseUrl, serviceKey);

  try {
    console.log('1. Testing basic connection...');
    const { data: connectionTest, error: connectionError } = await anonClient
      .from('air_quality')
      .select('count')
      .single();
    
    if (connectionError) {
      console.log('❌ Connection error:', connectionError.message);
    } else {
      console.log('✅ Basic connection working');
    }

    console.log('\n2. Checking available tables...');
    
    // Check air_quality table
    const { data: airData, error: airError } = await anonClient
      .from('air_quality')
      .select('*')
      .limit(3);
    
    if (airError) {
      console.log('❌ air_quality table error:', airError.message);
    } else {
      console.log(`✅ air_quality table: ${airData?.length || 0} sample records`);
      if (airData && airData.length > 0) {
        console.log('   Sample data:', JSON.stringify(airData[0], null, 2));
      }
    }

    // Check fire_data table  
    const { data: fireData, error: fireError } = await anonClient
      .from('fire_data')
      .select('*')
      .limit(3);
    
    if (fireError) {
      console.log('❌ fire_data table error:', fireError.message);
    } else {
      console.log(`✅ fire_data table: ${fireData?.length || 0} sample records`);
      if (fireData && fireData.length > 0) {
        console.log('   Sample data:', JSON.stringify(fireData[0], null, 2));
      }
    }

    // Check vector database tables
    console.log('\n3. Checking vector database tables...');
    
    const { data: knowledgeData, error: knowledgeError } = await anonClient
      .from('knowledge_base')
      .select('*')
      .limit(2);
    
    if (knowledgeError) {
      console.log('❌ knowledge_base table error:', knowledgeError.message);
    } else {
      console.log(`✅ knowledge_base table: ${knowledgeData?.length || 0} records`);
      if (knowledgeData && knowledgeData.length > 0) {
        console.log('   Sample entry:', knowledgeData[0].title);
      }
    }

    const { data: embeddingsData, error: embeddingsError } = await anonClient
      .from('embeddings')
      .select('id, content, metadata')
      .limit(2);
    
    if (embeddingsError) {
      console.log('❌ embeddings table error:', embeddingsError.message);
    } else {
      console.log(`✅ embeddings table: ${embeddingsData?.length || 0} records`);
    }

    // Test vector search function
    console.log('\n4. Testing vector search functions...');
    
    const { data: searchTest, error: searchError } = await anonClient
      .rpc('search_knowledge_base', {
        search_term: 'weather',
        limit_count: 2
      });
    
    if (searchError) {
      console.log('❌ search_knowledge_base function error:', searchError.message);
    } else {
      console.log(`✅ search_knowledge_base function: ${searchTest?.length || 0} results`);
    }

    console.log('\n🚀 Supabase check complete!\n');

  } catch (error) {
    console.error('❌ Supabase check failed:', error);
  }
}

checkSupabase();