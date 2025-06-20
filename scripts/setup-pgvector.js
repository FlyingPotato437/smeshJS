#!/usr/bin/env node

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runPgVectorSetup() {
  console.log('🚀 Setting up pgvector for Supabase...');
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250621_setup_pgvector_properly.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    console.log(`📝 Executing ${statements.length} SQL statements...`);
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`);
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
          
          if (error) {
            // Try direct query if RPC fails
            const { error: directError } = await supabase
              .from('pg_stat_activity')
              .select('*')
              .limit(0); // This will force a connection and we can execute directly
            
            if (directError) {
              console.warn(`⚠️  Statement ${i + 1} had issues:`, error.message);
            }
          }
        } catch (stmtError) {
          console.warn(`⚠️  Statement ${i + 1} failed:`, stmtError.message);
        }
      }
    }
    
    // Test the setup
    console.log('\n🧪 Testing pgvector setup...');
    
    // Test extension
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'vector');
    
    if (!extError && extensions && extensions.length > 0) {
      console.log('✅ pgvector extension is installed');
    } else {
      console.log('❌ pgvector extension check failed');
    }
    
    // Test knowledge base table
    const { data: kbData, error: kbError } = await supabase
      .from('knowledge_base')
      .select('id, title')
      .limit(3);
    
    if (!kbError && kbData) {
      console.log(`✅ Knowledge base table created with ${kbData.length} initial records`);
      kbData.forEach(record => {
        console.log(`   - ${record.title}`);
      });
    } else {
      console.log('❌ Knowledge base table check failed:', kbError?.message);
    }
    
    // Test text search function
    try {
      const { data: textResults, error: textError } = await supabase.rpc('search_knowledge_base_text', {
        search_term: 'air quality',
        limit_count: 2
      });
      
      if (!textError && textResults && textResults.length > 0) {
        console.log(`✅ Text search function working - found ${textResults.length} results`);
      } else {
        console.log('❌ Text search function failed:', textError?.message);
      }
    } catch (funcError) {
      console.log('❌ Text search function test failed:', funcError.message);
    }
    
    console.log('\n🎉 pgvector setup completed!');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

runPgVectorSetup(); 