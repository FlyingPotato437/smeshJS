#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function purgeAllData() {
  console.log('🧹 PURGING ALL DATA FROM SUPABASE...\n');
  
  const tablesToPurge = [
    'air_quality',
    'sensor_readings', 
    'devices',
    'fire_data',
    'air_quality_embeddings'
  ];
  
  try {
    for (const table of tablesToPurge) {
      console.log(`🗑️  Purging ${table}...`);
      
      // First check if table exists and get count
      const { count, error: countError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        console.log(`   ⚠️  Table ${table} doesn't exist or can't be accessed`);
        continue;
      }
      
      console.log(`   📊 Found ${count || 0} records`);
      
      if (count > 0) {
        // Delete all records
        const { error: deleteError } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything
        
        if (deleteError) {
          console.log(`   ❌ Failed to purge ${table}:`, deleteError.message);
        } else {
          console.log(`   ✅ Successfully purged ${count} records from ${table}`);
        }
      } else {
        console.log(`   ✅ ${table} is already empty`);
      }
    }
    
    // Keep knowledge_base for the LLM
    console.log(`\n📚 Keeping knowledge_base table for LLM knowledge`);
    
    console.log('\n🎉 Data purge completed!');
    console.log('💡 Now users can upload their own data files for analysis');
    
  } catch (error) {
    console.error('❌ Purge failed:', error);
    process.exit(1);
  }
}

purgeAllData(); 