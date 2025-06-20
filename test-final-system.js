require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fetch = require('node-fetch');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testSystem() {
  console.log('🔥 FINAL SYSTEM TEST - Prescribed Fire GPT\n');
  
  const results = {
    supabase: false,
    geminiWorkflow: false,
    dataExplorer: false,
    vectorTables: false
  };
  
  // 1. Test Supabase Connection
  console.log('1️⃣ Testing Supabase Connection...');
  try {
    const { data, error } = await supabase
      .from('air_quality')
      .select('*')
      .limit(5);
    
    if (data && data.length > 0) {
      console.log(`✅ Supabase: Connected (${data.length} records found)`);
      console.log(`   Sample columns: ${Object.keys(data[0]).slice(0, 8).join(', ')}`);
      console.log(`   PM2.5 field: pm25standard = ${data[0].pm25standard}`);
      results.supabase = true;
    } else {
      console.log('❌ Supabase: No data found');
    }
  } catch (e) {
    console.log('❌ Supabase: Connection failed -', e.message);
  }
  
  // 2. Test Gemini AI Workflow
  console.log('\n2️⃣ Testing Gemini AI Workflow...');
  try {
    const response = await fetch('http://localhost:3000/api/ai/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: "Analyze current fire conditions",
        context: "System test"
      })
    });
    
    const data = await response.json();
    
    if (data.workflow_complete && data.data_points > 0) {
      console.log('✅ Gemini Workflow: Complete');
      console.log(`   Data points: ${data.data_points}`);
      console.log(`   Models: ${Object.values(data.models_used).join(' → ')}`);
      console.log(`   Data source: ${data.data_source}`);
      results.geminiWorkflow = true;
    } else {
      console.log('❌ Gemini Workflow: Incomplete');
    }
  } catch (e) {
    console.log('❌ Gemini Workflow: Failed -', e.message);
  }
  
  // 3. Test Data Explorer Direct Connection
  console.log('\n3️⃣ Testing Data Explorer (Direct Supabase)...');
  try {
    // Simulate what data-explorer does
    const { data, error } = await supabase
      .from('air_quality')
      .select('*')
      .order('datetime', { ascending: false })
      .limit(100);
    
    if (data && data.length > 0) {
      console.log('✅ Data Explorer: Would show real Supabase data');
      console.log(`   Records available: ${data.length}`);
      console.log(`   Latest reading: ${data[0].datetime}`);
      console.log(`   Sensors: ${[...new Set(data.map(d => d.from_node).filter(Boolean))].slice(0, 3).join(', ')}`);
      results.dataExplorer = true;
    }
  } catch (e) {
    console.log('❌ Data Explorer: Failed -', e.message);
  }
  
  // 4. Check Vector Tables
  console.log('\n4️⃣ Checking Vector Database...');
  try {
    const { error: embError } = await supabase.from('embeddings').select('count').single();
    const { error: kbError } = await supabase.from('knowledge_base').select('count').single();
    
    if (embError && kbError) {
      console.log('⚠️  Vector tables not created yet');
      console.log('   Run SQL from scripts/create-vector-tables.sql in Supabase dashboard');
    } else {
      console.log('✅ Vector tables exist');
      results.vectorTables = true;
    }
  } catch (e) {
    console.log('⚠️  Vector tables check failed');
  }
  
  // Summary
  console.log('\n📊 SYSTEM STATUS SUMMARY');
  console.log('========================');
  console.log(`Supabase Connection: ${results.supabase ? '✅ Working' : '❌ Failed'}`);
  console.log(`AI Workflow (OpenAI→SQL→Gemini): ${results.geminiWorkflow ? '✅ Working' : '❌ Failed'}`);
  console.log(`Data Explorer (Real Data): ${results.dataExplorer ? '✅ Ready' : '❌ Failed'}`);
  console.log(`Vector Database: ${results.vectorTables ? '✅ Ready' : '⚠️  Needs Setup'}`);
  
  const allWorking = Object.values(results).filter(r => r).length;
  console.log(`\nOverall: ${allWorking}/4 components working`);
  
  if (allWorking === 4) {
    console.log('\n🎉 All systems operational! The app is fully functional.');
  } else if (allWorking >= 3) {
    console.log('\n✅ Core functionality is working. Vector DB is optional.');
  } else {
    console.log('\n⚠️  Some components need attention.');
  }
  
  console.log('\n✨ Test complete!\n');
}

testSystem().catch(console.error); 