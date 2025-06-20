require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSupabaseData() {
  console.log('🔍 Testing Supabase Data Structure...\n');

  try {
    // 1. Check air_quality table structure
    console.log('1. Checking air_quality table structure...');
    const { data: sampleData, error: sampleError } = await supabase
      .from('air_quality')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Error accessing air_quality:', sampleError.message);
      return;
    }

    if (sampleData && sampleData.length > 0) {
      console.log('✅ air_quality table accessible');
      console.log('   Columns:', Object.keys(sampleData[0]).join(', '));
      console.log('   Sample PM2.5:', sampleData[0].pm25standard);
      console.log('   Sample sensor:', sampleData[0].from_node);
    }

    // 2. Get distinct sensors
    console.log('\n2. Checking available sensors...');
    const { data: sensorData, error: sensorError } = await supabase
      .from('air_quality')
      .select('from_node')
      .not('from_node', 'is', null);
    
    if (!sensorError && sensorData) {
      const uniqueSensors = [...new Set(sensorData.map(d => d.from_node))];
      console.log(`✅ Found ${uniqueSensors.length} unique sensors:`);
      uniqueSensors.slice(0, 5).forEach(sensor => {
        console.log(`   - ${sensor}`);
      });
      if (uniqueSensors.length > 5) {
        console.log(`   ... and ${uniqueSensors.length - 5} more`);
      }
    }

    // 3. Check data with sensor filtering
    console.log('\n3. Testing sensor-based queries...');
    const testSensor = sensorData?.[0]?.from_node;
    if (testSensor) {
      const { data: sensorSpecific, error: sensorSpecificError } = await supabase
        .from('air_quality')
        .select('datetime, pm25standard, pm10standard, temperature, relativehumidity, latitude, longitude')
        .eq('from_node', testSensor)
        .order('datetime', { ascending: false })
        .limit(5);
      
      if (!sensorSpecificError && sensorSpecific) {
        console.log(`✅ Successfully queried data for sensor ${testSensor}:`);
        console.log(`   Records found: ${sensorSpecific.length}`);
        if (sensorSpecific.length > 0) {
          console.log(`   Latest reading: ${sensorSpecific[0].datetime}`);
          console.log(`   PM2.5: ${sensorSpecific[0].pm25standard} μg/m³`);
        }
      }
    }

    // 4. Check location data
    console.log('\n4. Checking location data...');
    const { data: locationData, error: locationError } = await supabase
      .from('air_quality')
      .select('latitude, longitude, from_node')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
      .limit(10);
    
    if (!locationError && locationData) {
      console.log(`✅ Found ${locationData.length} records with location data`);
      const uniqueLocations = new Set(locationData.map(d => `${d.latitude},${d.longitude}`));
      console.log(`   Unique locations: ${uniqueLocations.size}`);
    }

    // 5. Test date range queries
    console.log('\n5. Testing date range queries...');
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    const { data: dateRangeData, error: dateRangeError } = await supabase
      .from('air_quality')
      .select('datetime')
      .gte('datetime', startDate.toISOString())
      .lte('datetime', endDate.toISOString())
      .order('datetime', { ascending: false })
      .limit(5);
    
    if (!dateRangeError && dateRangeData) {
      console.log(`✅ Date range query successful (last 7 days):`);
      console.log(`   Records found: ${dateRangeData.length}`);
    }

    // 6. Check if vector tables exist
    console.log('\n6. Checking vector database tables...');
    const tables = ['embeddings', 'knowledge_base'];
    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').single();
      if (error) {
        console.log(`❌ Table '${table}' not found - needs creation`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    }

    console.log('\n✨ Supabase data structure test complete!\n');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testSupabaseData(); 